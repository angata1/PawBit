import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    const formatted = (pools || []).map((p: any) => ({
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

    const { action, amount, reason } = await request.json();

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

        if (!data?.success) {
            return NextResponse.json({ error: data?.error || 'Deduction failed' }, { status: 400 });
        }

        return NextResponse.json(data);
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
