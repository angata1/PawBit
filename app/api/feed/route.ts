import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function isInsufficientFundsError(message: string | undefined) {
    return typeof message === 'string' && message.includes('INSUFFICIENT_FUNDS');
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, feederId } = await request.json();

    if (!feederId) {
        return NextResponse.json({ error: 'Missing feederId' }, { status: 400 });
    }

    const { data: feeder, error: feederError } = await supabase
        .from('feeders')
        .select('id, enabled, dispense_price_eur, pi_auth_key')
        .eq('id', feederId)
        .single();

    if (feederError || !feeder) {
        return NextResponse.json({ error: 'Feeder not found' }, { status: 404 });
    }

    if (!feeder.enabled) {
        return NextResponse.json({ error: 'Feeder is disabled' }, { status: 403 });
    }

    const minimumPrice = Number(feeder.dispense_price_eur || 2);
    const feedAmount = Number(amount || minimumPrice);

    if (!Number.isFinite(feedAmount) || feedAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (feedAmount < minimumPrice) {
        return NextResponse.json({
            error: `This feeder costs at least ${minimumPrice.toFixed(2)} EUR per feeding`,
            minimumPrice
        }, { status: 400 });
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
        console.error('Error ensuring user profile before feed:', upsertError);
        return NextResponse.json({ error: 'Failed to access user profile' }, { status: 500 });
    }

    const { data: feedResult, error: feedError } = await supabase.rpc('process_live_feed', {
        p_user_auth_id: user.id,
        p_feeder_id: Number(feederId),
        p_amount: feedAmount,
    });

    if (feedError) {
        if (isInsufficientFundsError(feedError.message)) {
            return NextResponse.json({ error: 'Insufficient funds' }, { status: 402 });
        }

        console.error('Atomic live feed failed:', feedError);
        return NextResponse.json({ error: 'Failed to process feeding' }, { status: 500 });
    }

    const mealId = feedResult?.meal_id ?? null;
    const newBalance = Number(feedResult?.new_balance ?? 0);

    // c. Broadcast "dispense" command to the Raspberry Pi via Realtime
    //    The Pi simulator listens on channel `feeder_commands_{feederId}`
    try {
        const commandChannel = supabase.channel(`feeder_commands_${feederId}`);
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Realtime channel subscribe timed out')), 5000);
            commandChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    const payloadObj = {
                        amount_eur: feedAmount,
                        meal_id: mealId,
                        feeder_id: feederId,
                        triggered_at: new Date().toISOString(),
                    };
                    
                    const rawPayload = JSON.stringify(payloadObj);
                    const signature = crypto
                        .createHmac('sha256', feeder.pi_auth_key || 'fallback')
                        .update(rawPayload)
                        .digest('hex');

                    await commandChannel.send({
                        type: 'broadcast',
                        event: 'dispense',
                        payload: {
                            raw: rawPayload,
                            signature
                        }
                    });
                    resolve();
                }
            });
        });
        await supabase.removeChannel(commandChannel);
    } catch (broadcastErr) {
        // Non-fatal: the meal is recorded even if the Pi is offline
        console.warn('Failed to broadcast dispense command:', broadcastErr);
    }

    return NextResponse.json({
        success: true,
        newBalance,
        amount: feedAmount,
        minimumPrice,
        mealId
    });
}
