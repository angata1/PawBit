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
        <div className="min-h-screen flex items-center justify-center pt-20 px-4">
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
                        <a href="#" className="font-bold text-accent hover:underline">
                            Lost Password?
                        </a>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? "Logging in..." : "Log In"}
                    </Button>
                </form>

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
