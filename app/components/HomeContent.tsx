'use client';

import React, { useRef } from 'react';
import { Heart, Video, Crosshair, Gift, Activity, ChevronRight, PlayCircle, Clock, MapPin } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GridPattern } from './gridPattern';
import { cn } from '@/lib/utils';
import { Storage } from '../storage';

const FEEDERS = Storage.getFeeders();
const RECENT_MOMENTS = Array.from({ length: 3 }).map((_, i) => {
    const feeder = FEEDERS[i % FEEDERS.length];
    return {
        id: `v${i}`,
        youtubeId: i % 2 === 0 ? '_QRi0EAiAUU' : '87nz_q_JluM',
        title: `Lunch time at ${feeder.name}`,
        location: feeder.location.address,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(), // 1 hour ago etc
    };
});

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function HomeContent() {
    const container = useRef<HTMLDivElement>(null);
    const heroImgRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // 1. Hero Text Staggered Entry
        gsap.from(".hero-text-element", {
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.15,
            ease: "elastic.out(1, 0.75)",
            delay: 0.2
        });

        // 2. Hero Image Entry & Float
        gsap.from(heroImgRef.current, {
            x: 100,
            opacity: 0,
            duration: 1.2,
            ease: "power3.out",
            delay: 0.4
        });

        gsap.to(heroImgRef.current, {
            y: -15,
            rotation: 2,
            duration: 3,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            delay: 1.6
        });

        // 3. Feature Cards Pop-in
        gsap.from(".feature-card", {
            y: 100,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "back.out(1.2)",
            scrollTrigger: {
                trigger: ".feature-cards-container",
                start: "top 85%",

            },
        });

    }, { scope: container });

    return (
        <div className="w-full" ref={container}>
            {/* Hero Section */}
            <section className="min-h-[90vh] flex flex-col items-center justify-center relative overflow-hidden px-4">

                <GridPattern className={cn(
                    "[mask-image:linear-gradient(to_bottom,white,transparent,transparent)] ",
                )} />

                <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center z-10">
                    <div className="space-y-8 text-center md:text-left">

                        <h1 className="hero-text-element text-6xl md:text-8xl font-black leading-tight text-foreground drop-shadow-sm">
                            Feed a Pet. <br />
                            <span className="text-primary italic">In Real Time.</span>
                        </h1>

                        <p className="hero-text-element text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-lg">
                            PawBit connects your clicks to real kibble. Watch live video as you donate to stray animals in your city.
                        </p>

                        <div className="hero-text-element flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                            <Button href="/map" variant="primary" size="lg" icon={<Heart className="w-6 h-6 fill-current" />}>
                                Feed Now
                            </Button>
                            <Button href="/leaderboard" variant="outline" size="lg" icon={<Activity className="w-6 h-6" />}>
                                View Impact
                            </Button>
                        </div>
                    </div>

                    <div className="relative group" ref={heroImgRef}>
                        {/* <div className="absolute -inset-2 bg-accent rounded-3xl transform rotate-3 transition-transform group-hover:rotate-6 border-2 border-foreground"></div> */}
                        <div className="w-[600px] h-[600px] relative bg-card border-4 border-foreground rounded-3xl overflow-hidden neu-shadow-lg transform transition-transform group-hover:-translate-y-2">
                            <Image
                                src="/hero-cat.png"
                                alt="Cat eating"
                                width={600}
                                height={600}
                                className="w-[600px] h-[600px] object-cover"
                                priority
                            />
                            <div className="absolute bottom-4 right-4 bg-red-500 text-white px-3 py-1 font-mono font-bold text-xs uppercase rounded flex items-center gap-2 border-2 border-white">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> Live
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="feature-cards-container py-24 bg-primary/5 border-y-2 border-foreground/10">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-bold mb-4">How It Works</h2>
                        <div className="w-24 h-2 bg-accent mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="feature-card">
                            <Card hoverEffect className="text-center h-full" title="1. Find a Feeder">
                                <div className="bg-secondary/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 border-secondary">
                                    <Crosshair className="w-10 h-10 text-secondary-foreground" />
                                </div>
                                <p className="text-lg">
                                    Use our interactive map to locate PawBit feeders in parks and shelters near you.
                                </p>
                            </Card>
                        </div>

                        <div className="feature-card">
                            <Card hoverEffect className="text-center h-full" title="2. Donate & Dispense">
                                <div className="bg-primary/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 border-primary">
                                    <Gift className="w-10 h-10 text-primary-foreground" style={{ color: 'var(--primary-dark)' }} />
                                </div>
                                <p className="text-lg">
                                    Send a donation. The IoT feeder instantly dispenses food while the camera records.
                                </p>
                            </Card>
                        </div>

                        <div className="feature-card">
                            <Card hoverEffect className="text-center h-full" title="3. Watch Live">
                                <div className="bg-accent/20 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 border-accent">
                                    <Video className="w-10 h-10 text-accent-foreground" />
                                </div>
                                <p className="text-lg">
                                    See the joy immediately via live stream. Receive a video clip of your impact.
                                </p>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Moments Section */}
            <section className="py-24 bg-background relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-accent/5 -skew-x-12 transform origin-top-right translate-x-32" />
                <div className="absolute bottom-0 left-0 w-1/3 h-full bg-primary/5 -skew-x-12 transform origin-bottom-left -translate-x-32" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-5xl font-black mb-4 font-serif">
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
                        {RECENT_MOMENTS.map((moment, idx) => (
                            <div key={moment.id} className="group relative bg-white rounded-3xl overflow-hidden border-2 border-foreground neu-shadow hover:neu-shadow-lg transition-all duration-300">
                                {/* Thumbnail */}
                                <div className="aspect-video bg-black relative overflow-hidden">
                                    <iframe
                                        className="w-full h-full absolute inset-0 pointer-events-none" // pointer-events-none to prevent interaction in preview
                                        src={`https://www.youtube.com/embed/${moment.youtubeId}?controls=0&mute=1&showinfo=0&rel=0`}
                                        title={moment.title}
                                        frameBorder="0"
                                    ></iframe>
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                                    <div className="absolute bottom-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                        <PlayCircle className="w-3 h-3 fill-current" /> REPLAY
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="font-bold text-lg mb-2 line-clamp-1 font-serif group-hover:text-primary transition-colors">
                                        {moment.title}
                                    </h3>
                                    <div className="flex flex-col gap-2 text-sm text-muted-foreground font-mono">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> {moment.location}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> {new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                <a href={`/feedings`} className="absolute inset-0 z-20 focus:outline-none">
                                    <span className="sr-only">View details for {moment.title}</span>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* Algorithm Teaser */}
            <section className="py-24 bg-card px-4">
                <div className="container mx-auto bg-foreground text-background rounded-3xl p-8 md:p-16 relative overflow-hidden neu-shadow-lg transform transition-transform hover:scale-[1.01] duration-500">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">FoodFlow™ Algorithm</h2>
                            <p className="text-xl md:text-2xl mb-8 font-mono opacity-90">
                                Not sure who to feed? Our AI analyzes hunger levels, animal presence, and time-since-last-meal to distribute your donation where it's needed most.
                            </p>
                            <Button variant="accent" size="lg" href="/feeder/all">Donate to Pool</Button>
                        </div>
                        <div className="bg-background/10 p-8 rounded-2xl border-2 border-background/20 backdrop-blur-sm shadow-xl">
                            <div className="font-mono text-sm space-y-2 text-primary">
                                <p>@{">"} Detecting motion...</p>
                                <p>@{">"} Analysis: <span className="text-green-400">Dog (Hungry)</span></p>
                                <p>@{">"} Feeder Status: Online</p>
                                <p>@{">"} Action: <span className="text-accent animate-pulse">DISPENSING...</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
