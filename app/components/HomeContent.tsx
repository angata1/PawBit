'use client';

import { useTranslations } from 'next-intl';

import React, { useRef, useState, useEffect } from 'react';
import {
    Heart, Video, Gift, Activity,
    ChevronRight, PlayCircle, Clock, MapPin
} from 'lucide-react';
import Button from './Button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createClient } from '@/lib/supabase/client';
import { GridPattern } from './GridPattern';
import { cn } from '@/lib/utils';

type Moment = {
    id: string;
    youtubeId: string;
    title: string;
    location: string;
    timestamp: string;
    feederId?: string;
};

function extractYouTubeId(url: string): string {
    if (!url) return "";
    try {
        const parsed = new URL(url);
        const videoId = parsed.searchParams.get("v");
        if (videoId) return videoId;
        const segments = parsed.pathname.split("/").filter(Boolean);
        return parsed.hostname.includes("youtu.be") ? segments[0] : "";
    } catch {
        return "";
    }
}

gsap.registerPlugin(ScrollTrigger);

export default function HomeContent() {
    const container = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const t = useTranslations('Home');
    const [activeFeeders, setActiveFeeders] = useState<number>(3);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [recentMoments, setRecentMoments] = useState<Moment[]>([]);
    const [loadingMoments, setLoadingMoments] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        const fetchStats = async () => {
            const { count } = await supabase.from('feeders').select('*', { count: 'exact', head: true }).eq('enabled', true);
            if (count !== null) setActiveFeeders(count);
        };
        fetchStats();

        const fetchMoments = async () => {
            const { data } = await supabase
                .from('meals')
                .select(`
                    id,
                    time_of_meal,
                    video_link,
                    feeders (
                        id,
                        name,
                        location
                    )
                `)
                .not('video_link', 'is', null)
                .order('time_of_meal', { ascending: false })
                .limit(3);

            if (data && data.length > 0) {
                const mapped = data.map(meal => {
                    const feeder = Array.isArray(meal.feeders) ? meal.feeders[0] : meal.feeders;
                    return {
                        id: String(meal.id),
                        youtubeId: extractYouTubeId(meal.video_link || ''),
                        title: t('mealAt', { feederName: feeder?.name || t('feeder') }),
                        location: feeder?.location?.address || t('unknownLocation'),
                        timestamp: meal.time_of_meal || new Date().toISOString(),
                        feederId: String(feeder?.id || ''),
                    }
                }).filter(m => !!m.youtubeId);
                setRecentMoments(mapped);
            }
            setLoadingMoments(false);
        };
        fetchMoments();
    }, []);

    const handleNavigate = (href: string) => {
        setIsTransitioning(true);
        setTimeout(() => {
            router.push(href);
        }, 300);
    };

    useGSAP(() => {
        const q = gsap.utils.selector(container);
        const mm = gsap.matchMedia();
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduceMotion) {
            gsap.set(q(".hero-text-element, .hero-bg-img, .scroll-indicator, .feature-card, .feature-icon, .moments-heading, .moment-card, .cta-content, .stat-item"), {
                clearProps: "all",
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
            });
            return;
        }

        const reveal = (
            targets: gsap.TweenTarget,
            vars: {
                from?: gsap.TweenVars;
                to?: gsap.TweenVars;
                scrollTrigger?: ScrollTrigger.Vars;
            } = {},
        ) => {
            gsap.fromTo(targets,
                {
                    autoAlpha: 0,
                    y: 48,
                    ...vars.from,
                },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    ease: "power3.out",
                    stagger: 0.1,
                    overwrite: "auto",
                    ...vars.to,
                    scrollTrigger: {
                        start: "top 82%",
                        once: true,
                        ...vars.scrollTrigger,
                    },
                }
            );
        };

        const addParallax = (targets: Element[], amount = -5) => {
            targets.forEach((target, index) => {
                gsap.to(target, {
                    yPercent: amount + (index % 2 === 0 ? 1 : -1),
                    ease: "none",
                    scrollTrigger: {
                        trigger: target,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 0.8,
                        invalidateOnRefresh: true,
                    },
                });
            });
        };

        gsap.timeline({ defaults: { ease: "power3.out" } })
            .fromTo(q(".hero-bg-img"),
                { autoAlpha: 0 },
                { autoAlpha: 0.2, duration: 1.1 }
            )
            .fromTo(q(".hero-text-element"),
                { y: 42, autoAlpha: 0 },
                {
                    y: 0,
                    autoAlpha: 1,
                    duration: 0.9,
                    stagger: 0.12,
                },
                0.15
            )
            .fromTo(q(".scroll-indicator"),
                { y: 14, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.8 },
                0.95
            );

        gsap.to(q(".scroll-indicator-icon"), {
            y: 8,
            repeat: -1,
            yoyo: true,
            duration: 1.8,
            ease: "sine.inOut",
        });

        reveal(q(".feature-card"), {
            from: { y: 70, scale: 0.96 },
            to: { scale: 1, stagger: 0.12 },
            scrollTrigger: { trigger: q(".feature-cards-container")[0], start: "top 78%" },
        });

        reveal(q(".feature-icon"), {
            from: { y: 0, scale: 0.7, rotation: -20 },
            to: { scale: 1, rotation: 0, duration: 0.55, stagger: 0.12, ease: "back.out(1.8)" },
            scrollTrigger: { trigger: q(".feature-cards-container")[0], start: "top 72%" },
        });

        reveal(q(".moments-heading"), {
            from: { y: 34 },
            to: { duration: 0.65 },
            scrollTrigger: { trigger: q(".moments-section")[0], start: "top 76%" },
        });

        reveal(q(".cta-content"), {
            from: { y: 46 },
            to: { stagger: 0.08 },
            scrollTrigger: { trigger: q(".cta-section")[0], start: "top 78%" },
        });

        reveal(q(".stat-item"), {
            from: { y: 30, scale: 0.94 },
            to: { scale: 1, duration: 0.55, stagger: 0.08 },
            scrollTrigger: { trigger: q(".cta-section")[0], start: "top 68%" },
        });

        mm.add("(min-width: 768px)", () => {
            gsap.to(q(".hero-content-wrapper"), {
                yPercent: -10,
                autoAlpha: 0,
                ease: "none",
                scrollTrigger: {
                    trigger: q(".hero-section")[0],
                    start: "top top",
                    end: "bottom 35%",
                    scrub: 0.4,
                    invalidateOnRefresh: true,
                }
            });

            gsap.to(q(".hero-bg-img"), {
                yPercent: 8,
                ease: "none",
                scrollTrigger: {
                    trigger: q(".hero-section")[0],
                    start: "top top",
                    end: "bottom top",
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                }
            });

            addParallax(q(".feature-card"), -5);
            addParallax(q(".moment-card"), -4);
            addParallax(q(".cta-content"), -5);
            addParallax(q(".stat-item"), -3);

            gsap.to(q(".feature-background-pattern"), {
                yPercent: -8,
                ease: "none",
                scrollTrigger: {
                    trigger: q(".feature-cards-container")[0],
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                }
            });

            gsap.to(q(".cta-background-pattern"), {
                yPercent: -6,
                ease: "none",
                scrollTrigger: {
                    trigger: q(".cta-section")[0],
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                }
            });
        });

        ScrollTrigger.refresh();

        return () => mm.revert();

    }, { scope: container });

    useGSAP(() => {
        const q = gsap.utils.selector(container);
        const cards = q(".moment-card");

        if (!cards.length) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            gsap.set(cards, { clearProps: "all", autoAlpha: 1, y: 0, scale: 1 });
            return;
        }

        gsap.fromTo(cards,
            { autoAlpha: 0, y: 56, scale: 0.98 },
            {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.7,
                ease: "power3.out",
                stagger: 0.1,
                overwrite: "auto",
                scrollTrigger: {
                    trigger: q(".moments-section")[0],
                    start: "top 72%",
                    once: true,
                },
            }
        );

        if (window.matchMedia("(min-width: 768px)").matches) {
            cards.forEach((card, index) => {
                gsap.to(card, {
                    yPercent: -4 + (index % 2 === 0 ? 1 : -1),
                    ease: "none",
                    scrollTrigger: {
                        trigger: card,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 0.8,
                        invalidateOnRefresh: true,
                    },
                });
            });
        }

        ScrollTrigger.refresh();
    }, { scope: container, dependencies: [loadingMoments, recentMoments.length] });

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
                        <h1 className="hero-text-element text-5xl sm:text-6xl md:text-8xl font-black leading-[1.1] text-foreground" dangerouslySetInnerHTML={{ __html: t.raw('heroTitle') }} />

                        <p className="hero-text-element text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                            {t('heroDesc')}
                        </p>

                        <div className="hero-text-element flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                            <Button href="/map" variant="primary" size="lg" icon={<Heart className="w-5 h-5 md:w-6 md:h-6 fill-current" />} onClick={(e) => { e.preventDefault(); handleNavigate('/map'); }}>
                                {t('feedNow')}
                            </Button>
                            <Button href="/leaderboard" variant="outline" size="lg" icon={<Activity className="w-5 h-5 md:w-6 md:h-6" />} onClick={(e) => { e.preventDefault(); handleNavigate('/leaderboard'); }}>
                                {t('viewImpact')}
                            </Button>
                        </div>


                    </div>

                    {/* ── Scroll indicator ── */}
                    <div className="scroll-indicator absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10 pointer-events-none select-none opacity-0">
                        <span className="text-[9px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 md:text-foreground/60 mb-1">{t('scroll')}</span>
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
                            <h2 className="text-4xl md:text-5xl font-black mb-4">{t('howItWorks')}</h2>
                            <div className="w-24 h-2 bg-accent mx-auto rounded-full" />
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {/* Step 1 */}
                            <div className="feature-card bg-white border-2 border-foreground rounded-3xl p-6 md:p-8 neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-primary/20">01</span>
                                    <Gift className="feature-icon w-8 h-8 md:w-10 md:h-10 text-primary" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{t('fuelThePool')}</h3>
                                <p className="text-muted-foreground text-base md:text-lg">
                                    {t('fuelThePoolDesc')}
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="feature-card bg-white border-2 border-foreground rounded-3xl p-6 md:p-8 neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-primary/20">02</span>
                                    <Activity className="feature-icon w-8 h-8 md:w-10 md:h-10 text-primary" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{t('aiFeeding')}</h3>
                                <p className="text-muted-foreground text-base md:text-lg">
                                    {t('aiFeedingDesc')}
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="feature-card bg-white border-2 border-foreground rounded-3xl p-6 md:p-8 neu-shadow hover:neu-shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4 mb-4 md:mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-primary/20">03</span>
                                    <Video className="feature-icon w-8 h-8 md:w-10 md:h-10 text-primary" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{t('seeImpact')}</h3>
                                <p className="text-muted-foreground text-base md:text-lg">
                                    {t('seeImpactDesc')}
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
                                <h2 className="text-4xl md:text-5xl font-black mb-3 md:mb-4" dangerouslySetInnerHTML={{ __html: t.raw('momentsOfJoy') }} />
                                <p className="text-lg md:text-xl text-muted-foreground font-medium">
                                    {t('momentsDesc')}
                                </p>
                            </div>
                            <Button href="/feedings" variant="outline" icon={<ChevronRight className="w-4 h-4" />} onClick={(e) => { e.preventDefault(); handleNavigate('/feedings'); }}>
                                {t('viewFullGallery')}
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {!loadingMoments && recentMoments.length === 0 && (
                                <div className="col-span-3 text-center py-10 text-muted-foreground font-medium">
                                    {t('noRecentMeals')}
                                </div>
                            )}
                            {recentMoments.map((moment) => (
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
                                            <PlayCircle className="w-3 h-3 fill-current" /> {t('replay')}
                                        </div>
                                    </div>

                                    <div className="p-4 md:p-6">
                                        <h3 className="font-bold text-base md:text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                            {moment.title}
                                        </h3>
                                        <div className="flex flex-col gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground font-mono">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" /> <span className="truncate">{moment.location}</span>
                                            </div>
                                            <div className="flex items-center gap-2" suppressHydrationWarning>
                                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" /> {new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleNavigate(moment.feederId ? `/feeder/${moment.feederId}` : '/feedings')}
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
                                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight text-foreground mb-4 md:mb-6" dangerouslySetInnerHTML={{ __html: t.raw('ctaTitle') }} />

                                <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed max-w-[38ch] mb-8 md:mb-10">
                                    {t('ctaDesc')}
                                </p>

                                <Button href="/feeder/all" variant="primary" size="lg" icon={<Gift className="w-5 h-5 md:w-6 md:h-6 fill-current" />} onClick={(e) => { e.preventDefault(); handleNavigate('/feeder/all'); }}>
                                    {t('contributeToPool')}
                                </Button>
                            </div>

                            {/* Right — stats */}
                            <div className="cta-content grid grid-cols-2 gap-3 md:gap-4">
                                {[
                                    { label: t('statActiveFeeders'), value: `${activeFeeders}`, desc: t('statActiveFeedersDesc'), accent: true },
                                    { label: t('statUptime'), value: '24/7', desc: t('statUptimeDesc') },
                                    { label: t('statDirect'), value: '100%', desc: t('statDirectDesc') },
                                    { label: t('statPoolBalance'), value: '€214', desc: t('statPoolBalanceDesc'), accent: true },
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
