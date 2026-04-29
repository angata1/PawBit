"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, Check } from "lucide-react";
import Button from "@/app/components/Button";

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("pawbit-cookie-consent");
        if (!consent) {
            // Small delay so it slides in after page load
            const t = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    const accept = () => {
        localStorage.setItem("pawbit-cookie-consent", "accepted");
        setVisible(false);
    };

    const decline = () => {
        localStorage.setItem("pawbit-cookie-consent", "declined");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            className={`
                fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]
                w-[calc(100%-2rem)] max-w-xl
                bg-card border-2 border-foreground rounded-2xl
                shadow-[6px_6px_0px_0px_rgba(60,50,30,0.8)]
                p-4 md:p-5
                flex flex-col sm:flex-row items-start sm:items-center gap-4
                animate-in slide-in-from-bottom-4 duration-500
            `}
        >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary/15 border-2 border-primary/30 rounded-xl flex items-center justify-center">
                <Cookie className="w-5 h-5 text-primary" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground mb-0.5">
                    This site uses cookies 🍪
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                    We use essential cookies to keep feeders running and your session alive.{" "}
                    <Link href="/privacy" className="underline hover:text-primary transition-colors">
                        Privacy Policy
                    </Link>
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <Button
                    onClick={accept}
                    variant="primary"
                    size="sm"
                    icon={<Check className="w-4 h-4" />}
                    className="flex-1 sm:flex-none"
                >
                    Accept
                </Button>
                <button
                    onClick={decline}
                    aria-label="Decline cookies"
                    className="p-2 rounded-lg border-2 border-foreground/20 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
