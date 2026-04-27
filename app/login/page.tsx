"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { PawPrint } from "lucide-react";
import Link from "next/link";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            } else {
                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center pt-8 px-4">
            <Card className="w-full max-w-md bg-white">
                <div className="text-center mb-8">
                    <div className="inline-block bg-primary p-4 rounded-full border-2 border-foreground neu-shadow mb-4">
                        <PawPrint className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold">Welcome Back</h1>
                    <p className="text-muted-foreground font-mono">
                        Sign in to track your furry friends.
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <div className="flex items-center justify-between mb-6 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-2 border-foreground text-primary focus:ring-primary"
                            />
                            <span className="font-mono">Remember me</span>
                        </label>
                        <Link href="/forgot-password" className="font-bold text-accent hover:underline">
                            Forgot Password?
                        </Link>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? "Logging in..." : "Log In"}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-foreground/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-muted-foreground font-mono">Or continue with</span>
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
                    Don&apos;t have an account?{" "}
                    <Link href="/register"><span className="font-bold text-primary cursor-pointer hover:underline">
                        Register now
                    </span></Link>
                </div>
            </Card>
        </div>
    );
}
