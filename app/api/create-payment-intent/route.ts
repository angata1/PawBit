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

        const feedAmount = Number(amount);
        if (!Number.isFinite(feedAmount) || feedAmount <= 0) {
            return NextResponse.json(
                { message: "Invalid amount" },
                { status: 400 }
            );
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: formatAmountForStripe(feedAmount, "eur"),
            currency: "eur",
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err: any) {
        console.error("Payment intent creation error:", err);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
