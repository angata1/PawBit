"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
    ArrowRight,
    Cpu,
    Eye,
    Globe,
    Heart,
    Lightbulb,
    MapPin,
    Target,
    Wifi,
    Zap,
} from "lucide-react";
import Button from "@/app/components/Button";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function AboutPage() {
    const container = useRef<HTMLDivElement>(null);
    const t = useTranslations("About");

    const whyItems = [
        {
            icon: Eye,
            title: t("why.items.transparency.title"),
            body: t("why.items.transparency.body"),
        },
        {
            icon: Zap,
            title: t("why.items.realtime.title"),
            body: t("why.items.realtime.body"),
        },
        {
            icon: Cpu,
            title: t("why.items.hardware.title"),
            body: t("why.items.hardware.body"),
        },
        {
            icon: Globe,
            title: t("why.items.global.title"),
            body: t("why.items.global.body"),
        },
        {
            icon: Target,
            title: t("why.items.distribution.title"),
            body: t("why.items.distribution.body"),
        },
        {
            icon: Heart,
            title: t("why.items.animalsfirst.title"),
            body: t("why.items.animalsfirst.body"),
        },
    ];

    const techItems = [
        { icon: Cpu, label: t("tech.list.brain") },
        { icon: Wifi, label: t("tech.list.supabase") },
        { icon: Lightbulb, label: t("tech.list.sensors") },
    ];

    const team = [
        {
            initial: "A",
            name: t("team.angel.name"),
            role: t("team.angel.role"),
            bio: t("team.angel.bio"),
        },
        {
            initial: "R",
            name: t("team.raya.name"),
            role: t("team.raya.role"),
            bio: t("team.raya.bio"),
        },
    ];

    useGSAP(() => {
        const q = gsap.utils.selector(container);
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduceMotion) {
            gsap.set(q(".about-reveal, .about-hero-img"), {
                clearProps: "all",
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
            });
            return;
        }

        gsap.fromTo(q(".about-hero-copy .about-reveal"),
            { y: 34, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.1, ease: "power3.out", delay: 0.1 }
        );

        gsap.fromTo(q(".about-hero-img"),
            { y: 28, scale: 0.97, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.85, ease: "power3.out", delay: 0.2 }
        );

        gsap.utils.toArray<HTMLElement>(q(".about-section")).forEach((section) => {
            gsap.fromTo(section.querySelectorAll(".about-reveal"),
                { y: 36, autoAlpha: 0 },
                {
                    y: 0,
                    autoAlpha: 1,
                    duration: 0.68,
                    stagger: 0.08,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 78%",
                        once: true,
                    },
                }
            );
        });
    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-background text-foreground">
            <section className="relative overflow-hidden px-4 pb-20 pt-16 md:pb-28 md:pt-24">
                <div className="container relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="about-hero-copy max-w-2xl space-y-6 text-center lg:text-left">
                        <p className="about-reveal text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                            PawBit
                        </p>
                        <h1
                            className="about-reveal text-4xl font-black leading-[1.08] text-foreground sm:text-5xl md:text-6xl"
                            dangerouslySetInnerHTML={{ __html: t.raw("heroTitle") }}
                        />
                        <p className="about-reveal mx-auto max-w-[38rem] text-base leading-8 text-muted-foreground md:text-lg lg:mx-0">
                            {t("heroSubtitle")}
                        </p>
                    </div>

                    <div className="about-hero-img w-full">
                        <div className="relative mx-auto aspect-[5/4] max-w-[34rem] overflow-hidden rounded-lg border border-foreground/10 bg-card shadow-xl shadow-foreground/10">
                            <Image
                                src="/about-hero-v2.png"
                                alt="Students setting up a smart feeder for stray cats"
                                fill
                                priority
                                sizes="(min-width: 1024px) 520px, 92vw"
                            className="object-cover"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="about-section px-4 py-16 md:py-24">
                <div className="container mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.42fr_0.58fr]">
                    <div className="about-reveal">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                            Story
                        </p>
                        <h2 className="text-3xl font-black leading-tight md:text-5xl">
                            {t("story.title")}
                        </h2>
                    </div>

                    <div className="space-y-6 text-base leading-8 text-muted-foreground md:text-lg">
                        <p className="about-reveal">{t("story.p1")}</p>
                        <p className="about-reveal" dangerouslySetInnerHTML={{ __html: t.raw("story.p2") }} />
                        <p className="about-reveal" dangerouslySetInnerHTML={{ __html: t.raw("story.p3") }} />
                        <p className="about-reveal">{t("story.p4")}</p>
                    </div>
                </div>
            </section>

            <section className="about-section bg-primary/5 px-4 py-16 md:py-24 border-y-2 border-foreground/5">
                <div className="container mx-auto max-w-6xl">
                    <div className="about-reveal mb-12 max-w-3xl">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                            Principles
                        </p>
                        <h2 className="text-3xl font-black leading-tight md:text-5xl">
                            {t("why.title")}
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {whyItems.map((item) => (
                            <article
                                key={item.title}
                                className="about-reveal rounded-2xl border-2 border-foreground bg-white p-5 sm:p-6 neu-shadow transition-transform duration-200 hover:-translate-y-1 hover:neu-shadow-lg"
                            >
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-foreground bg-primary/10 text-primary">
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <h3 className="mb-2 text-xl font-semibold leading-snug">{item.title}</h3>
                                <p className="text-sm leading-7 text-muted-foreground md:text-base">{item.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="about-section px-4 py-16 md:py-24">
                <div className="container mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.52fr_0.48fr]">
                    <div className="about-reveal order-2 lg:order-1">
                        <div className="relative aspect-square overflow-hidden rounded-lg border border-foreground/10 bg-card shadow-xl shadow-foreground/10">
                            <Image
                                src="/about-tech-v2.png"
                                alt="Smart feeder technology with sensors and controller board"
                                fill
                                sizes="(min-width: 1024px) 520px, 92vw"
                                className="object-cover"
                            />
                        </div>
                    </div>

                    <div className="order-1 space-y-7 lg:order-2">
                        <div className="about-reveal">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                                Technology
                            </p>
                            <h2
                                className="text-3xl font-black leading-tight md:text-5xl"
                                dangerouslySetInnerHTML={{ __html: t.raw("tech.title") }}
                            />
                        </div>

                        <p
                            className="about-reveal text-base leading-8 text-muted-foreground md:text-lg"
                            dangerouslySetInnerHTML={{ __html: t.raw("tech.p1") }}
                        />

                        <ul className="space-y-3">
                            {techItems.map((item) => (
                                <li key={item.label} className="about-reveal flex gap-3 rounded-2xl border-2 border-foreground bg-white p-4 neu-shadow-sm">
                                    <item.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                                    <span className="leading-7 text-foreground/85">{item.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="about-section bg-primary/5 px-4 py-16 md:py-24 border-y-2 border-foreground/5">
                <div className="container mx-auto max-w-6xl">
                    <div className="about-reveal mb-12 max-w-3xl">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                            Team
                        </p>
                        <h2 className="text-3xl font-black leading-tight md:text-5xl">
                            {t("team.title")}
                        </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {team.map((member) => (
                            <article key={member.name} className="about-reveal rounded-2xl border-2 border-foreground bg-white p-5 neu-shadow md:p-7">
                                <div className="mb-5 flex items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-primary/10 text-2xl font-black text-primary">
                                        {member.initial}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black leading-tight">{member.name}</h3>
                                        <p className="mt-1 text-sm font-medium leading-6 text-primary">{member.role}</p>
                                    </div>
                                </div>
                                <p className="leading-8 text-muted-foreground">{member.bio}</p>
                                <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span>{t("team.location")}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="about-section px-4 py-16 md:py-24">
                <div className="container mx-auto grid max-w-6xl items-center gap-8 rounded-2xl border-2 border-foreground bg-foreground px-5 py-10 text-background neu-shadow-lg md:grid-cols-[1fr_auto] md:px-10 md:py-12">
                    <div className="about-reveal max-w-2xl">
                        <Heart className="mb-5 h-8 w-8 text-primary" />
                        <h2 className="mb-4 text-3xl font-black leading-tight md:text-4xl">
                            {t("cta.title")}
                        </h2>
                        <p className="text-base leading-8 text-background/80 md:text-lg">
                            {t("cta.p1")}
                        </p>
                    </div>

                    <div className="about-reveal">
                        <Button href="/map" variant="primary" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                            {t("cta.button")}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
