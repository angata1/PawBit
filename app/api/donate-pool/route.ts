import { createClient } from '@/lib/supabase/server';
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

    const target = feederId ? `Feeder #${feederId}'s pool` : 'Global Donation Pool';

    return NextResponse.json({
        success: true,
        newBalance: Number(donationResult?.new_balance ?? 0),
        message: `${donationAmount} EUR donated to ${target}!`
    });
}
