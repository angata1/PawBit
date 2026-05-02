"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import DonationModal from "@/components/DonationModal";
import { User as UserIcon, Shield, Key, Loader2, PlayCircle, MapPin } from "lucide-react";

type MessageState = { type: "success" | "error"; text: string } | null;

type TransactionRow = {
    id: number;
    amount_eur: number;
    type: string;
    created_at: string;
};

type ContributionRow = {
    amount_contributed: number | null;
    meals: {
        id: number;
        time_of_meal: string | null;
        total_cost_eur: number | null;
        video_link: string | null;
        feeders: {
            id: number;
            name: string | null;
            location: {
                address?: string;
            } | null;
        } | {
            id: number;
            name: string | null;
            location: {
                address?: string;
            } | null;
        }[] | null;
    } | {
        id: number;
        time_of_meal: string | null;
        total_cost_eur: number | null;
        video_link: string | null;
        feeders: any;
    }[] | null;
};

type UserVideo = {
    mealId: number;
    youtubeUrl: string;
    feederId: string;
    feederName: string;
    location: string;
    contributionAmount: number;
    mealCost: number;
    timestamp: string;
};

function getYouTubeEmbedUrl(url: string): string {
    if (!url) return "";

    if (url.includes("/embed/")) return url;

    try {
        const parsed = new URL(url);
        const videoId = parsed.searchParams.get("v");
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;

        const segments = parsed.pathname.split("/").filter(Boolean);
        const shortId = parsed.hostname.includes("youtu.be") ? segments[0] : "";
        if (shortId) return `https://www.youtube.com/embed/${shortId}`;
    } catch {
        return "";
    }

    return "";
}

export default function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [txPage, setTxPage] = useState(0);
    const [hasMoreTx, setHasMoreTx] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);
    const [contributedVideos, setContributedVideos] = useState<UserVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<MessageState>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations("Profile");

    useEffect(() => {
        const getUser = async () => {
            const { data: { user: authUser }, error } = await supabase.auth.getUser();
            if (error || !authUser) {
                router.push("/login");
                return;
            }

            const { data: publicUser } = await supabase
                .from("users")
                .select("balance")
                .eq("auth_id", authUser.id)
                .single();

            if (publicUser) {
                authUser.user_metadata.balance = publicUser.balance;
            }

            const { data: userTransactions } = await supabase
                .from("donations")
                .select("id, amount_eur, type, created_at")
                .eq("user_auth_id", authUser.id)
                .order("created_at", { ascending: false })
                .range(0, 4);

            if (userTransactions) {
                setTransactions(userTransactions as TransactionRow[]);
                if (userTransactions.length < 5) setHasMoreTx(false);
            }

            const { data: contributionRows } = await supabase
                .from("meal_contributions")
                .select(`
                    amount_contributed,
                    meals (
                        id,
                        time_of_meal,
                        total_cost_eur,
                        video_link,
                        feeders (
                            id,
                            name,
                            location
                        )
                    )
                `)
                .eq("user_id", authUser.id)
                .order("created_at", { ascending: false });

            const mappedVideos = ((contributionRows || []) as any[])
                .map((row) => {
                    const meal = Array.isArray(row.meals) ? row.meals[0] : row.meals;
                    const feeder = meal ? (Array.isArray(meal.feeders) ? meal.feeders[0] : meal.feeders) : null;

                    if (!meal || !meal.video_link) return null;

                    return {
                        mealId: meal.id,
                        youtubeUrl: meal.video_link,
                        feederId: String(feeder?.id || ""),
                        feederName: feeder?.name || t("unknownLocation"), // Reusing unknown location if name is missing
                        location: feeder?.location?.address || t("unknownLocation"),
                        contributionAmount: Number(row.amount_contributed || 0),
                        mealCost: Number(meal.total_cost_eur || 0),
                        timestamp: meal.time_of_meal || new Date().toISOString(),
                    };
                })
                .filter((row): row is UserVideo => row !== null);

            setContributedVideos(mappedVideos);
            setUser(authUser);
            setLoading(false);
        };

        void getUser();
    }, [router, supabase]);

    const loadMoreTransactions = async () => {
        if (!user || loadingTx) return;
        setLoadingTx(true);
        const nextPage = txPage + 1;
        const { data: newTx } = await supabase
            .from("donations")
            .select("id, amount_eur, type, created_at")
            .eq("user_auth_id", user.id)
            .order("created_at", { ascending: false })
            .range(nextPage * 5, (nextPage + 1) * 5 - 1);

        if (newTx) {
            setTransactions((prev) => [...prev, ...(newTx as TransactionRow[])]);
            setTxPage(nextPage);
            if (newTx.length < 5) setHasMoreTx(false);
        }
        setLoadingTx(false);
    };

    const handleUpdateProfile = async (updates: { password?: string; data?: { is_anonymous: boolean } }) => {
        setUpdating(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;
            setMessage({ type: "success", text: t("updateSuccess") });

            const { data: { user: updatedUser } } = await supabase.auth.getUser();
            setUser(updatedUser);
        } catch (error) {
            const typedError = error as Error;
            setMessage({ type: "error", text: typedError.message });
        } finally {
            setUpdating(false);
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handlePasswordChange = async (event: React.FormEvent) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: t("errorPasswords") });
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
        <div className="min-h-screen pt-12 px-4 pb-12 bg-background container mx-auto max-w-6xl">
            <h1 className="text-4xl font-bold mb-8 text-center">{t("title")}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr] gap-6 md:gap-8">
                <div className="space-y-8">
                    <Card className="bg-white">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <UserIcon className="w-8 h-8 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-bold truncate">{user.user_metadata?.full_name || "User"}</h2>
                                <p className="text-muted-foreground font-mono text-sm truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-muted/30 p-4 rounded-xl border border-foreground/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 font-bold">
                                        <Shield className="w-5 h-5 text-accent" />
                                        <span>{t("privacyMode")}</span>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isAnonymous ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                        {isAnonymous ? t("anonymous") : t("public")}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {isAnonymous
                                        ? t("nameHidden")
                                        : t("nameVisible")}
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={toggleAnonymous}
                                    disabled={updating}
                                    size="sm"
                                >
                                    {updating ? t("updating") : (isAnonymous ? t("switchToPublic") : t("switchToAnonymous"))}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-white">
                        <div className="flex items-center gap-2 mb-6">
                            <Key className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold">{t("changePassword")}</h2>
                        </div>

                        <form onSubmit={handlePasswordChange}>
                            {message && (
                                <div className={`p-4 rounded-lg mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                    {message.text}
                                </div>
                            )}

                            <Input
                                label={t("newPassword")}
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                placeholder={t("minChars")}
                                required
                            />
                            <Input
                                label={t("confirmPassword")}
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                placeholder={t("repeatPassword")}
                                required
                            />

                            <Button
                                type="submit"
                                className="w-full mt-4"
                                disabled={updating || !newPassword}
                            >
                                {updating ? t("updating") : t("updatePassword")}
                            </Button>
                        </form>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="p-2 bg-yellow-100 rounded-lg text-yellow-700">{t("wallet")}</span>
                                {t("balance")}
                            </h2>
                        </div>
                        <div className="text-center py-6">
                            <span className="text-4xl md:text-5xl font-black text-primary block mb-2 break-all px-2">
                                {Number(user.user_metadata?.balance || 0).toFixed(2)} <span className="text-lg md:text-xl text-muted-foreground">EUR</span>
                            </span>
                            <p className="text-sm text-muted-foreground mb-6">{t("availableToFeed")}</p>
                            <Button className="w-full" size="lg" onClick={() => setIsDepositModalOpen(true)}>
                                {t("addFunds")}
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-white">
                        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
                        <div className="space-y-3">
                            {transactions.length > 0 ? (
                                <>
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between gap-2 p-3 bg-muted/20 rounded-lg border-2 border-foreground/10">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${tx.amount_eur > 0 ? "bg-green-100 border-green-300 text-green-700" : "bg-red-100 border-red-300 text-red-700"}`}>
                                                    {tx.amount_eur > 0 ? "↓" : "↑"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm capitalize truncate">{
                                                        tx.type.replace("deposit:", t("txTypes.deposit") + " ")
                                                        .replace("feeding", t("txTypes.feeding"))
                                                        .replace("live_feed", t("txTypes.live_feed"))
                                                    }</p>
                                                    <p className="text-xs text-muted-foreground truncate">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <span className={`font-bold whitespace-nowrap shrink-0 ${tx.amount_eur > 0 ? "text-green-600" : "text-foreground"}`}>
                                                {tx.amount_eur > 0 ? "+" : ""}{tx.amount_eur} EUR
                                            </span>
                                        </div>
                                    ))}
                                    {hasMoreTx && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={loadMoreTransactions}
                                            disabled={loadingTx}
                                        >
                                            {loadingTx ? t("loading") : t("loadMore")}
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    {t("noTransactions")}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <Card className="bg-white">
                    <h2 className="text-xl font-bold mb-4">{t("feedingsFunded")}</h2>
                    <div className="space-y-4">
                        {contributedVideos.length > 0 ? (
                            contributedVideos.map((video) => (
                                <div key={`${video.mealId}-${video.youtubeUrl}`} className="rounded-2xl overflow-hidden border-2 border-foreground bg-muted/10">
                                    <div className="aspect-video bg-black">
                                        <iframe
                                            className="w-full h-full"
                                            src={getYouTubeEmbedUrl(video.youtubeUrl)}
                                            title={`${video.feederName} contribution`}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-lg truncate">{video.feederName}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono truncate">
                                                    <MapPin className="w-4 h-4 shrink-0" />
                                                    <span className="truncate">{video.location}</span>
                                                </div>
                                            </div>
                                            <span className="inline-flex shrink-0 items-center gap-2 bg-accent/20 text-accent-foreground px-3 py-1 rounded-lg text-xs font-bold border border-accent/50 uppercase tracking-wider">
                                                <PlayCircle className="w-3 h-3" /> {t("recorded")}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                            <span className="font-mono text-muted-foreground">
                                                {new Date(video.timestamp).toLocaleDateString()} {new Date(video.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            <span className="font-bold text-primary">
                                                {t("contributedAmount", { amount: video.contributionAmount.toFixed(2), total: video.mealCost.toFixed(2) })}
                                            </span>
                                        </div>
                                        <Button className="w-full" variant="outline" onClick={() => router.push(`/feeder/${video.feederId}`)}>
                                            {t("openFeeder")}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                {t("noVideos")}
                            </div>
                        )}
                    </div>
                </Card>
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
