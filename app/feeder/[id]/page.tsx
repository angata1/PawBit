"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Feeder, Donation, User } from '../../types';
import { Storage } from '../../storage';
import { CURRENT_USER_KEY } from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DonationModal from '@/components/DonationModal';
import { Video, ArrowLeft, Brain, Activity, Heart, AlertCircle, CheckCircle2, MapPin, ArrowRight } from 'lucide-react';

export default function FeederDetails() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [feeder, setFeeder] = useState<Feeder | null>(null);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [streamStatus, setStreamStatus] = useState<'offline' | 'connecting' | 'live'>('offline');
    const [customAmount, setCustomAmount] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Load user from Supabase
        const supabase = createClient();
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Fetch public user data for balance
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

        // Load data
        if (id === 'all') {
            // Virtual "All Feeders" setup
            setFeeder({
                id: 'all',
                name: 'Global FoodFlow™ Network',
                location: { lat: 0, lng: 0, address: 'Connected to all 14 active stations' },
                status: 'active',
                animalsDetected: 12, // sum mock
                lastFeeding: 'Now',
                foodLevel: 82,
                liveStreamUrl: ''
            });
        } else {
            const foundFeeder = Storage.getFeeder(id || '');
            if (foundFeeder) {
                setFeeder(foundFeeder);
                // Set initial stream status based on feeder status
                setStreamStatus(foundFeeder.status === 'feeding' ? 'live' : 'offline');
            }
        }

        // Load donations for this feeder (or all)
        const allDonations = Storage.getDonations();
        if (id === 'all') {
            setDonations(allDonations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10));
        } else {
            setDonations(allDonations.filter(d => d.feederId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10));
        }
    }, [id]);

    const handleRequestStream = () => {
        setStreamStatus('connecting');
        setTimeout(() => {
            setStreamStatus('live');
        }, 2000);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [donationAmount, setDonationAmount] = useState(5);

    const handleDonate = async (amount: number) => {
        if (!currentUser) {
            router.push('/login');
            return;
        }

        // Check Local Balance first (for UX speed)
        if ((currentUser.balance || 0) < amount) {
            // Open "Add Funds" modal instead if insufficient
            setIsModalOpen(true);
            setDonationAmount(amount); // pre-fill deposit amount needed?
            return;
        }

        setIsAnimating(true);

        // Call API
        try {
            const res = await fetch('/api/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, feederId: id === 'all' ? 1 : id }) // Default to 1 if 'all' or specific
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'Insufficient funds') {
                    setIsModalOpen(true); // Prompt to top up
                } else {
                    alert(data.error);
                }
                setIsAnimating(false);
                return;
            }

            // Success
            // Update local user state
            setCurrentUser(prev => prev ? ({ ...prev, balance: data.newBalance }) : null);

            // Trigger Animation
            if (feeder) {
                const updated = { ...feeder, status: 'feeding' as const };
                setFeeder(updated);
                setStreamStatus('live');
                setTimeout(() => {
                    const reset = { ...feeder, status: 'active' as const };
                    setFeeder(reset);
                }, 10000);
            }

            // Add to donations/activity list locally
            const newDonation: Donation = {
                id: Math.random().toString(36).substr(2, 9),
                donorName: currentUser.isAnonymous ? 'Anonymous' : currentUser.name,
                donorId: currentUser.id,
                amount: amount,
                feederId: feeder?.id || '1',
                timestamp: new Date().toISOString(),
                message: 'Fed via Wallet 🪙'
            };
            setDonations(prev => [newDonation, ...prev]);

        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => setIsAnimating(false), 1000);
        }
    };

    if (!feeder) return <div className="pt-24 text-center">Loading...</div>;

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
            <div className="container mx-auto max-w-6xl">
                <button onClick={() => router.push('/map')} className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back to Map
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold">{feeder.name}</h1>
                            {feeder.status === 'active' && <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-300 animate-pulse">ONLINE</span>}
                            {feeder.status === 'feeding' && <span className="px-3 py-1 bg-accent text-white rounded-full text-xs font-bold border border-orange-300 animate-bounce">FEEDING</span>}
                        </div>
                        <p className="text-lg text-muted-foreground font-mono flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> {feeder.location.address}
                        </p>
                    </div>
                    {id !== 'all' && (
                        <div className="flex gap-4">
                            <div className="bg-white px-4 py-2 rounded-xl border-2 border-foreground text-center">
                                <span className="block text-xs font-bold uppercase text-gray-500">Food Level</span>
                                <span className="block text-xl font-black text-primary">{feeder.foodLevel}%</span>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-xl border-2 border-foreground text-center">
                                <span className="block text-xs font-bold uppercase text-gray-500">Nearby</span>
                                <span className="block text-xl font-black text-accent">{feeder.animalsDetected}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column: Media */}
                    <div className="lg:col-span-2 space-y-6">
                        {id === 'all' ? (
                            <Card className="h-[400px] flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 border-dashed">
                                <Brain className="w-24 h-24 text-primary mb-4" />
                                <h2 className="text-3xl font-bold text-center mb-2">FoodFlow™ Algorithm Active</h2>
                                <p className="text-center max-w-md text-muted-foreground">
                                    Your donation is being intelligently distributed to the 3 hungriest animals detected across our network right now.
                                </p>
                            </Card>
                        ) : (
                            <div className="relative rounded-3xl overflow-hidden border-4 border-foreground bg-black h-[400px] neu-shadow-lg">
                                {streamStatus === 'offline' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20">
                                        <Video className="w-16 h-16 text-foreground/30 mb-4" />
                                        <p className="text-foreground/50 font-mono mb-6">Live feed standby to save power</p>
                                        <Button onClick={handleRequestStream} icon={<Activity className="w-5 h-5" />}>
                                            Request Live Stream
                                        </Button>
                                    </div>
                                )}
                                {streamStatus === 'connecting' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="font-mono animate-pulse">Establishing secure IoT connection...</p>
                                    </div>
                                )}
                                {streamStatus === 'live' && (
                                    <>
                                        <img src={feeder.liveStreamUrl} className="w-full h-full object-cover opacity-90" alt="Live" />
                                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2 font-bold text-sm border border-white/50 shadow-lg">
                                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> LIVE
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                                            <p className="font-mono text-sm flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-green-400" /> Motion Detected: Cat (98% confidence)
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <Card title="Recent Activity">
                            <div className="space-y-4">
                                {donations.length > 0 ? donations.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-foreground/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent">
                                                <Heart className="w-5 h-5 text-accent" fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{d.donorName}</p>
                                                <p className="text-xs text-muted-foreground">{d.message || 'Donated food'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-primary">+{d.amount}лв</span>
                                            <span className="text-[10px] text-muted-foreground opacity-70">{new Date(d.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-muted-foreground italic py-4">Be the first to feed someone today!</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-6">
                        <Card className={`relative overflow-hidden transition-all duration-500 ${isAnimating ? 'ring-4 ring-accent scale-105' : ''}`}>
                            {isAnimating && (
                                <div className="absolute inset-0 bg-accent/10 flex items-center justify-center z-10 backdrop-blur-sm animate-in fade-in">
                                    <div className="bg-white p-6 rounded-full border-4 border-accent shadow-2xl transform animate-bounce">
                                        <Heart className="w-16 h-16 text-accent fill-accent" />
                                    </div>
                                </div>
                            )}

                            <h2 className="text-2xl font-bold mb-2">Make a Donation</h2>
                            <p className="text-muted-foreground text-sm mb-6 font-mono">
                                {id === 'all'
                                    ? "Funds are automatically split based on hunger levels."
                                    : "100% of your donation dispenses food immediately."}
                            </p>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[2, 5, 10].map(amt => (
                                    <Button
                                        key={amt}
                                        variant="outline"
                                        onClick={() => handleDonate(amt)}
                                        className="bg-white"
                                    >
                                        {amt}лв
                                    </Button>
                                ))}
                            </div>

                            <div className="flex gap-2 mb-6 w-full">
                                <input
                                    type="number"
                                    placeholder="Custom amount"
                                    className="flex-1 px-4 py-3 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-0"
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

                            <div className="bg-muted/30 p-4 rounded-xl border border-foreground/10 text-xs font-mono text-muted-foreground">
                                <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
                                    <AlertCircle className="w-4 h-4" /> Impact Guarantee
                                </div>
                                <p>We record every feeding. You will receive a 10s highlight video in your profile after donation.</p>
                            </div>
                        </Card>

                        {id !== 'all' && (
                            <div className="bg-gradient-to-r from-primary to-green-600 p-6 rounded-2xl text-white border-2 border-foreground neu-shadow relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/feeder/all')}>
                                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 opacity-90">
                                        <Brain className="w-5 h-5" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Recommended</span>
                                    </div>
                                    <h3 className="text-2xl font-black mb-1">Use FoodFlow™</h3>
                                    <p className="text-sm opacity-90 mb-4 font-mono">Let AI decide who is hungriest right now.</p>
                                    <div className="flex items-center gap-2 font-bold text-sm bg-white/20 w-fit px-3 py-1 rounded-lg backdrop-blur-md">
                                        Try it out <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="text-center text-xs text-muted-foreground font-mono">
                            <p>Feeder ID: {feeder.id}</p>
                            <p>Last Maintenance: 2 days ago</p>
                        </div>
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
