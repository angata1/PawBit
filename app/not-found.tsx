"use client";

import Link from 'next/link';
import { GridPattern } from './components/GridPattern';
import { cn } from '@/lib/utils';
import { Cat, Dog, Home, SearchX } from 'lucide-react';
import Button from './components/Button';
import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations('NotFound');
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden px-4 bg-background text-foreground">
            <GridPattern
                className={cn(
                    "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] opacity-50",
                )}
            />

            <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">

                {/* Icon Cluster */}
                <div className="relative inline-block mb-4">
                    <div className="absolute -inset-4 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative bg-card p-6 rounded-full border-2 border-foreground neu-shadow-lg transform -rotate-6">
                        <Cat className="w-20 h-20 text-primary" />
                        <div className="absolute -bottom-2 -right-2 bg-destructive text-destructive-foreground p-2 rounded-full border-2 border-foreground">
                            <SearchX className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-8xl md:text-9xl font-black text-foreground drop-shadow-sm font-sans">
                        404
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-bold font-serif-heading text-muted-foreground">
                        {t('title')}
                    </h2>
                </div>

                <p className="text-xl text-foreground/80 font-mono max-w-lg mx-auto leading-relaxed">
                    {t('description')}
                </p>

                <div className="pt-4">
                    <Button href="/" variant="primary" size="lg" icon={<Home className="w-5 h-5" />}>
                        {t('returnHome')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
