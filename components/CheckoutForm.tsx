"use client";

import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import Button from "@/app/components/Button";

type CheckoutFormProps = {
    amount: number;
    returnPath?: string;
};

export default function CheckoutForm({ amount, returnPath = "/profile" }: CheckoutFormProps) {
    const t = useTranslations("CheckoutForm");
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            // Make sure to disable form submission until Stripe.js has loaded.
            return;
        }

        setIsLoading(true);

        const successUrl = new URL("/payment-success", window.location.origin);
        if (returnPath.startsWith("/")) {
            successUrl.searchParams.set("return_path", returnPath);
        }

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: successUrl.toString(),
            },
        });

        // This point will only be reached if there is an immediate error when
        // confirming the payment. Otherwise, your customer will be redirected to
        // your `return_url`. For some payment methods like iDEAL, your customer will
        // be redirected to an intermediate site first to authorize the payment, then
        // redirected to the `return_url`.
        if (error.type === "card_error" || error.type === "validation_error") {
            setMessage(error.message ?? t("errorGeneric"));
        } else {
            setMessage(t("errorGeneric"));
        }

        setIsLoading(false);
    };

    const paymentElementOptions = {
        layout: "tabs",
    } as const;

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" options={paymentElementOptions} />
            <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full mt-4">
                <span id="button-text">
                    {isLoading ? <div className="spinner" id="spinner">{t("processing")}</div> : t("pay", { amount })}
                </span>
            </Button>
            {/* Show any error or success messages */}
            {message && <div id="payment-message" className="text-red-500 mt-2">{message}</div>}
        </form>
    );
}
