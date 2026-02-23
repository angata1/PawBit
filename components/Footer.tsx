import Link from "next/link";
import { PawPrint, Heart, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-white border-t border-border mt-auto">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary p-2 rounded-lg border-2 border-foreground neu-shadow-sm">
                                <PawPrint className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold">PawBit</span>
                        </div>
                        <p className="text-muted-foreground text-sm font-mono leading-relaxed">
                            Connecting animal lovers with street animals through technology. Feed, donate, and watch live.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">Navigation</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/feedings" className="text-muted-foreground hover:text-primary transition-colors">
                                    Gallery
                                </Link>
                            </li>
                            <li>
                                <Link href="/leaderboard" className="text-muted-foreground hover:text-primary transition-colors">
                                    Leaderboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/donate" className="text-muted-foreground hover:text-primary transition-colors">
                                    Donate
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">Legal</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">Contact</h3>
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
                                <span>Gotse Delchev, Blagoevgrad, Bulgaria</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground font-mono">
                        © {new Date().getFullYear()} PawBit. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Made with</span>
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <span>for animals</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
