"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Feeder, User, deriveConnectionStatus } from '../../types';
import Card from '../../components/Card';
import Button from '../../components/Button';
import AgoraLivePlayer from '../../components/AgoraLivePlayer';
import DonationModal from '@/components/DonationModal';
import RealtimeChat from '@/components/RealtimeChat';
import { useTranslations } from 'next-intl';
import { Video, ArrowLeft, Activity, Heart, AlertCircle, MapPin, ArrowRight, Loader2, WifiOff, PlayCircle } from 'lucide-react';

type FeederRow = {
    id: string | number;
    name: string;
    location?: {
        lat?: number;
        lng?: number;
        address?: string;
    } | null;
    enabled?: boolean | null;
    last_seen_at?: string | null;
    stock_level?: number | null;
    left_overs?: number | null;
    dispense_price_eur?: number | null;
    created_at?: string | null;
    is_streaming?: boolean | null;
};

type MealRow = {
    id: string | number;
    total_cost_eur?: number | null;
    time_of_meal?: string | null;
};

type PendingDonationState = {
    amount: number;
    mode: 'live' | 'feeder_pool' | 'global_pool';
    feederId?: string;
    returnPath?: string;
    paymentIntentId?: string;
};

const PENDING_DONATION_KEY = 'pawbit:pending-donation-ready';

function getSafeYouTubeUrl(url: string) {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        if (['youtube.com', 'www.youtube.com', 'youtu.be'].includes(urlObj.hostname)) {
            let videoId = '';
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else {
                videoId = urlObj.searchParams.get('v') || '';
            }
            if (videoId) {
                return `https://www.youtube-nocookie.com/embed/${videoId}`;
            }
        }
    } catch {
        return '';
    }
    return '';
}

export default function FeederDetails() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const t = useTranslations('FeederDetails');

    const [feeder, setFeeder] = useState<Feeder | null>(null);
    const [donations, setDonations] = useState<MealRow[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [streamStatus, setStreamStatus] = useState<'offline' | 'standby' | 'connecting' | 'live'>('offline');
    const [donationMode, setDonationMode] = useState<'live' | 'feeder_pool' | 'global_pool'>(id === 'all' ? 'global_pool' : 'feeder_pool');
    const [customAmount, setCustomAmount] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [donationAmount, setDonationAmount] = useState(5);
    const [pendingDonationMode, setPendingDonationMode] = useState<'live' | 'feeder_pool' | 'global_pool'>(donationMode);
    const pendingDonationHandledRef = useRef<string | null>(null);

    const mapFeederRow = (f: FeederRow): Feeder => {
        const enabled = f.enabled ?? true;
        const lastSeenAt = f.last_seen_at ?? null;
        return {
            id: String(f.id),
            name: f.name,
            location: {
                lat: f.location?.lat ?? 42.6977,
                lng: f.location?.lng ?? 23.3219,
                address: f.location?.address ?? 'Sofia, Bulgaria',
            },
            enabled,
            lastSeenAt,
            connectionStatus: deriveConnectionStatus(enabled, lastSeenAt),
            foodLevel: f.stock_level ?? 0,
            animalsDetected: f.left_overs ?? 0,
            dispensePriceEur: Number(f.dispense_price_eur ?? 2),
            lastFeeding: f.created_at || undefined,
            liveStreamUrl: '',
            streamProvider: undefined,
            streamChannel: undefined,
            streamUid: undefined,
            isStreaming: f.is_streaming ?? false,
        };
    };

    const fetchData = useCallback(async () => {
        const supabase = createClient();

        if (id === 'all') {
            const { data: allFeeders } = await supabase.from('feeders').select('id, name, location, stock_level, left_overs, active, enabled, last_seen_at, status, is_streaming, dispense_price_eur, created_at');
            if (allFeeders) {
                const totalAnimals = allFeeders.reduce((acc, f) => acc + (f.left_overs || 0), 0);
                const avgFood = allFeeders.length > 0
                    ? Math.round(allFeeders.reduce((acc, f) => acc + (f.stock_level || 0), 0) / allFeeders.length)
                    : 0;
                setFeeder({
                    id: 'all',
                    name: 'Global Donation Pool',
                    location: { lat: 0, lng: 0, address: `Active across ${allFeeders.length} stations` },
                    enabled: true,
                    lastSeenAt: new Date().toISOString(),
                    connectionStatus: 'online',
                    foodLevel: avgFood,
                    animalsDetected: totalAnimals,
                    dispensePriceEur: 2,
                    liveStreamUrl: '',
                    isStreaming: false
                });
            }

            const { data: recentMeals } = await supabase
                .from('meals')
                .select('*')
                .order('time_of_meal', { ascending: false })
                .limit(10);

            if (recentMeals) setDonations(recentMeals);
        } else {
            const { data: feederData } = await supabase
                .from('feeders')
                .select('id, name, location, stock_level, left_overs, active, enabled, last_seen_at, status, is_streaming, dispense_price_eur, created_at')
                .eq('id', id)
                .single();

            if (feederData) {
                const { data: streamData } = await supabase
                    .from('livestreams')
                    .select('id, stream_provider, stream_channel, stream_uid')
                    .eq('feeder_id', id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const mapped = mapFeederRow(feederData);
                if (streamData?.stream_provider) {
                    mapped.streamProvider = streamData.stream_provider;
                }
                if (streamData?.stream_channel) {
                    mapped.streamChannel = streamData.stream_channel;
                }
                if (streamData?.stream_uid) {
                    mapped.streamUid = streamData.stream_uid;
                }
                if (streamData?.stream_provider === 'youtube') {
                    const { data: youtubeStream } = await supabase
                        .from('livestreams')
                        .select('stream_url')
                        .eq('id', streamData.id)
                        .maybeSingle();
                    if (youtubeStream?.stream_url) {
                        mapped.liveStreamUrl = youtubeStream.stream_url;
                    }
                }

                setFeeder(mapped);
                if (mapped.connectionStatus === 'online') {
                    setStreamStatus(prev => {
                        if (mapped.isStreaming) return 'live';
                        if (prev === 'connecting') return 'connecting';
                        return 'standby';
                    });
                } else {
                    setStreamStatus('offline');
                }
            }

            const { data: feederMeals } = await supabase
                .from('meals')
                .select('*')
                .eq('feeder_id', id)
                .order('time_of_meal', { ascending: false })
                .limit(10);

            if (feederMeals) setDonations(feederMeals);
        }
        setLoading(false);
    }, [id]);

    useEffect(() => {
        const supabase = createClient();
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: publicUser } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('auth_id', user.id)
                    .maybeSingle();

                setCurrentUser({
                    id: user.id,
                    name: user.user_metadata?.full_name || t('communityMember'),
                    isAnonymous: user.user_metadata?.is_anonymous || false,
                    balance: publicUser?.balance || 0,
                    totalDonated: 0
                });
            }
        };
        getUser();
        fetchData();

        const mealsChannel = supabase
            .channel('meals-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'meals',
                filter: id !== 'all' ? `feeder_id=eq.${id}` : undefined
            }, () => { fetchData(); })
            .subscribe();

        const feedersChannel = supabase
            .channel('feeders-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'feeders',
                filter: id !== 'all' ? `id=eq.${id}` : undefined
            }, () => { fetchData(); })
            .subscribe();

        const livestreamsChannel = supabase
            .channel('livestreams-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'livestreams',
                filter: id !== 'all' ? `feeder_id=eq.${id}` : undefined
            }, () => { fetchData(); })
            .subscribe();

        return () => {
            supabase.removeChannel(mealsChannel);
            supabase.removeChannel(feedersChannel);
            supabase.removeChannel(livestreamsChannel);
        };
    }, [fetchData, t, id]);

    const handleStartStream = async () => {
        if (!currentUser) {
            router.push('/login');
            return;
        }
        setStreamStatus('connecting');
        
        try {
            const res = await fetch('/api/feeder/start-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feederId: id })
            });
            if (!res.ok) {
                console.error('Failed to start stream');
                setStreamStatus('offline');
            }
        } catch (e) {
            console.error(e);
            setStreamStatus('offline');
        }
    };

    const performDonation = useCallback(async (amount: number, mode: 'live' | 'feeder_pool' | 'global_pool') => {
        setIsAnimating(true);

        try {
            const isLiveFeed = mode === 'live' && id !== 'all';
            const endpoint = isLiveFeed ? '/api/feed' : '/api/donate-pool';
            const bodyPayload = isLiveFeed
                ? { amount, feederId: id }
                : mode === 'feeder_pool' && id !== 'all'
                    ? { amount, feederId: id }
                    : { amount };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'Insufficient funds') {
                    setIsModalOpen(true);
                } else {
                    alert(data.error);
                }
                setIsAnimating(false);
                return;
            }

            setCurrentUser(prev => prev ? ({ ...prev, balance: data.newBalance }) : null);
            if (isLiveFeed) setStreamStatus('live');
            setTimeout(() => { setIsAnimating(false); }, 2000);
            return true;

        } catch (err) {
            console.error(err);
            setIsAnimating(false);
            return false;
        }
    }, [id]);

    useEffect(() => {
        if (!currentUser) return;

        const rawPending = sessionStorage.getItem(PENDING_DONATION_KEY);
        if (!rawPending) return;

        let pendingDonation: PendingDonationState;
        try {
            pendingDonation = JSON.parse(rawPending) as PendingDonationState;
        } catch {
            sessionStorage.removeItem(PENDING_DONATION_KEY);
            return;
        }

        const token = pendingDonation.paymentIntentId || `${pendingDonation.amount}:${pendingDonation.mode}:${pendingDonation.feederId || ''}`;
        if (pendingDonationHandledRef.current === token) return;

        const expectedReturnPath = pendingDonation.returnPath || (id === 'all' ? '/feeder/all' : `/feeder/${id}`);
        const currentPath = id === 'all' ? '/feeder/all' : `/feeder/${id}`;
        if (expectedReturnPath !== currentPath) return;
        if ((currentUser.balance || 0) < pendingDonation.amount) return;

        pendingDonationHandledRef.current = token;
        sessionStorage.removeItem(PENDING_DONATION_KEY);
        setDonationMode(pendingDonation.mode);
        setPendingDonationMode(pendingDonation.mode);
        setDonationAmount(pendingDonation.amount);
        void performDonation(pendingDonation.amount, pendingDonation.mode).then((success) => {
            if (!success) {
                pendingDonationHandledRef.current = null;
                sessionStorage.setItem(PENDING_DONATION_KEY, rawPending);
            }
        });
    }, [currentUser, id, performDonation]);

    const handleDonate = async (amount: number, mode = donationMode) => {
        if (!currentUser) {
            router.push('/login');
            return;
        }

        const donationAmount = Number(amount);
        if (!Number.isFinite(donationAmount) || donationAmount <= 0) return;

        if ((currentUser.balance || 0) < donationAmount) {
            setDonationAmount(donationAmount);
            setPendingDonationMode(mode);
            setIsModalOpen(true);
            return;
        }

        await performDonation(donationAmount, mode);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="font-mono text-muted-foreground">{t('accessingSecureNode')}</p>
            </div>
        </div>
    );

    if (!feeder) return <div className="pt-24 text-center">{t('feederNotFound')}</div>;

    const isOffline = feeder.connectionStatus !== 'online';
    const feederPrice = Number(feeder.dispensePriceEur || 2);
    const quickAmounts = donationMode === 'live'
        ? Array.from(new Set([feederPrice, 5, 10])).sort((a, b) => a - b)
        : [2, 5, 10];
    const selectedModeLabel = donationMode === 'live'
        ? `${t('modes.live')} (${feederPrice.toFixed(2)} EUR minimum)`
        : donationMode === 'feeder_pool'
            ? t('modes.feeder_pool')
            : t('modes.global_pool');

    return (
        <div className="min-h-screen pt-4 sm:pt-8 pb-12 px-4 bg-background overflow-x-hidden">
            <div className="container mx-auto max-w-6xl">
                <button onClick={() => router.push('/map')} className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> {t('backToMap')}
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
                    <div className="w-full sm:w-auto">
                        <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-2">
                            <h1 className="text-2xl sm:text-4xl font-bold break-words">{feeder.id === 'all' ? t('globalPool') : feeder.name}</h1>
                            {feeder.connectionStatus === 'online' ? (
                                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-green-100 text-green-800 rounded-full text-[10px] sm:text-xs font-bold border border-green-300 animate-pulse uppercase">{t('online')}</span>
                            ) : feeder.connectionStatus === 'offline' ? (
                                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-red-100 text-red-800 rounded-full text-[10px] sm:text-xs font-bold border border-red-300 uppercase">{t('offline')}</span>
                            ) : (
                                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-zinc-100 text-zinc-800 rounded-full text-[10px] sm:text-xs font-bold border border-zinc-300 uppercase">{t('disabled')}</span>
                            )}
                        </div>
                        <p className="text-sm sm:text-lg text-muted-foreground font-mono flex items-center gap-2">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" /> {feeder.id === 'all' ? t('globalPoolSidebarDesc') : feeder.location.address}
                        </p>
                    </div>
                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="flex-1 sm:flex-initial bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-foreground text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            <span className="block text-[10px] font-bold uppercase text-gray-500">{t('food')}</span>
                            <span className="block text-lg sm:text-xl font-black text-primary">{feeder.foodLevel}%</span>
                        </div>
                        {id !== 'all' && (
                            <div className="flex-1 sm:flex-initial bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 border-foreground text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                                <span className="block text-[10px] font-bold uppercase text-gray-500">{t('mealPrice')}</span>
                                <span className="block text-lg sm:text-xl font-black text-primary">{feederPrice.toFixed(2)} EUR</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Main 2-col layout ── */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* ── LEFT COLUMN ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Stream / AI block */}
                        {id === 'all' ? (
                            <Card className="h-[300px] sm:h-[400px] flex flex-col items-center justify-center bg-white border-2 border-foreground neu-shadow">
                                <Heart className="w-16 h-16 sm:w-24 sm:h-24 text-primary mb-4" fill="currentColor" />
                                <h2 className="text-2xl sm:text-3xl font-black text-center mb-2 px-4 uppercase">{t('globalPool')}</h2>
                                <p className="text-center max-w-md text-muted-foreground font-mono px-6 text-sm sm:text-base">
                                    {t('globalPoolDesc')}
                                </p>
                            </Card>
                        ) : (
                            <div className="relative rounded-3xl overflow-hidden border-2 border-foreground bg-black h-[250px] sm:h-[420px] shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)]">

                                {/* OFFLINE STATE — simple, brutalist overlay */}
                                {isOffline && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 z-10 backdrop-blur-sm">
                                        <div className="bg-card border-2 border-foreground shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center max-w-sm mx-4 transform -rotate-1">
                                            <WifiOff className="w-10 h-10 sm:w-16 sm:h-16 text-foreground mb-4" />
                                            <h2 className="text-2xl sm:text-4xl font-black uppercase text-foreground mb-2">{t('offlineStatus')}</h2>
                                            <p className="font-mono text-muted-foreground text-xs sm:text-sm leading-relaxed">
                                                {t('offlineDesc')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* CONNECTING */}
                                {streamStatus === 'connecting' && !isOffline && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-10">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="font-mono animate-pulse">{t('establishingTunnel')}</p>
                                    </div>
                                )}

                                {/* STANDBY */}
                                {streamStatus === 'standby' && !isOffline && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white z-10">
                                        <div className="bg-black/50 p-6 rounded-2xl flex flex-col items-center text-center border border-white/10 shadow-xl">
                                            <Video className="w-12 h-12 mb-4 text-primary" />
                                            <h3 className="text-xl font-bold mb-2">{t('cameraReady')}</h3>
                                            <p className="text-sm text-gray-400 mb-6 max-w-xs font-mono">{t('startStreamDesc')}</p>
                                            <Button variant="primary" onClick={handleStartStream} icon={<PlayCircle className="w-5 h-5 fill-current" />}>
                                                {t('startLiveStream')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* LIVE */}
                                {streamStatus === 'live' && !isOffline && (
                                    <>
                                        {feeder.streamProvider === 'agora' && feeder.streamChannel ? (
                                            <AgoraLivePlayer feederId={feeder.id} channelName={feeder.streamChannel} />
                                        ) : feeder.liveStreamUrl && getSafeYouTubeUrl(feeder.liveStreamUrl) ? (
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                src={getSafeYouTubeUrl(feeder.liveStreamUrl)}
                                                title="Live Feeder Stream"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center text-muted-foreground font-mono text-sm">
                                                <Video className="w-10 h-10 mb-2 opacity-50" />
                                                <p>Live stream signal connected</p>
                                                <p className="text-xs opacity-50 mt-1">(No Agora channel configured in backend)</p>
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2 font-bold text-sm border-2 border-black shadow-lg z-20 pointer-events-none">
                                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> {t('liveFeed')}
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 text-white z-20 pointer-events-none">
                                            <p className="font-mono text-sm flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-green-400" />
                                                {t('sensorData')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Donation panel — directly below stream */}
                        {id !== 'all' && (
                            <Card className={`relative overflow-hidden transition-all duration-500 border-2 border-foreground shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)] ${isAnimating ? 'ring-4 ring-accent scale-[1.01]' : ''}`}>
                                {isAnimating && (
                                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center z-10 backdrop-blur-md animate-in fade-in">
                                        <div className="donation-success-burst bg-white p-8 rounded-full border-4 border-accent shadow-2xl">
                                            <span className="absolute inset-0 rounded-full border-4 border-accent/40 animate-ping" />
                                            <Heart className="relative w-16 h-16 text-accent fill-accent" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-2">
                                    <h2 className="text-2xl font-black">{t('supportFeeder')}</h2>
                                    {isOffline && (
                                        <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded-lg font-mono">
                                            {t('donationsPaused')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-sm mb-6 font-mono leading-relaxed">
                                    {t('chooseModeDesc')}
                                </p>

                                <div className="grid sm:grid-cols-3 gap-2 mb-5">
                                    {[
                                        { key: 'live', label: t('modes.live'), disabled: streamStatus !== 'live' || isOffline },
                                        { key: 'feeder_pool', label: t('modes.feeder_pool'), disabled: false },
                                        { key: 'global_pool', label: t('modes.global_pool'), disabled: false },
                                    ].map(option => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            disabled={option.disabled}
                                            onClick={() => setDonationMode(option.key as typeof donationMode)}
                                            className={`px-3 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${
                                                donationMode === option.key
                                                    ? 'bg-primary text-white border-foreground shadow-[3px_3px_0px_rgba(60,50,30,0.8)]'
                                                    : 'bg-white text-foreground border-foreground/20 hover:border-primary'
                                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                <div className={`space-y-4 ${donationMode === 'live' && (isOffline || streamStatus !== 'live') ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {selectedModeLabel}
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {quickAmounts.map(amt => (
                                            <Button
                                                key={amt}
                                                variant="outline"
                                                onClick={() => handleDonate(amt)}
                                                className="donation-amount-button bg-white border-2"
                                            >
                                                {amt}€
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 w-full">
                                        <input
                                            type="number"
                                            placeholder={t('customAmount')}
                                            className="flex-1 px-4 py-3 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-0 font-mono font-bold"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                        />
                                        <Button
                                            onClick={() => handleDonate(Number(customAmount) || 1)}
                                            disabled={!customAmount}
                                            variant="accent"
                                            className="flex-shrink-0"
                                        >
                                            {t('donate')}
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-muted/30 p-4 rounded-xl border-2 border-foreground/10 text-xs font-mono text-muted-foreground mt-6">
                                    <div className="flex items-center gap-2 mb-2 text-foreground font-bold uppercase tracking-tighter">
                                        <AlertCircle className="w-4 h-4 text-primary" /> {t('impactGuarantee')}
                                    </div>
                                    <p>{t('impactDesc')}</p>
                                </div>
                            </Card>
                        )}

                        {/* All-feeder donation */}
                        {id === 'all' && (
                            <Card className={`relative overflow-hidden transition-all duration-500 border-2 border-foreground shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)] ${isAnimating ? 'ring-4 ring-accent scale-[1.01]' : ''}`}>
                                {isAnimating && (
                                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center z-10 backdrop-blur-md animate-in fade-in">
                                        <div className="donation-success-burst bg-white p-8 rounded-full border-4 border-accent shadow-2xl">
                                            <span className="absolute inset-0 rounded-full border-4 border-accent/40 animate-ping" />
                                            <Heart className="relative w-16 h-16 text-accent fill-accent" />
                                        </div>
                                    </div>
                                )}
                                <h2 className="text-2xl font-black mb-2">{t('makeDonation')}</h2>
                                <p className="text-muted-foreground text-sm mb-6 font-mono leading-relaxed">
                                    {t('globalPoolCtaDesc')}
                                </p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {[2, 5, 10].map(amt => (
                                        <Button key={amt} variant="outline" onClick={() => handleDonate(amt, 'global_pool')} className="donation-amount-button bg-white border-2">
                                            {amt}€
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-6 w-full">
                                    <input
                                        type="number"
                                        placeholder={t('customAmount')}
                                        className="flex-1 px-4 py-3 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-0 font-mono font-bold"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                    />
                                    <Button onClick={() => handleDonate(Number(customAmount) || 1, 'global_pool')} disabled={!customAmount} variant="accent" className="flex-shrink-0">
                                        {t('donate')}
                                    </Button>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-xl border-2 border-foreground/10 text-xs font-mono text-muted-foreground">
                                    <div className="flex items-center gap-2 mb-2 text-foreground font-bold uppercase tracking-tighter">
                                        <AlertCircle className="w-4 h-4 text-primary" /> {t('impactGuarantee')}
                                    </div>
                                    <p>{t('impactDesc')}</p>
                                </div>
                            </Card>
                        )}

                        {/* Recent Activity — at the very bottom of left column */}
                        <Card title={t('recentActivity')}>
                            <div className="space-y-4">
                                {donations.length > 0 ? donations.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border-2 border-foreground/10 hover:border-foreground/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20">
                                                <Heart className="w-5 h-5 text-accent" fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{t('communityMember')}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{t('dispensedFood', { amount: d.total_cost_eur ?? 0 })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="block font-black text-primary text-sm sm:text-base">+{d.total_cost_eur}€</span>
                                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono opacity-70">
                                                {new Date(d.time_of_meal || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center border-2 border-dashed border-foreground/10 rounded-xl">
                                        <p className="text-muted-foreground italic font-mono">{t('noRecentFeedings')}</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">{t('beTheFirst')}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* ── RIGHT COLUMN: Chat + extras ── */}
                    <div className="space-y-6">
                        <RealtimeChat roomId={id} currentUser={currentUser} />

                        {id !== 'all' && (
                            <div
                                className="bg-white border-2 border-foreground shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-2xl p-6 cursor-pointer hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all duration-200"
                                onClick={() => router.push('/feeder/all')}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 bg-primary rounded-lg border-2 border-foreground flex items-center justify-center flex-shrink-0">
                                        <Heart className="w-4 h-4 text-white" fill="currentColor" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('modes.global_pool')}</span>
                                </div>
                                <h3 className="text-xl font-black mb-1">{t('donateToGlobal')}</h3>
                                <p className="text-sm text-muted-foreground font-mono leading-relaxed mb-4">
                                    {t('globalPoolSidebarDesc')}
                                </p>
                                <div className="flex items-center gap-2 font-bold text-sm border-2 border-foreground w-fit px-3 py-1.5 rounded-xl bg-background hover:bg-primary hover:text-white hover:border-primary transition-colors">
                                    {t('viewGlobalPool')} <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        )}


                    </div>
                </div>
            </div>

            <DonationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                feederName={feeder?.id === 'all' ? t('globalPool') : feeder?.name || t('walletDeposit')}
                initialAmount={donationAmount}
                isDeposit={true}
                directDonation={{
                    feederId: id !== 'all' && pendingDonationMode !== 'global_pool' ? id : undefined,
                    mode: pendingDonationMode,
                    returnPath: id === 'all' ? '/feeder/all' : `/feeder/${id}`,
                }}
            />
        </div>
    );
}
