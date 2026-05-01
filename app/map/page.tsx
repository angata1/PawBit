'use client';

import React, { useState, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useRouter } from 'next/navigation';
import { Feeder, deriveConnectionStatus, formatLastSeen } from '../types';
import Button from '../components/Button';
import { createClient } from '@/lib/supabase/client';
import { Search, Battery, Brain, ArrowRight, List, Map as MapIcon, MapPin, Loader2 } from 'lucide-react';

export default function MapPage() {
    const navigate = useRouter();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    const [feeders, setFeeders] = useState<Feeder[]>([]);
    const [selectedFeederId, setSelectedFeederId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingFeeders, setLoadingFeeders] = useState(true);

    // Mobile View State: 'map' or 'list' (Only applies to screens < md)
    const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

    // Map Supabase row to Feeder type
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
            foodLevel: f.stock_level ?? 50,
            animalsDetected: f.left_overs ?? 0,
            dispensePriceEur: Number(f.dispense_price_eur ?? 2),
            lastFeeding: f.created_at,
            liveStreamUrl: '',
        };
    };

    // Fetch feeders from Supabase
    useEffect(() => {
        const fetchFeeders = async () => {
            setLoadingFeeders(true);
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('feeders')
                    .select('*');

                if (error) throw error;

                if (data && data.length > 0) {
                    setFeeders(data.map(mapFeederRow));
                } else {
                    // Fallback to mock data if table is empty
                    const { Storage } = await import('../storage');
                    setFeeders(Storage.getFeeders());
                }
            } catch (err) {
                console.warn('Failed to load feeders from Supabase, using mock data:', err);
                const { Storage } = await import('../storage');
                setFeeders(Storage.getFeeders());
            } finally {
                setLoadingFeeders(false);
            }
        };
        fetchFeeders();

        const supabaseClient = createClient();
        const subscription = supabaseClient.channel('feeders-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'feeders' }, (payload) => {
                fetchFeeders(); 
            })
            .subscribe();

        return () => {
            supabaseClient.removeChannel(subscription);
        };
    }, []);

    const filteredFeeders = feeders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.location.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Initialize Map
    useEffect(() => {
        // Ensure L is available from the global window object
        const L = (window as any).L;

        if (!mapContainerRef.current || !L) return;
        if (mapInstanceRef.current) return;

        const sofiaLat = 42.6977;
        const sofiaLng = 23.3219;

        const map = L.map(mapContainerRef.current).setView([sofiaLat, sofiaLng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        // Force a resize check after mount to prevent grey tiles
        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update Markers
    useEffect(() => {
        const L = (window as any).L;
        if (!mapInstanceRef.current || !L) return;

        // Clear existing markers
        mapInstanceRef.current.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
                mapInstanceRef.current.removeLayer(layer);
            }
        });

        feeders.forEach(feeder => {
            const iconHtml = `
        <div class="w-10 h-10 bg-primary rounded-full border-2 border-foreground flex items-center justify-center shadow-lg relative hover:scale-110 transition-transform cursor-pointer">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;

            const icon = L.divIcon({
                html: iconHtml,
                className: 'bg-transparent border-none',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });

            const marker = L.marker([feeder.location.lat, feeder.location.lng], { icon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`
          <div class="p-0 font-sans text-foreground min-w-[220px]">
            <div class="bg-primary/10 p-3 border-b-2 border-foreground/10">
              <h3 class="font-bold text-lg leading-tight">${feeder.name}</h3>
              <p class="text-xs opacity-70 mt-1 truncate">${feeder.location.address}</p>
            </div>
            <div class="p-3">
               <div class="flex justify-between items-center mb-3 text-xs font-mono font-bold">
                   <span class="px-2 py-1 rounded ${
                       feeder.connectionStatus === 'online' ? 'text-green-700 bg-green-100' :
                       feeder.connectionStatus === 'offline' ? 'text-red-700 bg-red-100' :
                       'text-gray-700 bg-gray-100'
                   }">${feeder.connectionStatus.replace('_', ' ').toUpperCase()}</span>
                   <span class="text-yellow-700 bg-yellow-100 px-2 py-1 rounded">${feeder.foodLevel}% FOOD</span>
               </div>
               ${renderToStaticMarkup(
                    <Button
                        id={`btn-${feeder.id}`}
                        className="w-full pointer-events-auto"
                        variant="primary"
                    >
                        FEED NOW
                    </Button>
                )}
            </div>
          </div>
        `, {
                    closeButton: false,
                    className: 'custom-popup'
                });

            marker.on('popupopen', () => {
                const btn = document.getElementById(`btn-${feeder.id}`);
                if (btn) {
                    btn.onclick = () => navigate.push(`/feeder/${feeder.id}`);
                }
            });
        });
    }, [feeders, navigate]);

    // Resize map when view changes (important for mobile toggle)
    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
        }
    }, [mobileView]);

    const flyToFeeder = (feeder: Feeder) => {
        setSelectedFeederId(feeder.id);
        setMobileView('map'); // Switch to map on mobile
        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([feeder.location.lat, feeder.location.lng], 16);
        }
    };

    return (
        <div className="h-[calc(100dvh-74px)] md:h-[calc(100vh-74px)] pt-0 bg-background overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar - List View */}
            <div className={`
        bg-card border-r-2 border-foreground flex flex-col z-[60] md:z-20 shadow-2xl flex-shrink-0
        w-full md:w-96 h-full absolute md:relative top-0 left-0 transition-transform duration-300
        ${mobileView === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="p-6 border-b-2 border-foreground bg-white z-10">
                    <h1 className="text-2xl font-bold mb-4 font-serif">Find a Hungry Pal</h1>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search park or street..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                    </div>

                    <Button
                        onClick={() => navigate.push('/feeder/all')}
                        className="w-full flex justify-between items-center bg-accent text-accent-foreground border-accent-foreground"
                        size="md"
                    >
                        <span className="flex items-center gap-2"><Brain className="w-5 h-5" /> Donation Pool</span>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 md:pb-4 bg-gray-50">
                    {loadingFeeders ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm font-mono text-muted-foreground">Loading feeders...</p>
                        </div>
                    ) : null}
                    {!loadingFeeders && filteredFeeders.map(feeder => (
                        <div
                            key={feeder.id}
                            onClick={() => flyToFeeder(feeder)}
                            className={`
                cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 relative
                ${selectedFeederId === feeder.id
                                    ? 'bg-white border-primary ring-2 ring-primary/20 shadow-md'
                                    : 'bg-white border-foreground/10 hover:border-primary hover:shadow-md'}
              `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-lg text-foreground">{feeder.name}</h3>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                    feeder.connectionStatus === 'online' ? 'bg-green-100 text-green-700 border-green-200' :
                                    feeder.connectionStatus === 'offline' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        feeder.connectionStatus === 'online' ? 'bg-green-500 animate-pulse' :
                                        feeder.connectionStatus === 'offline' ? 'bg-red-500' :
                                        'bg-gray-400'
                                    }`}></span>
                                    {feeder.connectionStatus.replace('_', ' ')}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4 truncate font-mono">{feeder.location.address}</p>

                            <div className="flex items-center gap-4 text-xs font-bold opacity-80">
                                <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded"><Battery className="w-3 h-3" /> {feeder.foodLevel}% Food</span>
                            </div>

                            <ArrowRight className="absolute right-4 bottom-4 w-5 h-5 text-gray-300" />
                        </div>
                    ))}

                    {filteredFeeders.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <MapPin className="w-12 h-12 mx-auto mb-2" />
                            <p>No feeders found here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative bg-gray-100 h-full w-full">
                <div id="map" ref={mapContainerRef} className="w-full h-full z-0 outline-none"></div>

                {/* Desktop Legend */}
                <div className="hidden md:block absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-3 rounded-xl border-2 border-foreground z-[400] text-xs font-mono shadow-xl">
                    <h4 className="font-bold mb-2 border-b border-gray-200 pb-1">Feeder Status</h4>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-3 h-3 bg-primary rounded-full border border-foreground"></span>
                        <span>Online</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-3 h-3 bg-red-500 rounded-full border border-foreground"></span>
                        <span>Offline</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-400 rounded-full border border-foreground"></span>
                        <span>Disabled</span>
                    </div>
                </div>

                {/* Mobile Toggle Button (Floating) */}
                <div className="md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 shadow-2xl mb-safe">
                    <Button
                        onClick={() => setMobileView('list')}
                        className={`rounded-l-full rounded-r-none border-r-0 ${mobileView === 'list' ? '' : 'bg-white'}`}
                        variant={mobileView === 'list' ? 'primary' : 'outline'}
                        icon={<List className="w-4 h-4" />}
                    >
                        List
                    </Button>
                    <Button
                        onClick={() => setMobileView('map')}
                        className={`rounded-r-full rounded-l-none ${mobileView === 'map' ? '' : 'bg-white'}`}
                        variant={mobileView === 'map' ? 'primary' : 'outline'}
                        icon={<MapIcon className="w-4 h-4" />}
                    >
                        Map
                    </Button>
                </div>
            </div>
        </div>
    );
};
