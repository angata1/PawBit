import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-expect-error Stripe package may lag the pinned dashboard API version.
    apiVersion: '2024-12-18.acacia',
    typescript: true,
});

function sanitizeReturnPath(path: unknown) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
        return '/profile';
    }
    return path;
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_intent_id } = await request.json();

    if (!payment_intent_id) {
        return NextResponse.json({ error: 'Missing payment_intent_id' }, { status: 400 });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        if (paymentIntent.metadata?.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: Payment intent ownership mismatch' }, { status: 403 });
        }

        const amountToAdd = paymentIntent.amount / 100;
        const returnPath = sanitizeReturnPath(paymentIntent.metadata?.return_path);
        const donationMode = paymentIntent.metadata?.donation_mode || null;
        const feederId = paymentIntent.metadata?.feeder_id || null;
        const isPendingDonation = paymentIntent.metadata?.intent_type === 'pending_donation';
        const depositKey = `deposit:${payment_intent_id}`;
        await supabase
            .from('users')
            .upsert(
                {
                    auth_id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || 'User'
                },
                { onConflict: 'auth_id', ignoreDuplicates: true }
            );

        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('balance')
            .eq('auth_id', user.id)
            .single();

        if (fetchError || !existingUser) {
            throw new Error('Failed to fetch user balance.');
        }

        const currentBalance = existingUser.balance || 0;

        const { data: existingDeposit } = await supabase
            .from('donations')
            .select('id')
            .eq('type', depositKey)
            .maybeSingle();

        let creditedBalance = currentBalance;

        if (!existingDeposit) {
            creditedBalance = currentBalance + amountToAdd;

            const { error: updateError } = await supabase
                .from('users')
                .update({ balance: creditedBalance })
                .eq('auth_id', user.id);

            if (updateError) throw updateError;

            await supabase.from('donations').insert({
                user_auth_id: user.id,
                amount_eur: amountToAdd,
                type: depositKey
            });
        }

        return NextResponse.json({
            success: true,
            paymentKind: isPendingDonation ? 'pending_donation' : 'wallet_deposit',
            redirectPath: returnPath,
            amount: amountToAdd,
            mode: donationMode,
            feederId,
            newBalance: creditedBalance
        });

    } catch (error: unknown) {
        console.error('Error confirming deposit:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
