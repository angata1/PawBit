"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
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
                router.push("/login?message=Account created! Please check your email to confirm.");
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
                <h1 className="text-3xl font-bold mb-2 text-center">Join PawBit</h1>
                <p className="text-center text-muted-foreground mb-8 font-mono">
                    Become a hero for street animals.
                </p>

                <form onSubmit={handleRegister}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <Input
                        label="Full Name"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
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
                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    <Button type="submit" variant="accent" className="w-full mt-4" size="lg" disabled={loading}>
                        {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>
                <div className="mt-6 text-center text-sm font-mono">
                    Already have an account?{" "}
                    <Link href="/login"><span className="font-bold text-primary cursor-pointer hover:underline">
                        Login now
                    </span></Link>
                </div>
            </Card>
        </div>
    );
}
