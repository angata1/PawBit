"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../components/Card";
import Button from "../components/Button";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Search, MapPin, Filter, ChevronLeft, ChevronRight, PlayCircle, Heart, Loader2 } from "lucide-react";

type GalleryContributionRow = {
    amount_contributed: number | null;
    user_id: string;
    users: { name: string | null } | { name: string | null }[] | null;
};

type GalleryMealRow = {
    id: number;
    feeder_id: number;
    total_cost_eur: number | null;
    time_of_meal: string | null;
    triggered_by: string | null;
    video_link: string | null;
    feeders: {
        id: number;
        name: string | null;
        location: {
            address?: string;
        } | null;
    }[] | null;
    meal_contributions: GalleryContributionRow[] | null;
};

type GalleryFeederRow = {
    id: number;
    name: string | null;
    location: {
        address?: string;
    } | string | null;
};

type GalleryVideo = {
    id: number;
    youtubeUrl: string;
    title: string;
    feederId: string;
    feederName: string;
    location: string;
    timestamp: string;
    donors: { name: string; amount: number }[];
    description: string;
};

const ITEMS_PER_PAGE = 10;

function getYouTubeEmbedUrl(url: string): string {
    if (!url) return "";

    if (url.includes("/embed/")) {
        return url.replace('youtube.com', 'youtube-nocookie.com').replace('www.youtube.com', 'www.youtube-nocookie.com');
    }

    try {
        const parsed = new URL(url);
        const videoId = parsed.searchParams.get("v");
        if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;

        const segments = parsed.pathname.split("/").filter(Boolean);
        const shortId = parsed.hostname.includes("youtu.be") ? segments[0] : "";
        if (shortId) return `https://www.youtube-nocookie.com/embed/${shortId}`;
    } catch {
        return url;
    }

    return url;
}

function getContributorName(userField: GalleryContributionRow["users"]): string {
    if (!userField) return "Anonymous";
    if (Array.isArray(userField)) return userField[0]?.name || "Anonymous";
    return userField.name || "Anonymous";
}

function unwrapFeeder(feeders: GalleryMealRow["feeders"]): GalleryFeederRow | null {
    if (!feeders) return null;
    return Array.isArray(feeders) ? (feeders[0] || null) : feeders;
}

function resolveLocation(location: GalleryFeederRow["location"], fallback: string): string {
    if (!location) return fallback;

    if (typeof location === "string") {
        const trimmed = location.trim();
        if (!trimmed) return fallback;

        try {
            const parsed = JSON.parse(trimmed) as { address?: string };
            if (parsed && typeof parsed === "object" && parsed.address) {
                return parsed.address;
            }
        } catch {
            // Keep the raw string if it is not JSON.
        }

        return trimmed;
    }

    return location.address?.trim() || fallback;
}

function buildGalleryVideo(row: GalleryMealRow, feederLookup: Map<string, GalleryFeederRow>): GalleryVideo | null {
    const feeder = unwrapFeeder(row.feeders) || feederLookup.get(String(row.feeder_id)) || null;

    if (!row.video_link) return null;

    const feederName = feeder?.name?.trim() || `Feeder #${row.feeder_id}`;
    const location = resolveLocation(feeder?.location || null, feederName);
    const timestamp = row.time_of_meal || new Date().toISOString();
    const donors = (row.meal_contributions || [])
        .filter((entry) => Number(entry.amount_contributed || 0) > 0)
        .map((entry) => ({
            name: getContributorName(entry.users),
            amount: Number(entry.amount_contributed || 0),
        }));

    return {
        id: row.id,
        youtubeUrl: row.video_link,
        title: `${feederName} feeding`,
        feederId: String(row.feeder_id),
        feederName,
        location,
        timestamp,
        donors,
        description: `Recorded ${row.triggered_by || "feeding"} meal worth ${Number(row.total_cost_eur || 0).toFixed(2)} EUR.`,
    };
}

const Feedings: React.FC = () => {
    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations('Feedings');

    const [videos, setVideos] = useState<GalleryVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocation, setSelectedLocation] = useState<string>("all");

    useEffect(() => {
        const loadVideos = async () => {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from("meals")
                .select(`
                    id,
                    feeder_id,
                    total_cost_eur,
                    time_of_meal,
                    triggered_by,
                    video_link,
                    feeders (
                        id,
                        name,
                        location
                    ),
                    meal_contributions (
                        amount_contributed,
                        user_id,
                        users (
                            name
                        )
                    )
                `)
                .not("video_link", "is", null)
                .order("time_of_meal", { ascending: false });

            if (fetchError) {
                setError(fetchError.message);
                setVideos([]);
                setLoading(false);
                return;
            }

            const feederIds = Array.from(
                new Set(
                    ((data || []) as GalleryMealRow[])
                        .map((row) => row.feeder_id)
                        .filter((id): id is number => Number.isFinite(id))
                )
            );
            const feederLookup = new Map<string, GalleryFeederRow>();

            if (feederIds.length > 0) {
                const { data: feederRows } = await supabase
                    .from("feeders")
                    .select("id, name, location")
                    .in("id", feederIds);

                (feederRows || []).forEach((feeder) => {
                    feederLookup.set(String(feeder.id), feeder as GalleryFeederRow);
                });
            }

            const mapped = ((data || []) as GalleryMealRow[])
                .map((row) => buildGalleryVideo(row, feederLookup))
                .filter((video): video is GalleryVideo => video !== null);

            setVideos(mapped);
            setLoading(false);
        };

        void loadVideos();
    }, [supabase]);

    const filteredVideos = useMemo(() => {
        return videos.filter((video) => {
            const search = searchQuery.toLowerCase();
            const matchesSearch =
                video.title.toLowerCase().includes(search) ||
                video.feederName.toLowerCase().includes(search) ||
                video.location.toLowerCase().includes(search) ||
                video.donors.some((donor) => donor.name.toLowerCase().includes(search));

            const matchesLocation = selectedLocation === "all" || video.feederId === selectedLocation;
            return matchesSearch && matchesLocation;
        });
    }, [videos, searchQuery, selectedLocation]);

    const totalPages = Math.max(1, Math.ceil(filteredVideos.length / ITEMS_PER_PAGE));
    const currentVideos = filteredVideos.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const locations = Array.from(
        new Map(videos.map((video) => [video.feederId, { id: video.feederId, name: video.feederName }])).values()
    );

    return (
        <div className="min-h-screen pt-12 px-4 pb-12 bg-background container mx-auto max-w-6xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-black mb-4 text-foreground font-serif">
                    {t('title')}
                </h1>
                <p className="text-xl text-muted-foreground font-mono max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </div>

            <Card className="mb-8 bg-white sticky top-20 z-30 shadow-xl border-2 border-foreground">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono text-sm"
                            value={searchQuery}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <button
                            onClick={() => {
                                setSelectedLocation("all");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border-2 ${selectedLocation === "all" ? "bg-primary text-white border-primary" : "bg-white border-foreground/10 hover:border-primary"}`}
                        >
                            {t('allLocations')}
                        </button>
                        {locations.map((location) => (
                            <button
                                key={location.id}
                                onClick={() => {
                                    setSelectedLocation(location.id);
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border-2 ${selectedLocation === location.id ? "bg-primary text-white border-primary" : "bg-white border-foreground/10 hover:border-primary"}`}
                            >
                                {location.name}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="font-mono">{t('loading')}</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-foreground/20">
                    <h3 className="text-xl font-bold text-foreground">{t('errorLoad')}</h3>
                    <p className="text-sm text-muted-foreground font-mono mt-2">{error}</p>
                </div>
            ) : (
                <>
                    <div className="space-y-8">
                        {currentVideos.length > 0 ? (
                            currentVideos.map((video) => (
                                <div key={video.id} className="bg-white rounded-3xl overflow-hidden border-2 border-foreground neu-shadow hover:neu-shadow-lg transition-all duration-300">
                                    <div className="flex flex-col lg:flex-row">
                                        <div className="lg:w-7/12 bg-black relative group aspect-video lg:aspect-auto">
                                            <iframe
                                                className="w-full h-full absolute inset-0"
                                                src={getYouTubeEmbedUrl(video.youtubeUrl)}
                                                title={video.title}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>

                                        <div className="lg:w-5/12 p-6 md:p-8 flex flex-col justify-between bg-card">
                                            <div>
                                                <div className="flex justify-between items-start mb-4 gap-4">
                                                    <span className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-3 py-1 rounded-lg text-xs font-bold border border-accent/50 uppercase tracking-wider">
                                                        <PlayCircle className="w-3 h-3" /> {t('recordedBadge')}
                                                    </span>
                                                    <span className="font-mono text-xs text-muted-foreground text-right">
                                                        {new Date(video.timestamp).toLocaleDateString()} {" "}
                                                        {new Date(video.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>

                                                <h3 className="text-2xl font-bold mb-2 font-serif">{video.title}</h3>

                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
                                                    <MapPin className="w-4 h-4" />
                                                    {video.location}
                                                </div>

                                                <div className="bg-white/50 rounded-xl p-4 border-2 border-foreground/5 mb-6">
                                                    <h4 className="font-bold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                                        <Heart className="w-4 h-4 text-primary" fill="currentColor" /> {t('madePossibleBy')}
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {video.donors.length > 0 ? (
                                                            video.donors.map((donor, index) => (
                                                                <div key={`${video.id}-${donor.name}-${index}`} className="flex justify-between items-center text-sm gap-3">
                                                                    <span className="font-bold text-foreground">{donor.name}</span>
                                                                    <span className="font-mono bg-green-100 text-green-800 px-2 rounded text-xs border border-green-200">
                                                                        {donor.amount.toFixed(2)} EUR
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground font-mono">
                                                                {t('noDonors')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t border-foreground/10 text-xs italic text-muted-foreground">
                                                        <span>&quot;{video.description}&quot;</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <Button
                                                    onClick={() => router.push(`/feeder/${video.feederId}`)}
                                                    className="w-full"
                                                    size="lg"
                                                >
                                                    {t('feedHereAgain')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-foreground/20">
                                <h3 className="text-xl font-bold text-muted-foreground">{t('noResults')}</h3>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedLocation("all");
                                        setCurrentPage(1);
                                    }}
                                >
                                    {t('clearFilters')}
                                </Button>
                            </div>
                        )}
                    </div>

                    {filteredVideos.length > 0 && (
                        <div className="flex justify-center items-center gap-4 mt-12">
                            <Button
                                variant="outline"
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                                icon={<ChevronLeft className="w-5 h-5" />}
                            >
                                {t('prev')}
                            </Button>

                            <div className="font-mono font-bold text-lg">
                                {t('pagination', { current: currentPage, total: totalPages })}
                            </div>

                            <Button
                                variant="outline"
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                {t('next')} <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Feedings;
