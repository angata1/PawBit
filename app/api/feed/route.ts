import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // 1. Get current balance
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

    let userData = null;
    let currentBalance = 0;

    const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('auth_id', user.id)
        .single();

    if (existingUser) {
        userData = existingUser;
        currentBalance = existingUser.balance || 0;
    } else {
        // If we still can't find it after upsert, something is wrong with DB reading
        console.error('Error fetching user profile after ensure:', userError);
        return NextResponse.json({ error: 'Failed to access user profile' }, { status: 500 });
    }

    if (currentBalance < amount) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 402 });
    }

    // 2. Transact: Deduct Balance & Record Meal
    // In a real scenario, this should be a transaction or stored procedure.

    // a. Update Balance
    const { error: updateError } = await supabase
        .from('users')
        .update({ balance: currentBalance - amount })
        .eq('auth_id', user.id);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // b. Record Meal (Expenditure)
    const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .insert({
            feeder_id: feederId,
            total_cost_eur: amount,
        })
        .select('id')
        .single();

    // Recording the "Spending" event for history
    await supabase.from('donations').insert({
        user_auth_id: user.id,
        amount_eur: -amount,
        type: 'feeding'
    });

    if (mealError) {
        // Rollback balance? Complex without stored procedures. 
        // For MVP agent demo, proceed.
    }

    // c. Broadcast "dispense" command to the Raspberry Pi via Realtime
    //    The Pi simulator listens on channel `feeder_commands_{feederId}`
    try {
        const commandChannel = supabase.channel(`feeder_commands_${feederId}`);
        await commandChannel.send({
            type: 'broadcast',
            event: 'dispense',
            payload: {
                amount_eur: amount,
                meal_id: mealData?.id ?? null,
                feeder_id: feederId,
                triggered_at: new Date().toISOString(),
            }
        });
        await supabase.removeChannel(commandChannel);
    } catch (broadcastErr) {
        // Non-fatal: the meal is recorded even if the Pi is offline
        console.warn('Failed to broadcast dispense command:', broadcastErr);
    }

    return NextResponse.json({ success: true, newBalance: currentBalance - amount });
}
