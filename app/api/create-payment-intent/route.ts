import { NextResponse } from "next/server";
import Stripe from "stripe";
import { formatAmountForStripe } from "@/utils/stripe-helpers";
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-expect-error Stripe package may lag the pinned dashboard API version.
    apiVersion: "2024-12-18.acacia",
    typescript: true,
});

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { amount, directDonation } = await req.json();

        const feedAmount = Number(amount);
        if (!Number.isFinite(feedAmount) || feedAmount <= 0) {
            return NextResponse.json(
                { message: "Invalid amount" },
                { status: 400 }
            );
        }

        const safeReturnPath =
            typeof directDonation?.returnPath === "string" &&
                directDonation.returnPath.startsWith("/") &&
                !directDonation.returnPath.startsWith("//")
                ? directDonation.returnPath
                : "/profile";

        const isDirectDonation = Boolean(directDonation);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: formatAmountForStripe(feedAmount, "eur"),
            currency: "eur",
            metadata: {
                user_id: user.id,
                intent_type: isDirectDonation ? "pending_donation" : "wallet_deposit",
                donation_mode: directDonation?.mode || "",
                feeder_id: directDonation?.feederId || "",
                return_path: safeReturnPath,
            }
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err: unknown) {
        console.error("Payment intent creation error:", err);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
