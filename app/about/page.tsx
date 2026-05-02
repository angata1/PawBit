"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
    Heart, MapPin, Cpu, Wifi, Eye, Users,
    ArrowRight, Lightbulb, Zap, Target, Globe
} from "lucide-react";
import Button from "@/app/components/Button";
import Card from "@/app/components/Card";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function AboutPage() {
    const container = useRef<HTMLDivElement>(null);
    const t = useTranslations("About");

    useGSAP(() => {
        // Hero — fade up
        gsap.fromTo(".about-hero-text",
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.15 }
        );
        gsap.fromTo(".about-hero-img",
            { scale: 0.92, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.9, ease: "power3.out", delay: 0.3 }
        );

        // Story paragraphs
        gsap.fromTo(".story-block",
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power2.out",
                scrollTrigger: { trigger: ".story-section", start: "top 78%" }
            }
        );

        // Feature items
        gsap.fromTo(".why-card",
            { y: 60, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: "back.out(1.4)",
                scrollTrigger: { trigger: ".why-section", start: "top 75%" }
            }
        );

        // Tech section
        gsap.fromTo(".tech-img",
            { x: -40, opacity: 0 },
            {
                x: 0, opacity: 1, duration: 0.8, ease: "power2.out",
                scrollTrigger: { trigger: ".tech-section", start: "top 75%" }
            }
        );
        gsap.fromTo(".tech-text",
            { x: 40, opacity: 0 },
            {
                x: 0, opacity: 1, duration: 0.8, ease: "power2.out",
                scrollTrigger: { trigger: ".tech-section", start: "top 75%" }
            }
        );



        // Team cards
        gsap.fromTo(".team-card",
            { y: 50, opacity: 0, scale: 0.95 },
            {
                y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.2, ease: "back.out(1.3)",
                scrollTrigger: { trigger: ".team-section", start: "top 75%" }
            }
        );

        // CTA
        gsap.fromTo(".about-cta",
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
                scrollTrigger: { trigger: ".about-cta", start: "top 85%" }
            }
        );
    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-background">

            {/* ═══════════════  HERO  ═══════════════ */}
            <section className="pt-16 pb-24 px-4 relative overflow-hidden">
                {/* subtle diagonal accent */}
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-14">
                    {/* text */}
                    <div className="flex-1 space-y-6 text-center lg:text-left">


                        <h1 className="about-hero-text text-5xl md:text-6xl font-black leading-[1.1]" dangerouslySetInnerHTML={{ __html: t.raw('heroTitle') }} />

                        <p className="about-hero-text text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {t('heroSubtitle')}
                        </p>
                    </div>

                    {/* illustration */}
                    <div className="about-hero-img flex-1 w-full max-w-md lg:max-w-lg">
                        <div className="relative rounded-3xl overflow-hidden border-2 border-foreground neu-shadow-lg aspect-[4/3] bg-secondary/20">
                            <Image src="/about-hero.png" alt="Students helping stray animals" fill className="object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════  OUR STORY  ═══════════════ */}
            <section className="story-section py-24 bg-card border-y-4 border-foreground px-4">
                <div className="container mx-auto max-w-3xl space-y-8">
                    <h2 className="story-block text-4xl md:text-5xl font-bold text-center mb-4">{t('story.title')}</h2>
                    <div className="story-block w-16 h-1.5 bg-primary mx-auto rounded-full" />

                    <p className="story-block text-lg text-muted-foreground leading-relaxed">
                        {t('story.p1')}
                    </p>

                    <p className="story-block text-lg text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('story.p2') }} />

                    <p className="story-block text-lg text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('story.p3') }} />

                    <p className="story-block text-lg text-muted-foreground leading-relaxed">
                        {t('story.p4')}
                    </p>
                </div>
            </section>

            {/* ═══════════════  WHY PAWBIT IS DIFFERENT  ═══════════════ */}
            <section className="why-section py-24 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('why.title')}</h2>
                        <div className="w-20 h-1.5 bg-accent mx-auto rounded-full" />
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Eye,
                                title: t('why.items.transparency.title'),
                                body: t('why.items.transparency.body'),
                                color: "text-primary",
                                bg: "bg-primary/10"
                            },
                            {
                                icon: Zap,
                                title: t('why.items.realtime.title'),
                                body: t('why.items.realtime.body'),
                                color: "text-accent",
                                bg: "bg-accent/10"
                            },
                            {
                                icon: Cpu,
                                title: t('why.items.hardware.title'),
                                body: t('why.items.hardware.body'),
                                color: "text-secondary-foreground",
                                bg: "bg-secondary/20"
                            },
                            {
                                icon: Globe,
                                title: t('why.items.global.title'),
                                body: t('why.items.global.body'),
                                color: "text-primary",
                                bg: "bg-primary/10"
                            },
                            {
                                icon: Target,
                                title: t('why.items.distribution.title'),
                                body: t('why.items.distribution.body'),
                                color: "text-accent",
                                bg: "bg-accent/10"
                            },
                            {
                                icon: Heart,
                                title: t('why.items.animalsfirst.title'),
                                body: t('why.items.animalsfirst.body'),
                                color: "text-red-500",
                                bg: "bg-red-50"
                            },
                        ].map((item, i) => (
                            <div key={i} className="why-card group bg-white p-7 rounded-2xl border-2 border-foreground neu-shadow hover:-translate-y-1 transition-transform">
                                <div className={`w-14 h-14 ${item.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`w-7 h-7 ${item.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════  TECH BEHIND IT  ═══════════════ */}
            <section className="tech-section py-24 bg-foreground text-background px-4">
                <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-16">
                    <div className="tech-img flex-1 w-full max-w-md">
                        <div className="relative rounded-3xl overflow-hidden border-2 border-background/30 aspect-square bg-primary/10">
                            <Image src="/about-tech.png" alt="Smart feeder technology" fill className="object-contain p-6" />
                        </div>
                    </div>

                    <div className="tech-text flex-1 space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight" dangerouslySetInnerHTML={{ __html: t.raw('tech.title') }} />
                        <p className="text-lg opacity-90 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('tech.p1') }} />

                        <ul className="space-y-4 pt-2">
                            {[
                                { icon: Cpu, label: t('tech.list.brain') },
                                { icon: Wifi, label: t('tech.list.supabase') },
                                { icon: Lightbulb, label: t('tech.list.sensors') },
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <item.icon className="w-5 h-5 text-primary shrink-0 mt-1" />
                                    <span className="text-lg font-medium">{item.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>



            {/* ═══════════════  TEAM  ═══════════════ */}
            <section className="team-section py-24 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('team.title')}</h2>
                        <div className="w-16 h-1.5 bg-primary mx-auto rounded-full" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        {/* Angel */}
                        <div className="team-card bg-white rounded-2xl border-2 border-foreground neu-shadow overflow-hidden">
                            <div className="h-3 bg-primary" />
                            <div className="p-8 space-y-4">
                                <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-foreground flex items-center justify-center text-3xl font-black text-primary mx-auto md:mx-0">
                                    A
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-bold">{t('team.angel.name')}</h3>
                                    <p className="text-sm font-mono text-primary mt-1">{t('team.angel.role')}</p>
                                </div>
                                <p className="text-muted-foreground leading-relaxed text-center md:text-left">
                                    {t('team.angel.bio')}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center md:justify-start">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span>{t('team.location')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Raya */}
                        <div className="team-card bg-white rounded-2xl border-2 border-foreground neu-shadow overflow-hidden">
                            <div className="h-3 bg-accent" />
                            <div className="p-8 space-y-4">
                                <div className="w-20 h-20 rounded-full bg-accent/15 border-2 border-foreground flex items-center justify-center text-3xl font-black text-accent mx-auto md:mx-0">
                                    R
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-bold">{t('team.raya.name')}</h3>
                                    <p className="text-sm font-mono text-accent mt-1">{t('team.raya.role')}</p>
                                </div>
                                <p className="text-muted-foreground leading-relaxed text-center md:text-left">
                                    {t('team.raya.bio')}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center md:justify-start">
                                    <MapPin className="w-4 h-4 text-accent" />
                                    <span>{t('team.location')}</span>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </section>

            {/* ═══════════════  CTA  ═══════════════ */}
            <section className="py-24 bg-primary/5 px-4">
                <div className="about-cta container mx-auto max-w-3xl bg-foreground text-background rounded-3xl p-10 md:p-16 text-center neu-shadow-lg">
                    <Heart className="w-10 h-10 text-primary mx-auto mb-6" />

                    <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                        {t('cta.title')}
                    </h2>
                    <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto leading-relaxed">
                        {t('cta.p1')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button href="/map" variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                            {t('cta.button')}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
