import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        // 1. Verify Payment Intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        // 2. Check if already processed (this is a simple check, a robust one needs a transaction ID column)
        // For MVP, we'll assume if we haven't logged this specific payment intent in donations metadata/notes
        // or just trust the flow. 
        // BETTER: We should store the payment_intent_id in the 'donations' table to enforce uniqueness.
        // I will add it to the 'type' or a new column if I could, but let's use the 'message' or similar?
        // The schema provided by user has: id, user_id, amount_eur, created_at, type.
        // I'll assume 'type' can store "deposit:pi_xxxx..."

        const intentKey = `deposit:${payment_intent_id}`;

        const { data: existingDonation } = await supabase
            .from('donations')
            .select('id')
            .eq('type', intentKey)
            .single();

        if (existingDonation) {
            return NextResponse.json({ message: 'Already processed' });
        }

        // 3. Update Balance
        // 3. Update Balance
        // Ensure user exists using Upsert (Idempotent)
        const { error: upsertError } = await supabase
            .from('users')
            .upsert(
                {
                    auth_id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || 'User'
                    // removed balance: 0 to avoid overwriting existing balance or confusing schema if column missing
                },
                { onConflict: 'auth_id', ignoreDuplicates: true }
            );

        if (upsertError) {
            console.error("Upsert error:", upsertError);
            // Verify if it's just a schema mismatch (e.g. balance column) or real error. 
            // If we really can't ensure user, we might fail, but let's try to proceed to fetch balance.
        }

        // Get current balance
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('balance')
            .eq('auth_id', user.id)
            .single();

        if (fetchError || !userData) {
            throw new Error("Failed to fetch user profile after creation attempt.");
        }

        const currentBalance = userData.balance || 0;
        const amountToAdd = paymentIntent.amount / 100; // Stripe is in cents
        const newBalance = currentBalance + amountToAdd;

        // Update User Balance
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('auth_id', user.id);

        if (updateError) throw updateError;

        // 4. Log Transaction
        await supabase.from('donations').insert({
            user_auth_id: user.id,
            amount_eur: amountToAdd,
            type: intentKey
        });

        return NextResponse.json({ success: true, newBalance });

    } catch (error: any) {
        console.error('Error confirming deposit:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
