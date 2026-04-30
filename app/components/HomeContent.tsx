'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
    Heart, Video, MapPinned, Gift, Activity,
    ChevronRight, PlayCircle, Clock, MapPin
} from 'lucide-react';
import Button from './Button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Storage } from '../storage';
import { createClient } from '@/lib/supabase/client';
import { GridPattern } from './GridPattern';
import { cn } from '@/lib/utils';

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
    const router = useRouter();
    const [activeFeeders, setActiveFeeders] = useState<number>(3);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        const fetchStats = async () => {
            const { count } = await supabase.from('feeders').select('*', { count: 'exact', head: true }).eq('enabled', true);
            if (count !== null) setActiveFeeders(count);
        };
        fetchStats();

        // Check mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleNavigate = (href: string) => {
        setIsTransitioning(true);
        setTimeout(() => {
            router.push(href);
        }, 300);
    };

    useGSAP(() => {
        // Kill all ScrollTriggers on cleanup
        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    useGSAP(() => {
        const mm = gsap.matchMedia();

        // Desktop animations
        mm.add("(min-width: 768px)", () => {
            // Hero text — parallax scroll effect
            gsap.fromTo(".hero-text-element", {
                y: 80,
                opacity: 0,
            }, {
                y: 0,
                opacity: 1,
                duration: 1.2,
                stagger: 0.18,
                ease: "elastic.out(1, 0.5)",
                delay: 0.15
            });

            // Hero elements parallax on scroll
            gsap.to(".hero-content-wrapper", {
                y: -100,
                opacity: 0,
                ease: "power2.inOut",
                scrollTrigger: {
                    trigger: ".hero-section",
                    start: "top top",
                    end: "bottom top",
                    scrub: 1,
                }
            });

            // Hero background parallax
            gsap.to(".hero-bg-img", {
                y: 100,
                scale: 1.15,
                ease: "none",
                scrollTrigger: {
                    trigger: ".hero-section",
                    start: "top top",
                    end: "bottom top",
                    scrub: 1,
                }
            });

            // Feature cards — scroll-driven reveal
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
                        end: "top 30%",
                        toggleActions: "play none none reverse",
                    }
                }
            );

            // Feature icons rotation tied to scroll
            gsap.fromTo(".feature-icon",
                { rotation: -180, scale: 0 },
                {
                    rotation: 0,
                    scale: 1,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: "back.out(3)",
                    scrollTrigger: {
                        trigger: ".feature-cards-container",
                        start: "top 70%",
                        end: "top 30%",
                        toggleActions: "play none none reverse",
                    }
                }
            );

            // Feature section parallax
            gsap.to(".feature-background-pattern", {
                y: -50,
                ease: "none",
                scrollTrigger: {
                    trigger: ".feature-cards-container",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.5,
                }
            });

            // Moments heading — slide in and parallax
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
                        end: "top 40%",
                        toggleActions: "play none none reverse",
                    }
                }
            );

            // Moment cards — staggered with scroll smoothing
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
                        end: "top 35%",
                        toggleActions: "play none none reverse",
                    }
                }
            );

            // CTA section — scale and reveal on scroll
            gsap.fromTo(".cta-content",
                { y: 60, opacity: 0, scale: 0.95 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: ".cta-section",
                        start: "top 80%",
                        end: "top 40%",
                        toggleActions: "play none none reverse",
                    }
                }
            );

            // Stats — pop with scroll
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
                        end: "top 30%",
                        toggleActions: "play none none reverse",
                    }
                }
            );

            // CTA background pattern parallax
            gsap.to(".cta-background-pattern", {
                y: -30,
                ease: "none",
                scrollTrigger: {
                    trigger: ".cta-section",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.5,
                }
            });
        });

        // Mobile animations (simplified, lighter)
        mm.add("(max-width: 767px)", () => {
            // Simplified hero animations
            gsap.fromTo(".hero-text-element", {
                y: 30,
                opacity: 0,
            }, {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.1,
                ease: "power2.out",
                delay: 0.1
            });

            // Feature cards - simple fade up
            gsap.fromTo(".feature-card",
                { y: 60, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".feature-cards-container",
                        start: "top 85%",
                    }
                }
            );

            // Moments - simple animations
            gsap.fromTo(".moments-heading",
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.6,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".moments-section",
                        start: "top 85%",
                    }
                }
            );

            gsap.fromTo(".moment-card",
                { y: 60, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.08,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".moments-section",
                        start: "top 80%",
                    }
                }
            );

            // CTA - simple reveal
            gsap.fromTo(".cta-content",
                { y: 40, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".cta-section",
                        start: "top 85%",
                    }
                }
            );

            gsap.fromTo(".stat-item",
                { scale: 0.9, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".cta-section",
                        start: "top 80%",
                    }
                }
            );
        });

        // Universal animations (work on both mobile and desktop)
        // Hero background image — gentle scale-in
        gsap.from(".hero-bg-img", {
            opacity: 0,
            scale: 1.08,
            duration: 2.2,
            ease: "power2.out",
        });

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
        <>
            {/* Page transition overlay */}
            <div
                className={`fixed inset-0 bg-background z-50 transition-opacity duration-300 pointer-events-none ${isTransitioning ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            <div className={`w-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`} ref={container}>
                {/* ========== HERO ========== */}
                <section className="hero-section min-h-[92svh] md:min-h-[92vh] flex flex-col items-center justify-center relative overflow-hidden px-4">
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
                        <GridPattern
                            width={60}
                            height={60}
                            className={cn(
                                "absolute inset-0 opacity-30",
                                "[mask-image:radial-gradient(900px_circle_at_center,white_40%,transparent_70%)]"
                            )}
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
                    </div>

                    <div className="hero-content-wrapper container mx-auto flex flex-col items-center text-center z-10 max-w-4xl space-y-6 md:space-y-8">
                        <h1 className="hero-text-element text-5xl sm:text-6xl md:text-8xl font-black leading-[1.1] text-foreground">
                            Feed a Pet. <br />
                            <span className="text-primary italic">In Real Time.</span>
                        </h1>

                        <p className="hero-text-element text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                            PawBit connects your clicks to real kibble. Watch live as you donate to stray animals across your city.
                        </p>

                        <div className="hero-text-element flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                            <Button href="/map" variant="primary" size="lg" icon={<Heart className="w-5 h-5 md:w-6 md:h-6 fill-current" />} onClick={(e) => { e.preventDefault(); handleNavigate('/map'); }}>
                                Feed Now
                            </Button>
                            <Button href="/leaderboard" variant="outline" size="lg" icon={<Activity className="w-5 h-5 md:w-6 md:h-6" />} onClick={(e) => { e.preventDefault(); handleNavigate('/leaderboard'); }}>
                                View Impact
                            </Button>
                        </div>


                    </div>

                    {/* ── Scroll indicator ── */}
                    <div className="scroll-indicator absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10 pointer-events-none select-none opacity-0">
                        <span className="text-[9px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 md:text-foreground/60 mb-1">Scroll</span>
                        <div className="scroll-indicator-icon relative flex items-center justify-center">
                            <Image
                                src="/scroll.svg"
                                alt="Scroll Down"
                                width={40}
                                height={40}
                                className="w-8 h-8 md:w-14 md:h-14 relative z-10"
                            />
                        </div>
                    </div>
                </section>

                {/* ========== HOW IT WORKS ========== */}
                <section className="feature-cards-container py-16 md:py-24 bg-background relative overflow-hidden">
                    <div className="feature-background-pattern">
                        <GridPattern
                            width={60}
                            height={60}
                            className={cn(
                                "absolute inset-0 opacity-30",
                                "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
                            )}
                        />
                    </div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-4xl md:text-5xl font-black mb-4">How It Works</h2>
                            <div className="w-24 h-2 bg-accent mx-auto rounded-full" />
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {/* Step 1 */}
                            <div className="feature-card bg-white border-2 border-foreground rounded-3xl p-6 md:p-8 neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-primary/20">01</span>
                                    <Gift className="feature-icon w-8 h-8 md:w-10 md:h-10 text-primary" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">Fuel the Pool</h3>
                                <p className="text-muted-foreground text-base md:text-lg">
                                    Top up your wallet and contribute to the Global Pool. Your funds wait securely until a hungry animal arrives.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="feature-card bg-white border-2 border-foreground rounded-3xl p-6 md:p-8 neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-primary/20">02</span>
                                    <Activity className="feature-icon w-8 h-8 md:w-10 md:h-10 text-primary" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">AI-Powered Feeding</h3>
                                <p className="text-muted-foreground text-base md:text-lg">
                                    Our edge devices detect cats autonomously and dispense meals using the oldest funds in the pool.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="feature-card bg-white border-2 border-foreground rounded-3xl p-6 md:p-8 neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-primary/20">03</span>
                                    <Video className="feature-icon w-8 h-8 md:w-10 md:h-10 text-primary" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">See Your Impact</h3>
                                <p className="text-muted-foreground text-base md:text-lg">
                                    Complete transparency! Watch the recorded video of the exact meal your donation funded.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========== RECENT MOMENTS ========== */}
                <section className="moments-section py-16 md:py-24 bg-background relative overflow-hidden">
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-12 gap-6">
                            <div className="moments-heading max-w-2xl">
                                <h2 className="text-4xl md:text-5xl font-black mb-3 md:mb-4">
                                    Moments of <span className="text-primary italic">Joy</span>
                                </h2>
                                <p className="text-lg md:text-xl text-muted-foreground font-medium">
                                    See the direct impact of our community. Every donation creates a memory.
                                </p>
                            </div>
                            <Button href="/feedings" variant="outline" icon={<ChevronRight className="w-4 h-4" />} onClick={(e) => { e.preventDefault(); handleNavigate('/feedings'); }}>
                                View Full Gallery
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {RECENT_MOMENTS.map((moment) => (
                                <div key={moment.id} className="moment-card group relative bg-white rounded-3xl overflow-hidden border-2 border-foreground neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                    <div className="aspect-video bg-black relative overflow-hidden">
                                        <img
                                            className="w-full h-full absolute inset-0 object-cover"
                                            src={`https://img.youtube.com/vi/${moment.youtubeId}/hqdefault.jpg`}
                                            alt={moment.title}
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                                        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                            <PlayCircle className="w-3 h-3 fill-current" /> REPLAY
                                        </div>
                                    </div>

                                    <div className="p-4 md:p-6">
                                        <h3 className="font-bold text-base md:text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                            {moment.title}
                                        </h3>
                                        <div className="flex flex-col gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground font-mono">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" /> {moment.location}
                                            </div>
                                            <div className="flex items-center gap-2" suppressHydrationWarning>
                                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" /> {new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleNavigate('/feedings')}
                                        className="absolute inset-0 z-20 focus:outline-none"
                                    >
                                        <span className="sr-only">View details for {moment.title}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ========== CTA ========== */}
                <section className="cta-section py-20 md:py-32 bg-primary/5 relative overflow-hidden px-4 border-t-2 border-foreground/5">
                    <div className="cta-background-pattern">
                        <GridPattern
                            width={60}
                            height={60}
                            className={cn(
                                "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)] opacity-40",
                            )}
                        />
                    </div>

                    <div className="container mx-auto max-w-5xl relative z-10">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">

                            {/* Left — copy */}
                            <div className="cta-content flex flex-col items-start">
                                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight text-foreground mb-4 md:mb-6">
                                    Feed any animal,<br />
                                    <span className="text-primary italic">anywhere in the city.</span>
                                </h2>

                                <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed max-w-[38ch] mb-8 md:mb-10">
                                    Donate to the shared pool — no feeder to pick, no routing to think about.
                                    When a feeder detects nearby animals, it draws from the pool and dispenses
                                    food automatically.
                                </p>

                                <Button href="/feeder/all" variant="primary" size="lg" icon={<Gift className="w-5 h-5 md:w-6 md:h-6 fill-current" />} onClick={(e) => { e.preventDefault(); handleNavigate('/feeder/all'); }}>
                                    Contribute to pool
                                </Button>
                            </div>

                            {/* Right — stats */}
                            <div className="cta-content grid grid-cols-2 gap-3 md:gap-4">
                                {[
                                    { label: 'Active feeders', value: `${activeFeeders}`, desc: 'Across parks and shelters', accent: true },
                                    { label: 'Uptime', value: '24/7', desc: 'Sensor-monitored, always on' },
                                    { label: 'To food, directly', value: '100%', desc: 'No overhead, no middleman' },
                                    { label: 'Pool balance', value: '€214', desc: 'Available right now', accent: true },
                                ].map(({ label, value, desc, accent }) => (
                                    <div key={label} className="stat-item bg-white border-2 border-foreground rounded-2xl md:rounded-3xl p-4 md:p-6 neu-shadow hover:neu-shadow-lg transition-all duration-300">
                                        <p className="text-[9px] md:text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1.5 md:mb-2">
                                            {label}
                                        </p>
                                        <p className={`text-3xl md:text-4xl font-black leading-none mb-1.5 md:mb-2 ${accent ? 'text-primary' : 'text-foreground'}`}>
                                            {value}
                                        </p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-tight">{desc}</p>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}