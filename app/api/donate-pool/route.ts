import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 1. Get current user balance
    // Ensure user exists using Upsert (Idempotent)
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

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('auth_id', user.id)
        .single();

    if (userError || !userData) {
        return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    const currentBalance = userData.balance || 0;

    if (currentBalance < amount) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 402 });
    }

    // 2. Deduct from user balance
    const { error: updateError } = await supabase
        .from('users')
        .update({ balance: currentBalance - amount })
        .eq('auth_id', user.id);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // 3. Add to Donation Pool (global or feeder-specific)
    const rpcParams: any = { p_amount: amount };
    if (feederId) {
        rpcParams.p_feeder_id = parseInt(feederId);
    }

    const { error: poolError } = await supabase.rpc('add_to_donation_pool', rpcParams);

    if (poolError) {
        console.error('Pool credit error:', poolError);
        // Attempt rollback of balance
        await supabase
            .from('users')
            .update({ balance: currentBalance })
            .eq('auth_id', user.id);
        return NextResponse.json({ error: poolError.message || 'Failed to credit pool' }, { status: 500 });
    }

    // 4. Record the donation for history & attribution
    await supabase.from('donations').insert({
        user_auth_id: user.id,
        amount_eur: amount,
        type: 'pool'
    });

    const target = feederId ? `Feeder #${feederId}'s pool` : 'Global Donation Pool';

    return NextResponse.json({
        success: true,
        newBalance: currentBalance - amount,
        message: `${amount}€ donated to ${target}!`
    });
}
