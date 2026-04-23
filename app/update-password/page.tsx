"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { KeyRound, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function UpdatePassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const router = useRouter();
    const supabase = createClient();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-8 px-4">
                <Card className="w-full max-w-md bg-white p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black">Password Updated!</h2>
                    <p className="text-sm font-mono text-muted-foreground">Your password has been successfully reset.</p>
                    <Link href="/login" className="block w-full">
                        <Button className="w-full mt-4" size="lg">
                            Go to Login
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center pt-8 px-4">
            <Card className="w-full max-w-md bg-white p-8">
                <div className="text-center mb-8">
                    <div className="inline-block bg-primary p-4 rounded-full border-2 border-foreground neu-shadow mb-4">
                        <KeyRound className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold">New Password</h1>
                    <p className="text-muted-foreground font-mono mt-2">
                        Please enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleUpdate}>
                    {error && (
                        <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 font-mono text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Input
                            label="Confirm New Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full mt-8" size="lg" disabled={loading}>
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
