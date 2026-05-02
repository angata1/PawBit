"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { KeyRound, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const t = useTranslations('Auth');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage(t('checkEmail'));
            }
        } catch (err) {
            setError(t('errorGeneric'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-8 px-4">
            <Card className="w-full max-w-md bg-white p-8">
                <Link href="/login" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('backToLogin')}
                </Link>

                <div className="text-center mb-8">
                    <div className="inline-block bg-accent p-4 rounded-full border-2 border-foreground neu-shadow mb-4">
                        <KeyRound className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold">{t('resetPassword')}</h1>
                    <p className="text-muted-foreground font-mono mt-2">
                        {t('resetPasswordDesc')}
                    </p>
                </div>

                <form onSubmit={handleReset}>
                    {error && (
                        <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 font-mono text-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-xl mb-4 font-mono text-sm">
                            {message}
                        </div>
                    )}
                    <div className="mb-4">
                        <Input
                            label={t('emailLabel')}
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full mt-4" size="lg" disabled={loading}>
                        {loading ? t('sending') : t('sendResetLink')}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
