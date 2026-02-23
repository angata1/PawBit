import { NextResponse } from "next/server";
import Stripe from "stripe";
import { formatAmountForStripe } from "@/utils/stripe-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-ignore
    apiVersion: "2024-12-18.acacia",
    typescript: true,
});

export async function POST(req: Request) {
    try {
        const { amount } = await req.json();

        if (!amount) {
            return NextResponse.json(
                { message: "Invalid amount" },
                { status: 400 }
            );
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: formatAmountForStripe(amount, "usd"),
            currency: "usd",
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err: any) {
        return NextResponse.json(
            { message: err.message },
            { status: 500 }
        );
    }
}
