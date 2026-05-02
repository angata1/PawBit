import { Cookie, ShieldCheck, Settings, BarChart2, Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export const metadata = {
    title: "Cookie Policy – PawBit",
    description:
        "Learn how PawBit uses cookies and similar technologies to keep your session alive and improve the platform.",
};

function renderLine(line: string) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
}

export default function CookiesPage() {
    const t = useTranslations("Cookies");

    const sections = [
        {
            icon: Cookie,
            title: t("sections.what.title"),
            content: [
                t("sections.what.p1"),
                t("sections.what.p2"),
            ],
        },
        {
            icon: ShieldCheck,
            title: t("sections.essential.title"),
            content: [
                t("sections.essential.p1"),
                t("sections.essential.p2"),
                t("sections.essential.p3"),
            ],
        },
        {
            icon: BarChart2,
            title: t("sections.functional.title"),
            content: [
                t("sections.functional.p1"),
                t("sections.functional.p2"),
            ],
        },
        {
            icon: Settings,
            title: t("sections.thirdParty.title"),
            content: [
                t("sections.thirdParty.p1"),
                t("sections.thirdParty.p2"),
                t("sections.thirdParty.p3"),
            ],
        },
        {
            icon: Lock,
            title: t("sections.control.title"),
            content: [
                t("sections.control.p1"),
                t("sections.control.p2"),
                t("sections.control.p3"),
            ],
        },
        {
            icon: Mail,
            title: t("sections.contact.title"),
            content: [
                t("sections.contact.p1"),
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 border-2 border-accent mb-6 neu-shadow-sm">
                        <Cookie className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
                    <p className="text-muted-foreground font-mono text-sm">
                        {t("updated")}
                    </p>
                    <p className="mt-4 text-muted-foreground font-mono leading-relaxed max-w-xl mx-auto">
                        {t("intro")}
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
                                <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                                    <Icon className="w-5 h-5 text-accent-foreground" />
                                </div>
                                <h2 className="text-xl font-bold">{title}</h2>
                            </div>
                            <ul className="space-y-2">
                                {content.map((line, i) => (
                                    <li
                                        key={i}
                                        className="flex gap-2 text-muted-foreground font-mono text-sm leading-relaxed"
                                    >
                                        <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-accent/60 block" />
                                        <span>{renderLine(line)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-center text-xs text-muted-foreground font-mono">
                    {t("footer")}
                </p>
            </div>
        </div>
    );
}
