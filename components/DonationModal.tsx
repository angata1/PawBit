"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import CheckoutForm from "./CheckoutForm";
import { X } from "lucide-react";
// If Dialog component doesn't exist, we'll build a simple custom one for now or use the existing Card component in a fixed overlay.

// Actually let's check if there is a Dialog or Modal component. 
// Based on package.json, there is @radix-ui/react-dialog, so maybe there is a ui/dialog. 
// I will assume for now I should build a self contained Modal to be safe or investigate.
// Let's build a custom one using fixed positioning to avoid dependency hell if components aren't setup.

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type DonationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    feederName?: string;
    initialAmount?: number;
    isDeposit?: boolean;
    directDonation?: {
        feederId?: string;
        mode: "live" | "feeder_pool" | "global_pool";
        returnPath: string;
    };
};

export default function DonationModal({ isOpen, onClose, feederName, initialAmount = 5, isDeposit = false, directDonation }: DonationModalProps) {
    const [clientSecret, setClientSecret] = useState("");
    const [amount, setAmount] = useState(initialAmount);
    const t = useTranslations("DonationModal");

    useEffect(() => {
        setAmount(initialAmount);
    }, [initialAmount, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setClientSecret("");
            fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, isDeposit, directDonation }),
            })
                .then((res) => res.json())
                .then((data) => setClientSecret(data.clientSecret));
        }
    }, [amount, isOpen, isDeposit, directDonation]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe',
    } as const;
    const options: StripeElementsOptions = {
        clientSecret,
        appearance,
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pt-safe pb-safe">
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-4">
                    {directDonation
                        ? t("donateTo", { name: feederName || t("animals") })
                        : isDeposit ? t("addFunds") : t("donateTo", { name: feederName || t("animals") })}
                </h2>

                <div className="mb-6 flex gap-2">
                    {[5, 10, 20, 50].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val)}
                            className={`px-4 py-2 rounded-full border transition-colors ${amount === val
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            €{val}
                        </button>
                    ))}
                    <div className="flex items-center">
                        <span className="mr-2 text-gray-600">€</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-20 px-2 py-1 border rounded"
                            min="1"
                        />
                    </div>
                </div>

                {clientSecret && (
                    <Elements key={clientSecret} options={options} stripe={stripePromise}>
                        <CheckoutForm amount={amount} returnPath={directDonation?.returnPath} />
                    </Elements>
                )}
            </div>
        </div>
    );
}
