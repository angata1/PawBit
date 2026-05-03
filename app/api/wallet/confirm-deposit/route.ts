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
        const { data: depositResult, error: depositError } = await supabase.rpc('confirm_wallet_deposit_atomic', {
            p_user_auth_id: user.id,
            p_amount: amountToAdd,
            p_deposit_key: depositKey,
            p_email: user.email ?? null,
            p_name: user.user_metadata?.full_name || 'User',
        });

        if (depositError) {
            throw new Error(depositError.message);
        }

        return NextResponse.json({
            success: true,
            paymentKind: isPendingDonation ? 'pending_donation' : 'wallet_deposit',
            redirectPath: returnPath,
            amount: amountToAdd,
            mode: donationMode,
            feederId,
            newBalance: Number(depositResult?.new_balance ?? 0)
        });

    } catch (error: unknown) {
        console.error('Error confirming deposit:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
