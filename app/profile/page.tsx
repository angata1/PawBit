"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import DonationModal from "@/components/DonationModal";
import { User as UserIcon, Shield, Key, Loader2 } from "lucide-react";

export default function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();

    // Password Update State
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push("/login");
                return;
            }

            // Fetch public user data (balance)
            const { data: publicUser } = await supabase
                .from('users')
                .select('balance')
                .eq('auth_id', user.id)
                .single();

            if (publicUser) {
                // Update local user object with real balance from DB
                user.user_metadata.balance = publicUser.balance;

                // Fetch transactions
                const { data: userTransactions } = await supabase
                    .from('donations')
                    .select('*')
                    .eq('user_auth_id', user.id) // Updated to match schema
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (userTransactions) {
                    setTransactions(userTransactions);
                }
            }

            setUser(user);
            setLoading(false);
        };
        getUser();
    }, [supabase, router]);

    const handleUpdateProfile = async (updates: any) => {
        setUpdating(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;
            setMessage({ type: 'success', text: "Profile updated successfully!" });

            // Refresh user data
            const { data: { user: updatedUser } } = await supabase.auth.getUser();
            setUser(updatedUser);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setUpdating(false);
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords do not match" });
            return;
        }
        await handleUpdateProfile({ password: newPassword });
    };

    const toggleAnonymous = async () => {
        const isAnonymous = user?.user_metadata?.is_anonymous || false;
        await handleUpdateProfile({
            data: { is_anonymous: !isAnonymous }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    const isAnonymous = user.user_metadata?.is_anonymous || false;

    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-background container mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold mb-8 text-center">My Profile</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* User Info & Settings */}
                <div className="space-y-8">
                    <Card className="bg-white">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <UserIcon className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{user.user_metadata?.full_name || "User"}</h2>
                                <p className="text-muted-foreground font-mono text-sm">{user.email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-muted/30 p-4 rounded-xl border border-foreground/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 font-bold">
                                        <Shield className="w-5 h-5 text-accent" />
                                        <span>Privacy Mode</span>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isAnonymous ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {isAnonymous ? 'Anonymous' : 'Public'}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {isAnonymous
                                        ? "Your name is hidden from leaderboards and feeds."
                                        : "Your name appears on leaderboards and donations."}
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={toggleAnonymous}
                                    disabled={updating}
                                    size="sm"
                                >
                                    {updating ? "Updating..." : (isAnonymous ? "Switch to Public" : "Switch to Anonymous")}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Change Password */}
                    <Card className="bg-white">
                        <div className="flex items-center gap-2 mb-6">
                            <Key className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold">Change Password</h2>
                        </div>

                        <form onSubmit={handlePasswordChange}>
                            {message && (
                                <div className={`p-4 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {message.text}
                                </div>
                            )}

                            <Input
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                required
                            />
                            <Input
                                label="Confirm Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat password"
                                required
                            />

                            <Button
                                type="submit"
                                className="w-full mt-4"
                                disabled={updating || !newPassword}
                            >
                                {updating ? "Updating..." : "Update Password"}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Wallet Section */}
                <div className="space-y-8">
                    <Card className="bg-white border-2 border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="p-2 bg-yellow-100 rounded-lg text-yellow-700">🪙</span>
                                Wallet Balance
                            </h2>
                        </div>
                        <div className="text-center py-6">
                            <span className="text-5xl font-black text-primary block mb-2">
                                {Number(user.user_metadata?.balance || 0).toFixed(2)} <span className="text-xl text-muted-foreground">лв</span>
                            </span>
                            <p className="text-sm text-muted-foreground mb-6">Available to feed animals</p>
                            <Button className="w-full" size="lg" onClick={() => setIsDepositModalOpen(true)}>
                                Add Funds
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-white">
                        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
                        <div className="space-y-3">
                            <div className="space-y-3">
                                {transactions.length > 0 ? (
                                    transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-foreground/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${tx.amount_eur > 0 ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'}`}>
                                                    {tx.amount_eur > 0 ? '↓' : '↑'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm capitalize">{tx.type.replace('deposit:', 'Deposit ').replace('feeding', 'Feeding')}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <span className={`font-bold ${tx.amount_eur > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                                {tx.amount_eur > 0 ? '+' : ''}{tx.amount_eur}лв
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        No transactions yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <DonationModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                isDeposit={true}
                feederName="Wallet"
            />
        </div>
    );
}
