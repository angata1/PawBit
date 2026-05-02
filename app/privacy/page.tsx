import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export const metadata = {
    title: "Privacy Policy – PawBit",
    description:
        "Learn how PawBit collects, uses, and protects your personal information.",
};

function renderLine(line: string) {
    // Bold markdown (**text**) → <strong>
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
}

export default function PrivacyPage() {
    const t = useTranslations("Privacy");

    const sections = [
        {
            icon: Eye,
            title: t('sections.collect.title'),
            content: [
                t('sections.collect.p1'),
                t('sections.collect.p2'),
                t('sections.collect.p3'),
                t('sections.collect.p4'),
            ],
        },
        {
            icon: Database,
            title: t('sections.use.title'),
            content: [
                t('sections.use.p1'),
                t('sections.use.p2'),
                t('sections.use.p3'),
                t('sections.use.p4'),
                t('sections.use.p5'),
                t('sections.use.p6'),
            ],
        },
        {
            icon: UserCheck,
            title: t('sections.sharing.title'),
            content: [
                t('sections.sharing.p1'),
                t('sections.sharing.p2'),
                t('sections.sharing.p3'),
            ],
        },
        {
            icon: Lock,
            title: t('sections.security.title'),
            content: [
                t('sections.security.p1'),
                t('sections.security.p2'),
                t('sections.security.p3'),
                t('sections.security.p4'),
            ],
        },
        {
            icon: Shield,
            title: t('sections.rights.title'),
            content: [
                t('sections.rights.p1'),
                t('sections.rights.p2'),
                t('sections.rights.p3'),
                t('sections.rights.p4'),
            ],
        },
        {
            icon: Mail,
            title: t('sections.contact.title'),
            content: [
                t('sections.contact.p1'),
                "📧 angel.murtev@pmggd.bg",
                "📧 raya.sokolova@pmggd.bg",
                "📍 Gotse Delchev, Blagoevgrad, Bulgaria",
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary mb-6 neu-shadow-sm">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">{t('title')}</h1>
                    <p className="text-muted-foreground font-mono text-sm">
                        {t('updated')}
                    </p>
                    <p className="mt-4 text-muted-foreground font-mono leading-relaxed max-w-xl mx-auto">
                        {t('intro')}
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-6">
                    {sections.map(({ icon: Icon, title, content }, idx) => (
                        <div
                            key={idx}
                            className="bg-card border-2 border-foreground rounded-xl p-6 neu-shadow"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                                    <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-xl font-bold">{title}</h2>
                            </div>
                            <ul className="space-y-2">
                                {content.map((line, i) => (
                                    <li
                                        key={i}
                                        className="flex gap-2 text-muted-foreground font-mono text-sm leading-relaxed"
                                    >
                                        <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60 block" />
                                        <span>{renderLine(line)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-center text-xs text-muted-foreground font-mono">
                    {t('footer')}
                </p>
            </div>
        </div>
    );
}
