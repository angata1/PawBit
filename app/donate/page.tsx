"use client";

import React, { useState, useRef } from "react";
import DonationModal from "@/components/DonationModal";
import Button from "@/app/components/Button";
import Card from "@/app/components/Card";
import { Heart, Activity, HandHeart, CheckCircle, ArrowRight } from "lucide-react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function DonatePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Hero animations
        gsap.from(".hero-text-element", {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: "back.out(1.5)",
            delay: 0.2,
        });

        gsap.from(".hero-image", {
            scale: 0.8,
            opacity: 0,
            rotation: 5,
            duration: 1,
            ease: "elastic.out(1, 0.5)",
            delay: 0.4,
        });

        // Step cards
        gsap.fromTo(".step-card",
            { y: 100, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: "back.out(1.5)",
                scrollTrigger: {
                    trigger: ".steps-section",
                    start: "top 75%",
                },
            }
        );

        // Impact section
        gsap.fromTo(".impact-content",
            { x: -50, opacity: 0 },
            {
                x: 0,
                opacity: 1,
                duration: 1,
                scrollTrigger: {
                    trigger: ".impact-section",
                    start: "top 75%",
                },
            }
        );

        gsap.fromTo(".impact-image",
            { x: 50, opacity: 0, rotation: -5 },
            {
                x: 0,
                opacity: 1,
                rotation: 0,
                duration: 1,
                scrollTrigger: {
                    trigger: ".impact-section",
                    start: "top 75%",
                },
            }
        );

    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-background overflow-hidden">
            {/* HERO SECTION */}
            <section className="relative pt-12 pb-24 px-4 border-b-4 border-foreground overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/20 -skew-x-12 transform origin-top-right z-0" />
                
                <div className="container mx-auto max-w-6xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6 text-center lg:text-left">
                            <div className="hero-text-element inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full border-2 border-red-600 font-bold text-sm uppercase tracking-wider mx-auto lg:mx-0">
                                <Heart className="w-4 h-4 fill-current" /> Save a life today
                            </div>
                            
                            <h1 className="hero-text-element text-5xl md:text-7xl font-black leading-[1.1] text-foreground">
                                Fuel the <span className="text-primary underline decoration-wavy decoration-8 underline-offset-[12px]">Feeders</span>
                            </h1>
                            
                            <p className="hero-text-element text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                                100% of your donation goes directly to filling our smart feeders. Watch the magic happen in real-time.
                            </p>
                            
                            <div className="hero-text-element pt-6">
                                <Button
                                    onClick={() => setIsModalOpen(true)}
                                    size="lg"
                                    className="text-xl px-12 py-6 animate-bounce hover:animate-none"
                                    icon={<HandHeart className="w-6 h-6" />}
                                >
                                    Donate Now
                                </Button>
                            </div>
                        </div>
                        
                        <div className="hero-image flex-1 w-full max-w-md lg:max-w-xl">
                            <div className="relative rounded-3xl overflow-hidden border-4 border-foreground neu-shadow-lg aspect-square lg:aspect-[4/3] bg-accent/20">
                                <Image
                                    src="/cats-feeding.png"
                                    alt="Cats feeding from a smart feeder"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="steps-section py-24 bg-secondary/10 relative">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Where Your Money Goes</h2>
                        <div className="w-24 h-2 bg-secondary mx-auto rounded-full" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="step-card group relative bg-white p-8 rounded-3xl border-4 border-foreground neu-shadow hover:-translate-y-2 transition-transform">
                            <div className="absolute -top-6 -right-6 w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center font-black text-2xl rounded-full border-4 border-foreground neu-shadow">1</div>
                            <HandHeart className="w-16 h-16 text-primary mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black mb-4">You Donate</h3>
                            <p className="text-muted-foreground font-medium">Choose any amount. Even small contributions make a massive difference to an empty belly.</p>
                        </div>

                        <div className="step-card group relative bg-white p-8 rounded-3xl border-4 border-foreground neu-shadow hover:-translate-y-2 transition-transform">
                            <div className="absolute -top-6 -right-6 w-12 h-12 bg-accent text-accent-foreground flex items-center justify-center font-black text-2xl rounded-full border-4 border-foreground neu-shadow">2</div>
                            <Activity className="w-16 h-16 text-accent mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black mb-4">We Refill</h3>
                            <p className="text-muted-foreground font-medium">Our system alerts us when feeders are low. Volunteers use pool funds to purchase kibble and refill them.</p>
                        </div>

                        <div className="step-card group relative bg-white p-8 rounded-3xl border-4 border-foreground neu-shadow hover:-translate-y-2 transition-transform">
                            <div className="absolute -top-6 -right-6 w-12 h-12 bg-red-400 text-white flex items-center justify-center font-black text-2xl rounded-full border-4 border-foreground neu-shadow">3</div>
                            <Heart className="w-16 h-16 text-red-500 fill-red-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black mb-4">They Eat</h3>
                            <p className="text-muted-foreground font-medium">Animals get a reliable food source. You can watch the feedings live on our gallery or feeder cameras!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* IMPACT SECTION */}
            <section className="impact-section py-24 bg-foreground text-background px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="impact-image flex-1 w-full max-w-md lg:max-w-xl">
                            <div className="relative rounded-3xl overflow-hidden border-4 border-background neu-shadow-light aspect-square bg-primary/20 p-4">
                                <div className="absolute inset-0 bg-white/5 rounded-3xl m-2 border-2 border-background border-dashed" />
                                <Image
                                    src="/donation-impact.png"
                                    alt="Donation impact illustration"
                                    fill
                                    className="object-contain p-8"
                                />
                            </div>
                        </div>

                        <div className="impact-content flex-1 space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                                Every Cent Makes an <span className="text-accent">Impact</span>
                            </h2>
                            <p className="text-xl opacity-90 leading-relaxed font-mono">
                                We believe in radical transparency. There are no administrative cuts taken from your direct donations. 
                            </p>
                            
                            <ul className="space-y-4">
                                {[
                                    { text: "$5 provides about 10 meals for stray cats", color: "text-primary" },
                                    { text: "$20 keeps a feeder full for an entire week", color: "text-accent" },
                                    { text: "$50 sustains a high-traffic location for a month", color: "text-red-400" },
                                    { text: "Smart tracking ensures food goes where it's needed", color: "text-white" }
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-4">
                                        <CheckCircle className={`w-6 h-6 shrink-0 mt-1 ${item.color}`} />
                                        <span className="text-lg md:text-xl font-bold">{item.text}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="pt-6">
                                <Button
                                    onClick={() => setIsModalOpen(true)}
                                    variant="primary"
                                    size="lg"
                                    className="text-foreground border-background"
                                    icon={<ArrowRight className="w-5 h-5" />}
                                >
                                    Contribute to the Pool
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <DonationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
