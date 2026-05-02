"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

export default function LanguageSwitcher() {
    const router = useRouter();
    const [locale, setLocale] = useState<"bg" | "en">("bg");
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Read current locale from cookie
        const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
        const current = match?.[1];
        setLocale(current === "en" ? "en" : "bg");

        // Handle clicking outside to close
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLanguageChange = (newLocale: "bg" | "en") => {
        if (newLocale === locale) {
            setIsOpen(false);
            return;
        }
        
        // Write the cookie
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
        setLocale(newLocale);
        setIsOpen(false);
        
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <div className="relative w-fit" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-foreground font-bold text-xs uppercase tracking-widest transition-all duration-200
                    ${isOpen 
                        ? 'bg-muted shadow-none translate-x-[2px] translate-y-[2px]' 
                        : 'bg-white neu-shadow-sm hover:bg-muted hover:translate-x-[1px] hover:translate-y-[1px]'}
                    ${isPending ? 'opacity-70 cursor-wait' : ''}
                `}
            >
                <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center transition-all duration-500 ${isPending ? 'animate-spin scale-75' : ''}`}>
                        <ReactCountryFlag 
                            countryCode={locale === 'bg' ? 'BG' : 'GB'} 
                            svg 
                            style={{
                                width: '1.2em',
                                height: '1.2em',
                            }}
                            aria-label={locale === 'bg' ? 'Bulgarian' : 'English'}
                        />
                    </div>
                    <span className="font-bold tracking-wide">{locale === 'bg' ? 'БГ' : 'EN'}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 min-w-[80px] bg-white border-2 border-foreground rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1 flex flex-col gap-1">
                        <button
                            onClick={() => handleLanguageChange("bg")}
                            className={`
                                w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-[11px] font-bold uppercase tracking-wider transition-colors
                                ${locale === 'bg' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}
                            `}
                        >
                            <div className="flex items-center gap-2">
                                <ReactCountryFlag countryCode="BG" svg />
                                <span>БГ</span>
                            </div>
                            {locale === 'bg' && <Check className="w-3 h-3 ml-2" />}
                        </button>
                        <button
                            onClick={() => handleLanguageChange("en")}
                            className={`
                                w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-[11px] font-bold uppercase tracking-wider transition-colors
                                ${locale === 'en' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}
                            `}
                        >
                            <div className="flex items-center gap-2">
                                <ReactCountryFlag countryCode="GB" svg />
                                <span>EN</span>
                            </div>
                            {locale === 'en' && <Check className="w-3 h-3 ml-2" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
