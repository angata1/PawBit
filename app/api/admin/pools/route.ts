import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type DonationPoolRow = {
    id: number;
    feeder_id: number | null;
    balance_amount: number;
    last_updated: string;
    feeders?: { name?: string | null } | null;
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

    return NextResponse.json({ pools: formatted });
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

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (action === 'deduct') {
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

        return NextResponse.json(dataUnknown);
    }

    if (action === 'add') {
        const { error } = await supabase.rpc('add_to_donation_pool', { p_amount: amount });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: `Added ${amount}€ to Global Pool` });
    }

    return NextResponse.json({ error: 'Invalid action. Use "deduct" or "add".' }, { status: 400 });
}
