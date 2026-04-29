'use client';

import React, { useRef } from 'react';
import {
    Heart, Video, MapPinned, Gift, Activity,
    ChevronRight, PlayCircle, Clock, MapPin
} from 'lucide-react';
import Button from './Button';
import Card from './Card';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Storage } from '../storage';

const FEEDERS = Storage.getFeeders();
const RECENT_MOMENTS = [
    {
        id: 'v1',
        youtubeId: '8S2yS0pM_4U',
        title: 'Lunch time at Central Park Feeder',
        location: 'Central Park, Sofia',
        timestamp: new Date().toISOString(),
    },
    {
        id: 'v2',
        youtubeId: 'h15G27f-Jz0',
        title: 'Afternoon snack at Vitosha Blvd',
        location: 'Vitosha Blvd, Sofia',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'v3',
        youtubeId: 'S-u87C3u_Ew',
        title: 'Dinner at NDK Park Unit',
        location: 'National Palace of Culture',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
    }
];

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function HomeContent() {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Hero text — bouncy cascade
        gsap.from(".hero-text-element", {
            y: 80,
            opacity: 0,
            duration: 1.2,
            stagger: 0.18,
            ease: "elastic.out(1, 0.5)",
            delay: 0.15
        });

        // Hero background image — gentle scale-in
        gsap.from(".hero-bg-img", {
            opacity: 0,
            scale: 1.08,
            duration: 2.2,
            ease: "power2.out",
        });

        // Feature cards — springy pop-up
        gsap.fromTo(".feature-card",
            { y: 120, opacity: 0, scale: 0.85 },
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.9,
                stagger: 0.15,
                ease: "back.out(2.5)",
                scrollTrigger: {
                    trigger: ".feature-cards-container",
                    start: "top 80%",
                    // Removed: markers: true
                    // Removed: toggleActions reverse — use default "play none none none"
                },
            }
        );

        // Feature icons — merged into the same ScrollTrigger as cards
        // using a timeline so icons spin in slightly after their card appears
        ScrollTrigger.create({
            trigger: ".feature-cards-container",
            start: "top 80%",
            once: true,
            onEnter: () => {
                gsap.fromTo(".feature-icon",
                    { rotation: -180, scale: 0 },
                    {
                        rotation: 0,
                        scale: 1,
                        duration: 0.8,
                        stagger: 0.15,
                        ease: "back.out(3)",
                        delay: 0.3,
                    }
                );
            }
        });

        // Moments section heading
        gsap.fromTo(".moments-heading",
            { x: -60, opacity: 0 },
            {
                x: 0,
                opacity: 1,
                duration: 1,
                ease: "elastic.out(1, 0.6)",
                scrollTrigger: {
                    trigger: ".moments-section",
                    start: "top 80%",
                },
            }
        );

        // Moment cards — staggered bounce from bottom
        gsap.fromTo(".moment-card",
            { y: 100, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.12,
                ease: "back.out(1.8)",
                scrollTrigger: {
                    trigger: ".moments-section",
                    start: "top 75%",
                },
            }
        );

        // CTA section
        gsap.fromTo(".cta-content",
            { y: 60, opacity: 0, scale: 0.95 },
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 1,
                ease: "back.out(1.5)",
                scrollTrigger: {
                    trigger: ".cta-section",
                    start: "top 80%",
                },
            }
        );

        // Stat counters — pop
        gsap.fromTo(".stat-item",
            { scale: 0, opacity: 0 },
            {
                scale: 1,
                opacity: 1,
                duration: 0.7,
                stagger: 0.12,
                ease: "elastic.out(1, 0.5)",
                scrollTrigger: {
                    trigger: ".cta-section",
                    start: "top 70%",
                },
            }
        );

        // Scroll indicator — floating & fade in
        gsap.fromTo(".scroll-indicator",
            { y: 20, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                delay: 1.5,
                ease: "power3.out"
            }
        );

        gsap.to(".scroll-indicator-icon", {
            y: 8,
            repeat: -1,
            yoyo: true,
            duration: 2,
            ease: "sine.inOut"
        });

    }, { scope: container });

    return (
        <div className="w-full" ref={container}>
            {/* ========== HERO ========== */}
            <section className="min-h-[92svh] md:min-h-[92vh] flex flex-col items-center justify-center relative overflow-hidden px-4">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <Image
                        src="/hero-cat.png"
                        alt=""
                        fill
                        className="hero-bg-img object-cover object-center opacity-[0.2]"
                        priority
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--background)_80%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="container mx-auto flex flex-col items-center text-center z-10 max-w-4xl space-y-8">
                    <h1 className="hero-text-element text-6xl md:text-8xl font-black leading-[1.1] text-foreground">
                        Feed a Pet. <br />
                        <span className="text-primary italic">In Real Time.</span>
                    </h1>

                    <p className="hero-text-element text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                        PawBit connects your clicks to real kibble. Watch live as you donate to stray animals across your city.
                    </p>

                    <div className="hero-text-element flex flex-col sm:flex-row items-center gap-4">
                        <Button href="/map" variant="primary" size="lg" icon={<Heart className="w-6 h-6 fill-current" />}>
                            Feed Now
                        </Button>
                        <Button href="/leaderboard" variant="outline" size="lg" icon={<Activity className="w-6 h-6" />}>
                            View Impact
                        </Button>
                    </div>
                </div>

                {/* ── Scroll indicator ── */}
                <div className="scroll-indicator absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-2 z-10 pointer-events-none select-none opacity-0 mb-safe">
                    <span className="text-[9px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 md:text-foreground/60 mb-1 md:mb-2">Scroll</span>
                    <div className="scroll-indicator-icon relative flex items-center justify-center">
                        <div className="absolute w-12 h-12 md:w-20 md:h-20 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                        <Image
                            src="/scroll.svg"
                            alt="Scroll Down"
                            width={64}
                            height={64}
                            className="w-10 h-10 md:w-16 md:h-16 relative z-10 drop-shadow-lg md:drop-shadow-xl opacity-100"
                        />
                    </div>
                </div>
            </section>

            {/* ========== HOW IT WORKS ========== */}
            <section className="feature-cards-container py-24 bg-primary/5 relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="how-heading text-center mb-16">
                        <h2 className="text-5xl font-bold mb-4">How It Works</h2>
                        <div className="w-24 h-2 bg-accent mx-auto rounded-full" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="feature-card">
                            <Card hoverEffect className="text-center h-full" title="1. Find a Feeder">
                                <div className="feature-icon bg-secondary/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 border-secondary">
                                    <MapPinned className="w-10 h-10 text-secondary-foreground" />
                                </div>
                                <p className="text-lg">
                                    Use our interactive map to locate PawBit feeders in parks and shelters near you.
                                </p>
                            </Card>
                        </div>

                        <div className="feature-card">
                            <Card hoverEffect className="text-center h-full" title="2. Donate & Dispense">
                                <div className="feature-icon bg-primary/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 border-primary">
                                    <Gift className="w-10 h-10 text-primary-foreground" style={{ color: 'var(--primary-dark)' }} />
                                </div>
                                <p className="text-lg">
                                    Send a donation. The feeder instantly dispenses food while the camera records.
                                </p>
                            </Card>
                        </div>

                        <div className="feature-card">
                            <Card hoverEffect className="text-center h-full" title="3. Watch Live">
                                <div className="feature-icon bg-accent/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 border-accent">
                                    <Video className="w-10 h-10 text-accent-foreground" />
                                </div>
                                <p className="text-lg">
                                    See the joy immediately via live stream. Receive a clip of your impact.
                                </p>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========== RECENT MOMENTS ========== */}
            <section className="moments-section py-24 bg-background relative overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div className="moments-heading max-w-2xl">
                            <h2 className="text-5xl font-black mb-4">
                                Moments of <span className="text-primary italic">Joy</span>
                            </h2>
                            <p className="text-xl text-muted-foreground font-medium">
                                See the direct impact of our community. Every donation creates a memory.
                            </p>
                        </div>
                        <Button href="/feedings" variant="outline" icon={<ChevronRight className="w-4 h-4" />}>
                            View Full Gallery
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {RECENT_MOMENTS.map((moment) => (
                            <div key={moment.id} className="moment-card group relative bg-white rounded-3xl overflow-hidden border-2 border-foreground neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="aspect-video bg-black relative overflow-hidden">
                                    <img
                                        className="w-full h-full absolute inset-0 object-cover"
                                        src={`https://img.youtube.com/vi/${moment.youtubeId}/hqdefault.jpg`}
                                        alt={moment.title}
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                                    <div className="absolute bottom-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                        <PlayCircle className="w-3 h-3 fill-current" /> REPLAY
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                        {moment.title}
                                    </h3>
                                    <div className="flex flex-col gap-2 text-sm text-muted-foreground font-mono">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> {moment.location}
                                        </div>
                                        <div className="flex items-center gap-2" suppressHydrationWarning>
                                            <Clock className="w-4 h-4" /> {new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                <a href="/feedings" className="absolute inset-0 z-20 focus:outline-none">
                                    <span className="sr-only">View details for {moment.title}</span>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== CTA ========== */}
            <section className="cta-section py-24 bg-card px-4">
                <div className="cta-content container mx-auto bg-foreground text-background rounded-3xl p-8 md:p-16 relative overflow-hidden neu-shadow-lg">
                    <div className="relative z-10 flex flex-col items-center text-center gap-8">
                        <Image
                            src="/logo.svg"
                            alt="PawBit Logo"
                            width={48}
                            height={48}
                            className="object-contain"
                        />

                        <h2 className="text-4xl md:text-5xl font-bold text-primary max-w-2xl leading-tight">
                            Not sure who to feed?
                        </h2>

                        <p className="text-xl md:text-2xl max-w-2xl opacity-90 leading-relaxed">
                            Donate to the pool and our system distributes food where it&apos;s needed most — based on hunger levels, animal presence, and time since last meal.
                        </p>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-10 my-4">
                            <div className="stat-item text-center">
                                <div className="text-3xl md:text-4xl font-black text-accent">{FEEDERS.length}+</div>
                                <div className="text-sm opacity-70 mt-1">Active Feeders</div>
                            </div>
                            <div className="stat-item text-center">
                                <div className="text-3xl md:text-4xl font-black text-primary">24/7</div>
                                <div className="text-sm opacity-70 mt-1">Always On</div>
                            </div>
                            <div className="stat-item text-center">
                                <div className="text-3xl md:text-4xl font-black text-accent">100%</div>
                                <div className="text-sm opacity-70 mt-1">Goes to Animals</div>
                            </div>
                        </div>

                        <Button variant="accent" size="lg" href="/feeder/all" icon={<Heart className="w-6 h-6 fill-current" />}>
                            Donate to Pool
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}