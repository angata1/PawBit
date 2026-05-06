import { createClient } from '@/lib/supabase/server';
import { logMoneyEvent } from '@/lib/money-events';
import { NextResponse } from 'next/server';

type DonationPoolRow = {
    id: number;
    feeder_id: number | null;
    balance_amount: number;
    last_updated: string;
    feeders?: { name?: string | null } | null;
};

type MoneyEventRow = {
    id: number;
    created_at: string;
    event_type: string;
    reason: string;
    reason_en: string | null;
    amount_eur: number;
    actor_auth_id: string | null;
    user_auth_id: string | null;
    source_pool_id: number | null;
    destination_pool_id: number | null;
    feeder_id: number | null;
    meal_id: number | null;
    donation_id: number | null;
};

type PoolOperationEntry = {
    poolId: number;
    amount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function getPoolEntries(value: unknown): PoolOperationEntry[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((entry): PoolOperationEntry | null => {
            if (!isRecord(entry)) return null;
            const poolId = getNumber(entry.poolId);
            const amount = getNumber(entry.amount);
            if (!poolId || !amount || amount <= 0) return null;
            return { poolId, amount };
        })
        .filter((entry): entry is PoolOperationEntry => entry !== null);
}

/**
 * GET /api/admin/pools — Fetch all donation pool balances
 * POST /api/admin/pools — Admin deduct from global pool (for maintenance, repairs, etc.)
 */

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin role
    const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch all pools with feeder names
    const { data: pools, error } = await supabase
        .from('donation_pools')
        .select('id, feeder_id, balance_amount, last_updated, feeders(name)')
        .order('feeder_id', { ascending: true, nullsFirst: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const poolsUnknown: unknown = pools;
    const poolsTyped: DonationPoolRow[] = Array.isArray(poolsUnknown) ? (poolsUnknown as DonationPoolRow[]) : [];
    const formatted = poolsTyped.map((p) => ({
        id: p.id,
        feeder_id: p.feeder_id,
        feeder_name: p.feeder_id === null ? 'Global Pool' : (p.feeders?.name || `Feeder #${p.feeder_id}`),
        balance: p.balance_amount,
        last_updated: p.last_updated,
    }));

    const { data: events } = await supabase
        .from('money_events')
        .select('id, created_at, event_type, reason, reason_en, amount_eur, actor_auth_id, user_auth_id, source_pool_id, destination_pool_id, feeder_id, meal_id, donation_id')
        .order('created_at', { ascending: false })
        .limit(25);

    const eventsUnknown: unknown = events;
    const recentEvents: MoneyEventRow[] = Array.isArray(eventsUnknown) ? (eventsUnknown as MoneyEventRow[]) : [];

    return NextResponse.json({ pools: formatted, recentEvents });
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin role
    const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body: unknown = await request.json();
    if (!isRecord(body)) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const action = body.action;
    const amount = getNumber(body.amount);
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    const reasonEn = typeof body.reasonEn === 'string' ? body.reasonEn : reason;
    const sourcePoolId = getNumber(body.sourcePoolId);
    const destinationPoolId = getNumber(body.destinationPoolId);
    const entries = getPoolEntries(body.entries);

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { data: operationResult, error: operationError } = await supabase.rpc('admin_pool_operation_atomic', {
        p_actor_auth_id: user.id,
        p_action: action,
        p_amount: amount,
        p_reason: reason || 'admin_adjustment',
        p_reason_en: reasonEn || reason || 'Admin adjustment',
        p_source_pool_id: sourcePoolId,
        p_destination_pool_id: destinationPoolId,
        p_entries: entries.length > 0 ? entries.map((entry) => ({
            pool_id: entry.poolId,
            amount: entry.amount,
        })) : null,
    });

    if (!operationError) {
        return NextResponse.json(operationResult);
    }

    if (action !== 'add' && action !== 'deduct') {
        return NextResponse.json({ error: operationError.message }, { status: 500 });
    }

    if (action === 'deduct') {
        const { data: globalPool } = await supabase
            .from('donation_pools')
            .select('id')
            .is('feeder_id', null)
            .maybeSingle();

        const { data, error } = await supabase.rpc('admin_deduct_pool', {
            p_amount: amount,
            p_reason: reason || 'maintenance',
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const dataUnknown: unknown = data;
        if (!isRecord(dataUnknown) || dataUnknown.success !== true) {
            const errMsg = isRecord(dataUnknown) && typeof dataUnknown.error === 'string' ? dataUnknown.error : 'Deduction failed';
            return NextResponse.json({ error: errMsg }, { status: 400 });
        }

        await logMoneyEvent({
            event_type: 'admin_withdrawal',
            reason: reason || 'maintenance',
            reason_en: reason || 'Maintenance',
            amount_eur: amount,
            actor_auth_id: user.id,
            source_pool_id: globalPool?.id ?? null,
        });

        return NextResponse.json(dataUnknown);
    }

    if (action === 'add') {
        const { error } = await supabase.rpc('add_to_donation_pool', { p_amount: amount });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: globalPool } = await supabase
            .from('donation_pools')
            .select('id')
            .is('feeder_id', null)
            .maybeSingle();

        await logMoneyEvent({
            event_type: 'admin_add_funds',
            reason: reason || 'admin_added_funds',
            reason_en: reason || 'Admin-added funds',
            amount_eur: amount,
            actor_auth_id: user.id,
            destination_pool_id: globalPool?.id ?? null,
        });

        return NextResponse.json({ success: true, message: `Added ${amount}€ to Global Pool` });
    }

    return NextResponse.json({ error: 'Invalid action. Use "deduct" or "add".' }, { status: 400 });
}
