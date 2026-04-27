"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Feeder, Donation, User, deriveConnectionStatus } from '../../types';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DonationModal from '@/components/DonationModal';
import RealtimeChat from '@/components/RealtimeChat';
import { Video, ArrowLeft, Brain, Activity, Heart, AlertCircle, MapPin, ArrowRight, Loader2, WifiOff } from 'lucide-react';

export default function FeederDetails() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [feeder, setFeeder] = useState<Feeder | null>(null);
    const [donations, setDonations] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [streamStatus, setStreamStatus] = useState<'offline' | 'connecting' | 'live'>('offline');
    const [customAmount, setCustomAmount] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [donationAmount, setDonationAmount] = useState(5);

    const mapFeederRow = (f: any): Feeder => {
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
            lastFeeding: f.created_at,
            liveStreamUrl: '',
        };
    };

    const fetchData = async () => {
        const supabase = createClient();

        if (id === 'all') {
            const { data: allFeeders } = await supabase.from('feeders').select('*');
            if (allFeeders) {
                const totalAnimals = allFeeders.reduce((acc, f) => acc + (f.left_overs || 0), 0);
                const avgFood = allFeeders.length > 0
                    ? Math.round(allFeeders.reduce((acc, f) => acc + (f.stock_level || 0), 0) / allFeeders.length)
                    : 0;

                setFeeder({
                    id: 'all',
                    name: 'Global FoodFlow™ Network',
                    location: { lat: 0, lng: 0, address: `Active across ${allFeeders.length} stations` },
                    enabled: true,
                    lastSeenAt: new Date().toISOString(),
                    connectionStatus: 'online',
                    foodLevel: avgFood,
                    animalsDetected: totalAnimals,
                    liveStreamUrl: ''
                });
            }

            const { data: recentMeals } = await supabase
                .from('meals')
                .select('*')
                .order('triggered_at', { ascending: false })
                .limit(10);

            if (recentMeals) setDonations(recentMeals);
        } else {
            const { data: feederData } = await supabase
                .from('feeders')
                .select('*')
                .eq('id', id)
                .single();

            if (feederData) {
                const mapped = mapFeederRow(feederData);
                setFeeder(mapped);
                setStreamStatus(mapped.connectionStatus === 'online' ? 'live' : 'offline');
            }

            const { data: feederMeals } = await supabase
                .from('meals')
                .select('*')
                .eq('feeder_id', id)
                .order('triggered_at', { ascending: false })
                .limit(10);

            if (feederMeals) setDonations(feederMeals);
        }
        setLoading(false);
    };

    useEffect(() => {
        const supabase = createClient();
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: publicUser } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('auth_id', user.id)
                    .single();

                setCurrentUser({
                    id: user.id,
                    name: user.user_metadata?.full_name || 'User',
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

        return () => {
            supabase.removeChannel(mealsChannel);
            supabase.removeChannel(feedersChannel);
        };
    }, [id]);

    const handleDonate = async (amount: number) => {
        if (!currentUser) {
            router.push('/login');
            return;
        }

        if ((currentUser.balance || 0) < amount) {
            setIsModalOpen(true);
            setDonationAmount(amount);
            return;
        }

        setIsAnimating(true);

        try {
            const res = await fetch('/api/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, feederId: id === 'all' ? '1' : id })
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
            setStreamStatus('live');
            setTimeout(() => { setIsAnimating(false); }, 2000);

        } catch (err) {
            console.error(err);
            setIsAnimating(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="font-mono text-muted-foreground">Accessing secure IoT node...</p>
            </div>
        </div>
    );

    if (!feeder) return <div className="pt-24 text-center">Feeder not found.</div>;

    const isOffline = feeder.connectionStatus !== 'online';

    return (
        <div className="min-h-screen pt-8 pb-12 px-4 bg-background">
            <div className="container mx-auto max-w-6xl">
                <button onClick={() => router.push('/map')} className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back to Map
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold">{feeder.name}</h1>
                            {feeder.connectionStatus === 'online' ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-300 animate-pulse">ONLINE</span>
                            ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-300">OFFLINE</span>
                            )}
                        </div>
                        <p className="text-lg text-muted-foreground font-mono flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> {feeder.location.address}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white px-4 py-2 rounded-xl border-2 border-foreground text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            <span className="block text-xs font-bold uppercase text-gray-500">Food Level</span>
                            <span className="block text-xl font-black text-primary">{feeder.foodLevel}%</span>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-xl border-2 border-foreground text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            <span className="block text-xs font-bold uppercase text-gray-500">Nearby</span>
                            <span className="block text-xl font-black text-accent">{feeder.animalsDetected}</span>
                        </div>
                    </div>
                </div>

                {/* ── Main 2-col layout ── */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* ── LEFT COLUMN ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Stream / AI block */}
                        {id === 'all' ? (
                            <Card className="h-[400px] flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 border-4 border-foreground neu-shadow">
                                <Brain className="w-24 h-24 text-primary mb-4" />
                                <h2 className="text-3xl font-bold text-center mb-2">FoodFlow™ AI Active</h2>
                                <p className="text-center max-w-md text-muted-foreground font-medium px-6">
                                    Donations are intelligently distributed to the hungriest animals across our global network of IoT feeding stations.
                                </p>
                            </Card>
                        ) : (
                            <div className="relative rounded-3xl overflow-hidden border-4 border-foreground bg-black h-[420px] shadow-[8px_8px_0px_rgba(0,0,0,1)]">

                                {/* OFFLINE STATE — simple, brutalist overlay */}
                                {isOffline && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 z-10 backdrop-blur-sm">
                                        <div className="bg-card border-4 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)] p-8 rounded-2xl flex flex-col items-center text-center max-w-sm mx-4 transform -rotate-1">
                                            <WifiOff className="w-16 h-16 text-foreground mb-4" />
                                            <h2 className="text-4xl font-black uppercase text-foreground mb-2">Offline</h2>
                                            <p className="font-mono text-muted-foreground text-sm leading-relaxed">
                                                This feeder is currently unreachable. Live stream and donations are temporarily paused.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* CONNECTING */}
                                {streamStatus === 'connecting' && !isOffline && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-10">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="font-mono animate-pulse">Establishing secure IoT tunnel...</p>
                                    </div>
                                )}

                                {/* LIVE */}
                                {streamStatus === 'live' && !isOffline && (
                                    <>
                                        <img
                                            src={feeder.liveStreamUrl || `https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop`}
                                            className="w-full h-full object-cover opacity-80"
                                            alt="Live Feeder Stream"
                                        />
                                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2 font-bold text-sm border-2 border-black shadow-lg">
                                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE FEED
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 text-white">
                                            <p className="font-mono text-sm flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-green-400" />
                                                Sensor Data: {feeder.animalsDetected > 0 ? `${feeder.animalsDetected} subjects detected` : 'Monitoring area...'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Donation panel — directly below stream */}
                        {id !== 'all' && (
                            <Card className={`relative overflow-hidden transition-all duration-500 border-4 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)] ${isAnimating ? 'ring-4 ring-accent scale-[1.01]' : ''}`}>
                                {isAnimating && (
                                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center z-10 backdrop-blur-md animate-in fade-in">
                                        <div className="bg-white p-8 rounded-full border-4 border-accent shadow-2xl transform animate-bounce">
                                            <Heart className="w-16 h-16 text-accent fill-accent" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-2">
                                    <h2 className="text-2xl font-black">Make a Donation</h2>
                                    {isOffline && (
                                        <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded-lg font-mono">
                                            Donations paused — feeder offline
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-sm mb-6 font-mono leading-relaxed">
                                    100% of your donation is converted to food and dispensed immediately.
                                </p>

                                <div className={`space-y-4 ${isOffline ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[2, 5, 10].map(amt => (
                                            <Button
                                                key={amt}
                                                variant="outline"
                                                onClick={() => handleDonate(amt)}
                                                className="bg-white border-2 hover:bg-primary/5 transition-colors"
                                            >
                                                {amt}€
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 w-full">
                                        <input
                                            type="number"
                                            placeholder="Custom amount"
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
                                            Feed
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-muted/30 p-4 rounded-xl border-2 border-foreground/10 text-xs font-mono text-muted-foreground mt-6">
                                    <div className="flex items-center gap-2 mb-2 text-foreground font-bold uppercase tracking-tighter">
                                        <AlertCircle className="w-4 h-4 text-primary" /> Impact Guarantee
                                    </div>
                                    <p>We record every feeding. You can view your impact history and recorded clips in your profile.</p>
                                </div>
                            </Card>
                        )}

                        {/* All-feeder donation */}
                        {id === 'all' && (
                            <Card className={`relative overflow-hidden transition-all duration-500 border-4 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)] ${isAnimating ? 'ring-4 ring-accent scale-[1.01]' : ''}`}>
                                {isAnimating && (
                                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center z-10 backdrop-blur-md animate-in fade-in">
                                        <div className="bg-white p-8 rounded-full border-4 border-accent shadow-2xl transform animate-bounce">
                                            <Heart className="w-16 h-16 text-accent fill-accent" />
                                        </div>
                                    </div>
                                )}
                                <h2 className="text-2xl font-black mb-2">Make a Donation</h2>
                                <p className="text-muted-foreground text-sm mb-6 font-mono leading-relaxed">
                                    Funds are automatically distributed to the hungriest feeders in the network.
                                </p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {[2, 5, 10].map(amt => (
                                        <Button key={amt} variant="outline" onClick={() => handleDonate(amt)} className="bg-white border-2 hover:bg-primary/5 transition-colors">
                                            {amt}€
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-6 w-full">
                                    <input
                                        type="number"
                                        placeholder="Custom amount"
                                        className="flex-1 px-4 py-3 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-0 font-mono font-bold"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                    />
                                    <Button onClick={() => handleDonate(Number(customAmount) || 1)} disabled={!customAmount} variant="accent" className="flex-shrink-0">
                                        Feed
                                    </Button>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-xl border-2 border-foreground/10 text-xs font-mono text-muted-foreground">
                                    <div className="flex items-center gap-2 mb-2 text-foreground font-bold uppercase tracking-tighter">
                                        <AlertCircle className="w-4 h-4 text-primary" /> Impact Guarantee
                                    </div>
                                    <p>We record every feeding. You can view your impact history and recorded clips in your profile.</p>
                                </div>
                            </Card>
                        )}

                        {/* Recent Activity — at the very bottom of left column */}
                        <Card title="Recent Activity">
                            <div className="space-y-4">
                                {donations.length > 0 ? donations.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border-2 border-foreground/10 hover:border-foreground/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20">
                                                <Heart className="w-5 h-5 text-accent" fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Community Member</p>
                                                <p className="text-xs text-muted-foreground font-mono">Dispensed {d.total_cost_eur}€ worth of food</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-primary">+{d.total_cost_eur}€</span>
                                            <span className="text-[10px] text-muted-foreground font-mono opacity-70">
                                                {new Date(d.triggered_at || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center border-2 border-dashed border-foreground/10 rounded-xl">
                                        <p className="text-muted-foreground italic font-mono">No recent feedings recorded.</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">Be the first to fuel this station!</p>
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
                                className="bg-gradient-to-br from-primary to-green-600 p-8 rounded-2xl text-white border-4 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)] relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
                                onClick={() => router.push('/feeder/all')}
                            >
                                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 opacity-90">
                                        <Brain className="w-6 h-6" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Recommended Path</span>
                                    </div>
                                    <h3 className="text-3xl font-black mb-2">Use FoodFlow™</h3>
                                    <p className="text-sm opacity-90 mb-6 font-mono leading-relaxed">Let our AI system determine which animals need your help the most right now.</p>
                                    <div className="flex items-center gap-2 font-bold text-sm bg-white/20 w-fit px-4 py-2 rounded-xl backdrop-blur-md border border-white/30 group-hover:bg-white/30 transition-colors">
                                        Switch to AI Flow <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        )}


                    </div>
                </div>
            </div>

            <DonationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                feederName="Wallet Deposit"
                initialAmount={donationAmount}
                isDeposit={true}
            />
        </div>
    );
}
