"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from 'next-intl';

import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Link from "next/link";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations('Register');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                setError(error.message);
            } else if (data.user) {
                // Manually create public user record since triggers might be missing
                // Manually create public user record since triggers might be missing
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        auth_id: data.user.id,
                        name: fullName,
                        email: email,
                        // balance: 0 // If schema allows default 0 or if column exists
                    });

                if (insertError) {
                    console.error("Error creating public user:", insertError);
                    // We don't block the user, but we log it. 
                    // Ideally we might want to show an error or retry.
                }

                // Check if email confirmation is required/sent
                // For now redirect or show message
                router.push(`/login?message=${encodeURIComponent(t('accountCreated'))}`);
            }
        } catch (err) {
            setError(t('errorGeneric'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-8 px-4">
            <Card className="w-full max-w-md bg-white">
                <h1 className="text-3xl font-bold mb-2 text-center">{t('title')}</h1>
                <p className="text-center text-muted-foreground mb-8 font-mono">
                    {t('desc')}
                </p>

                <form onSubmit={handleRegister}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <Input
                        label={t('fullNameLabel')}
                        type="text"
                        placeholder={t('fullNamePlaceholder')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                    <Input
                        label={t('emailLabel')}
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label={t('passwordLabel')}
                        type="password"
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Input
                        label={t('confirmPasswordLabel')}
                        type="password"
                        placeholder={t('passwordPlaceholder')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    <Button type="submit" variant="accent" className="w-full mt-4" size="lg" disabled={loading}>
                        {loading ? t('creatingAccountBtn') : t('createAccountBtn')}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-foreground/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-muted-foreground font-mono">{t('orContinueWith')}</span>
                    </div>
                </div>

                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full bg-white text-foreground hover:bg-gray-50 flex items-center justify-center gap-2" 
                    size="lg"
                    onClick={async () => {
                        const { error } = await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: `${location.origin}/auth/callback`,
                            },
                        });
                        if (error) setError(error.message);
                    }}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                </Button>

                <div className="mt-6 text-center text-sm font-mono">
                    {t('alreadyHaveAccount')}{" "}
                    <Link href="/login"><span className="font-bold text-primary cursor-pointer hover:underline">
                        {t('loginNow')}
                    </span></Link>
                </div>
            </Card>
        </div>
    );
}
