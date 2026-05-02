import Link from "next/link";
import { Heart, Mail, Phone, MapPin } from "lucide-react";
import Image from "next/image";
import { useTranslations } from 'next-intl';

export default function Footer() {
    const t = useTranslations('Footer');
    return (
        <footer className="bg-white border-t border-border mt-auto">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary p-1.5 rounded-lg border-2 border-foreground neu-shadow-sm">
                                <Image 
                                    src="/logo.svg" 
                                    alt="PawBit Logo" 
                                    width={24} 
                                    height={24} 
                                    className="object-contain brightness-0 invert"
                                />
                            </div>
                            <span className="text-xl font-bold">PawBit</span>
                        </div>
                        <p className="text-muted-foreground text-sm font-mono leading-relaxed">
                            {t('desc')}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">{t('navigation')}</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                                    {t('home')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/feedings" className="text-muted-foreground hover:text-primary transition-colors">
                                    {t('gallery')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/leaderboard" className="text-muted-foreground hover:text-primary transition-colors">
                                    {t('leaderboard')}
                                </Link>
                            </li>

                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">{t('legal')}</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                                    {t('privacyPolicy')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                                    {t('termsOfService')}
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookies" className="text-muted-foreground hover:text-primary transition-colors">
                                    {t('cookiePolicy')}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">{t('contact')}</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex flex-col gap-1 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-primary" />
                                    <span>angel.murtev@pmggd.bg</span>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                    <span>raya.sokolova@pmggd.bg</span>
                                </div>
                            </li>
                            <li className="flex flex-col gap-1 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-primary" />
                                    <span>+359888940560</span>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                    <span>+359877202811</span>
                                </div>
                            </li>
                            <li className="flex items-center gap-2 text-muted-foreground">
                                <MapPin size={16} className="text-primary" />
                                <span>{t('location')}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground font-mono">
                        © {new Date().getFullYear()} PawBit. {t('rights')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t('madeWith')}</span>
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <span>{t('forAnimals')}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
