import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function isInsufficientFundsError(message: string | undefined) {
    return typeof message === 'string' && message.includes('INSUFFICIENT_FUNDS');
}

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

    const { amount, feederId } = await request.json();
    const donationAmount = Number(amount);

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
    const { data: donationResult, error: donationError } = await (supabase.rpc('donate_to_pool_atomic', {
        p_user_auth_id: user.id,
        p_amount: donationAmount,
        p_feeder_id: normalizedFeederId,
    }) as any);

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
