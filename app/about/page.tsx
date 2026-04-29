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

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function AboutPage() {
    const container = useRef<HTMLDivElement>(null);

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


                        <h1 className="about-hero-text text-5xl md:text-6xl font-black leading-[1.1]">
                            Two Students.<br />
                            One <span className="text-primary">Mission.</span>
                        </h1>

                        <p className="about-hero-text text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                            We&apos;re Angel &amp; Raya — high-school students from Gotse Delchev, Bulgaria who decided
                            that stray animals in our town deserve better than an empty stomach.
                        </p>
                    </div>

                    {/* illustration */}
                    <div className="about-hero-img flex-1 w-full max-w-md lg:max-w-lg">
                        <div className="relative rounded-3xl overflow-hidden border-4 border-foreground neu-shadow-lg aspect-[4/3] bg-secondary/20">
                            <Image src="/about-hero.png" alt="Students helping stray animals" fill className="object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════  OUR STORY  ═══════════════ */}
            <section className="story-section py-24 bg-card border-y-4 border-foreground px-4">
                <div className="container mx-auto max-w-3xl space-y-8">
                    <h2 className="story-block text-4xl md:text-5xl font-bold text-center mb-4">Our Story</h2>
                    <div className="story-block w-16 h-1.5 bg-primary mx-auto rounded-full" />

                    <p className="story-block text-lg text-muted-foreground leading-relaxed">
                        It started the way most projects start — with a problem we couldn&apos;t stop thinking about.
                        Every day on our way to school we&apos;d walk past the same strays: skinny cats hiding under parked cars,
                        a one-eared dog begging near the bakery. Some days someone would leave leftovers.
                        Most days, nobody did.
                    </p>

                    <p className="story-block text-lg text-muted-foreground leading-relaxed">
                        We kept asking ourselves: <strong className="text-foreground">what if feeding them didn&apos;t depend
                            on who happened to walk by?</strong> What if anyone, anywhere, could press a button and actually
                        deliver food to an animal that needs it — right now, in real-time?
                    </p>

                    <p className="story-block text-lg text-muted-foreground leading-relaxed">
                        That question became PawBit. We started prototyping during a school project at
                        <strong className="text-foreground"> PMG &ldquo;Yane Sandanski&rdquo;</strong> in Gotse Delchev.
                        A Raspberry Pi, a servo motor, a bag of kibble, and many late nights later — the first feeder worked.
                        Then we built the website so people could actually use it. Then the live camera feed. Then the donation system.
                        One thing led to another, and now you&apos;re reading this.
                    </p>

                    <p className="story-block text-lg text-muted-foreground leading-relaxed">
                        PawBit isn&apos;t a corporate initiative. It&apos;s not backed by a big organization.
                        It&apos;s two students who care about the animals they see every day and believe technology
                        can make a real, tangible difference — one meal at a time.
                    </p>
                </div>
            </section>

            {/* ═══════════════  WHY PAWBIT IS DIFFERENT  ═══════════════ */}
            <section className="why-section py-24 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">What Makes PawBit Different</h2>
                        <div className="w-20 h-1.5 bg-accent mx-auto rounded-full" />
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Eye,
                                title: "Full Transparency",
                                body: "Watch your donation in action. Every feeder has a live camera — you see the animals eat the moment the motor triggers.",
                                color: "text-primary",
                                bg: "bg-primary/10"
                            },
                            {
                                icon: Zap,
                                title: "Real-Time Feeding",
                                body: "No middle-men, no delays. Your click triggers a Raspberry Pi that dispenses food within seconds.",
                                color: "text-accent",
                                bg: "bg-accent/10"
                            },
                            {
                                icon: Cpu,
                                title: "Custom Hardware",
                                body: "Designed and built by us using Raspberry Pi and custom CAD. While not open-source just yet, our goal is to share the finished blueprints soon.",
                                color: "text-secondary-foreground",
                                bg: "bg-secondary/20"
                            },
                            {
                                icon: Globe,
                                title: "Donate From Anywhere",
                                body: "Whether you're in Gotse Delchev or on the other side of the planet — you can feed a stray in Bulgaria.",
                                color: "text-primary",
                                bg: "bg-primary/10"
                            },
                            {
                                icon: Target,
                                title: "Smart Distribution",
                                body: "The donation pool allocates food where it's needed most — based on hunger levels, time since last meal, and animal activity.",
                                color: "text-accent",
                                bg: "bg-accent/10"
                            },
                            {
                                icon: Heart,
                                title: "100% for Animals",
                                body: "Every cent goes directly to kibble and feeder maintenance. We don't take salaries — we're students doing this because we care.",
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
                        <div className="relative rounded-3xl overflow-hidden border-4 border-background/30 aspect-square bg-primary/10">
                            <Image src="/about-tech.png" alt="Smart feeder technology" fill className="object-contain p-6" />
                        </div>
                    </div>

                    <div className="tech-text flex-1 space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                            The Tech <span className="text-primary">Under the Hood</span>
                        </h2>
                        <p className="text-lg opacity-90 leading-relaxed">
                            Each PawBit feeder is powered by a <strong>Raspberry Pi</strong> running a lightweight service
                            that connects to our backend over Wi-Fi. When a donation comes in, the server sends a command
                            to the nearest feeder — a servo motor opens and dispenses a measured portion of food.
                        </p>

                        <ul className="space-y-4 pt-2">
                            {[
                                { icon: Cpu, label: "Raspberry Pi Zero 2W as the brain of each feeder" },
                                { icon: Wifi, label: "Real-time WebSocket connection to Supabase" },
                                { icon: Lightbulb, label: "Sensors detect animal presence and food levels" },
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
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Meet the Team</h2>
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
                                    <h3 className="text-2xl font-bold">Angel Murtev</h3>
                                    <p className="text-sm font-mono text-primary mt-1">Programmer, Website Builder &amp; Project Planner</p>
                                </div>
                                <p className="text-muted-foreground leading-relaxed text-center md:text-left">
                                    Builds the web platform, manages the system architecture, and maps out the project roadmap.
                                    Believes that code can do more than just live on a screen — it can put food in a hungry animal&apos;s bowl.
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center md:justify-start">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span>Gotse Delchev, Bulgaria</span>
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
                                    <h3 className="text-2xl font-bold">Raya Sokolova</h3>
                                    <p className="text-sm font-mono text-accent mt-1">Hardware Maker &amp; CAD Designer</p>
                                </div>
                                <p className="text-muted-foreground leading-relaxed text-center md:text-left">
                                    Handles the physical engineering, from 3D modeling the feeder enclosures to wiring the electronics.
                                    Turning sketches into functional, animal-proof hardware that works in the real world.
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center md:justify-start">
                                    <MapPin className="w-4 h-4 text-accent" />
                                    <span>Gotse Delchev, Bulgaria</span>
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
                        Want to help?
                    </h2>
                    <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto leading-relaxed">
                        You don&apos;t need to be in Gotse Delchev. Pick a feeder, donate a meal, and watch it happen live.
                        Every bit counts.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button href="/map" variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                            Find a Feeder
                        </Button>

                    </div>
                </div>
            </section>
        </div>
    );
}
