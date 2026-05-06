import { createClient } from '@/lib/supabase/server';
import { logMoneyEvent } from '@/lib/money-events';
import { NextResponse } from 'next/server';

function isInsufficientFundsError(message: string | undefined) {
    return typeof message === 'string' && message.includes('INSUFFICIENT_FUNDS');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

type RpcResult<T> = { data: T | null; error: { message?: string } | null };

/**
 * POST /api/donate-pool
 * 
 * Transfers money from the user's personal wallet balance into a
 * Donation Pool. Supports:
 *   - Global Pool:  { amount: 5 }
 *   - Feeder Pool:  { amount: 5, feederId: 3 }
 */
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body)) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const donationAmount = Number(body.amount);
    const feederId = body.feederId;

    if (!Number.isFinite(donationAmount) || donationAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { error: upsertError } = await supabase
        .from('users')
        .upsert(
            {
                auth_id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || 'User'
            },
            { onConflict: 'auth_id', ignoreDuplicates: true }
        );

    if (upsertError) {
        console.error('Error ensuring user profile before pool donation:', upsertError);
        return NextResponse.json({ error: 'Failed to access user profile' }, { status: 500 });
    }

    const normalizedFeederId = feederId ? Number.parseInt(String(feederId), 10) : null;
    const { data: donationResult, error: donationError } = (await supabase.rpc('donate_to_pool_atomic', {
        p_user_auth_id: user.id,
        p_amount: donationAmount,
        p_feeder_id: normalizedFeederId,
    })) as unknown as RpcResult<{ new_balance?: number | null }>;

    if (donationError) {
        if (isInsufficientFundsError(donationError.message)) {
            return NextResponse.json({ error: 'Insufficient funds' }, { status: 402 });
        }

        console.error('Atomic pool donation failed:', donationError);
        return NextResponse.json({ error: donationError.message || 'Failed to credit pool' }, { status: 500 });
    }

    const { data: poolRow } = normalizedFeederId === null
        ? await supabase
            .from('donation_pools')
            .select('id')
            .is('feeder_id', null)
            .maybeSingle()
        : await supabase
            .from('donation_pools')
            .select('id')
            .eq('feeder_id', normalizedFeederId)
            .maybeSingle();

    const { data: donationRow } = await supabase
        .from('donations')
        .select('id')
        .eq('user_auth_id', user.id)
        .eq('type', 'pool')
        .eq('amount_eur', donationAmount)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    await logMoneyEvent({
        event_type: 'pool_donation',
        reason: normalizedFeederId === null ? 'global_pool_donation' : 'feeder_pool_donation',
        reason_en: normalizedFeederId === null ? 'Global pool donation' : 'Feeder pool donation',
        amount_eur: donationAmount,
        actor_auth_id: user.id,
        user_auth_id: user.id,
        destination_pool_id: poolRow?.id ?? null,
        feeder_id: normalizedFeederId,
        donation_id: donationRow?.id ?? null,
        idempotency_key: donationRow?.id ? `pool_donation:${donationRow.id}` : null,
    });

    const target = feederId ? `Feeder #${feederId}'s pool` : 'Global Donation Pool';

    return NextResponse.json({
        success: true,
        newBalance: Number(donationResult?.new_balance ?? 0),
        message: `${donationAmount} EUR donated to ${target}!`
    });
}
