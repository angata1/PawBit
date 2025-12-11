'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import { Search, MapPin, Calendar, Heart, Filter, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { Storage } from '../storage';

const MOCK_FEEDERS = Storage.getFeeders();

const MOCK_VIDEOS = Array.from({ length: 45 }).map((_, i) => {
    const feeder = MOCK_FEEDERS[i % MOCK_FEEDERS.length];
    return {
        id: `v${i}`,
        youtubeId: i % 2 === 0 ? '_QRi0EAiAUU' : '87nz_q_JluM',
        title: `Lunch time at ${feeder.name}`,
        feederId: feeder.id,
        feederName: feeder.name,
        location: feeder.location.address,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        donors: [
            { name: i % 3 === 0 ? 'Elena Petrova' : 'Anonymous', amount: 10 + (i % 5) * 5 },
            { name: 'Community Pool', amount: 5 },
            ...(i % 4 === 0 ? [{ name: 'Maria S.', amount: 20 }] : [])
        ],
        description: "The food was dispensed successfully. 3 cats were spotted enjoying the meal. Thank you to our donors for making this possible!"
    };
});

const ITEMS_PER_PAGE = 10;

const Feedings: React.FC = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocation, setSelectedLocation] = useState<string>('all');

    // Filter Logic
    const filteredVideos = useMemo(() => {
        return MOCK_VIDEOS.filter(video => {
            const matchesSearch =
                video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                video.donors.some(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesLocation = selectedLocation === 'all' || video.feederId === selectedLocation;

            return matchesSearch && matchesLocation;
        });
    }, [searchQuery, selectedLocation]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE);
    const currentVideos = filteredVideos.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const locations = Array.from(new Set(MOCK_VIDEOS.map(v => JSON.stringify({ id: v.feederId, name: v.feederName }))))
        .map(s => JSON.parse(s));

    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-background container mx-auto max-w-6xl">

            {/* Header Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-black mb-4 text-foreground font-serif">
                    Feeding Moments
                </h1>
                <p className="text-xl text-muted-foreground font-mono max-w-2xl mx-auto">
                    Relive the joy. See the impact of every donation made by our community.
                </p>
            </div>

            {/* Controls */}
            <Card className="mb-8 bg-white sticky top-20 z-30 shadow-xl border-2 border-foreground">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search donor, feeder..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono text-sm"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                    </div>

                    {/* Filter */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <button
                            onClick={() => setSelectedLocation('all')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border-2 ${selectedLocation === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-foreground/10 hover:border-primary'}`}
                        >
                            All Locations
                        </button>
                        {locations.map((loc: { id: string, name: string }) => (
                            <button
                                key={loc.id}
                                onClick={() => { setSelectedLocation(loc.id); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border-2 ${selectedLocation === loc.id ? 'bg-primary text-white border-primary' : 'bg-white border-foreground/10 hover:border-primary'}`}
                            >
                                {loc.name}
                            </button>
                        ))}
                    </div>

                </div>
            </Card>

            {/* Video List */}
            <div className="space-y-8">
                {currentVideos.length > 0 ? (
                    currentVideos.map((video) => (
                        <div key={video.id} className="bg-white rounded-3xl overflow-hidden border-2 border-foreground neu-shadow hover:neu-shadow-lg transition-all duration-300">
                            <div className="flex flex-col lg:flex-row">

                                {/* Video Side */}
                                <div className="lg:w-7/12 bg-black relative group aspect-video lg:aspect-auto">
                                    <iframe
                                        className="w-full h-full absolute inset-0"
                                        src={`https://www.youtube.com/embed/${video.youtubeId}`}
                                        title={video.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>

                                {/* Details Side */}
                                <div className="lg:w-5/12 p-6 md:p-8 flex flex-col justify-between bg-card">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-3 py-1 rounded-lg text-xs font-bold border border-accent/50 uppercase tracking-wider">
                                                <PlayCircle className="w-3 h-3" /> Recorded Feed
                                            </span>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {new Date(video.timestamp).toLocaleDateString()} • {new Date(video.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl font-bold mb-2 font-serif">{video.title}</h3>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-mono">
                                            <MapPin className="w-4 h-4" />
                                            {video.location}
                                        </div>

                                        <div className="bg-white/50 rounded-xl p-4 border-2 border-foreground/5 mb-6">
                                            <h4 className="font-bold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-primary" fill="currentColor" /> Made Possible By
                                            </h4>
                                            <div className="space-y-2">
                                                {video.donors.map((donor, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <span className="font-bold text-foreground">{donor.name}</span>
                                                        <span className="font-mono bg-green-100 text-green-800 px-2 rounded text-xs border border-green-200">
                                                            {donor.amount}лв
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-foreground/10 text-xs italic text-muted-foreground">
                                                "{video.description}"
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <Button
                                            onClick={() => router.push(`/feeder/${video.feederId}`)}
                                            className="w-full"
                                            size="lg"
                                        >
                                            Feed Here Again
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-foreground/20">
                        <h3 className="text-xl font-bold text-muted-foreground">No moments found matching your search.</h3>
                        <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setSelectedLocation('all'); }}>
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {filteredVideos.length > 0 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                    <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        icon={<ChevronLeft className="w-5 h-5" />}
                    >
                        Prev
                    </Button>

                    <div className="font-mono font-bold text-lg">
                        Page {currentPage} of {totalPages}
                    </div>

                    <Button
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                    >
                        Next <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            )}

        </div>
    );
};

export default Feedings;
