"use client";

import { useState } from "react";
import DonationModal from "@/components/DonationModal";
import Button from "@/app/components/Button";
import { Heart } from "lucide-react";

export default function DonatePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
            <div className="text-center max-w-2xl">
                <div className="inline-block p-4 rounded-full bg-red-100 mb-6">
                    <Heart className="w-12 h-12 text-red-500 fill-red-500" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Support Our Cause</h1>
                <p className="text-muted-foreground text-lg mb-8">
                    Your donations directly feed street animals. 100% of your contribution goes to purchasing food and maintaining the smart feeders.
                </p>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    size="lg"
                    className="animate-bounce"
                >
                    Make a Donation
                </Button>
            </div>

            <DonationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
