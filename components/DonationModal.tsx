"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";
import Button from "@/app/components/Button";
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
};

export default function DonationModal({ isOpen, onClose, feederName, initialAmount = 5, isDeposit = false }: DonationModalProps) {
    const [clientSecret, setClientSecret] = useState("");
    const [amount, setAmount] = useState(initialAmount);

    useEffect(() => {
        setAmount(initialAmount);
    }, [initialAmount, isOpen]);

    useEffect(() => {
        if (isOpen) {
            // IF isDeposit is true, we might call a different endpoint or pass metadata
            // For now, reusing the same endpoint but ideally we'd pass { type: 'deposit' }
            // Let's assume the backend handles it or we just create a generic payment intent
            fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount, isDeposit }),
            })
                .then((res) => res.json())
                .then((data) => setClientSecret(data.clientSecret));
        }
    }, [amount, isOpen, isDeposit]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe',
    };
    const options: any = {
        clientSecret,
        appearance,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-4">
                    {isDeposit ? "Add Funds to Wallet" : `Donate to ${feederName || "Animals"}`}
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
                            ${val}
                        </button>
                    ))}
                    <div className="flex items-center">
                        <span className="mr-2 text-gray-600">$</span>
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
                    <Elements options={options} stripe={stripePromise}>
                        <CheckoutForm amount={amount} />
                        {/* Note: CheckoutForm needs to handle success by calling an API to credit the user if relying on client-side confirmation for MVP */}
                    </Elements>
                )}
            </div>
        </div>
    );
}
