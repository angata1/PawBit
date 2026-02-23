import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

export const metadata = {
    title: "Privacy Policy – PawBit",
    description:
        "Learn how PawBit collects, uses, and protects your personal information.",
};

const sections = [
    {
        icon: Eye,
        title: "Information We Collect",
        content: [
            "**Account data:** When you register, we collect your name, email address, and a hashed password.",
            "**Usage data:** We log interactions such as feeding events, donations, and pages visited in order to improve the service.",
            "**Payment data:** Donation payments are processed by Stripe. PawBit never stores your full card number, CVV, or billing address on our servers.",
            "**Device & technical data:** IP address, browser type, and operating system may be collected automatically for security and analytics purposes.",
        ],
    },
    {
        icon: Database,
        title: "How We Use Your Information",
        content: [
            "To create and manage your PawBit account.",
            "To process donations and send payment confirmations.",
            "To display your activity on the public leaderboard (only if you have not opted out).",
            "To send transactional emails such as donation receipts and important notices.",
            "To detect and prevent fraud or abuse of the platform.",
            "To improve our services through anonymised analytics.",
        ],
    },
    {
        icon: UserCheck,
        title: "Sharing Your Information",
        content: [
            "We do **not** sell, rent, or trade your personal data to third parties.",
            "We share data with **Stripe** (payment processing) and **Supabase** (database hosting) solely to operate the service. These providers are contractually obligated to keep your data secure.",
            "We may disclose information if required by law or to protect the rights and safety of users or animals in our care.",
        ],
    },
    {
        icon: Lock,
        title: "Data Security",
        content: [
            "All data in transit is encrypted via TLS/HTTPS.",
            "Passwords are hashed using industry-standard bcrypt before storage.",
            "We conduct regular security reviews of our infrastructure.",
            "In the event of a data breach, we will notify affected users within 72 hours in accordance with applicable law.",
        ],
    },
    {
        icon: Shield,
        title: "Your Rights",
        content: [
            "**Access:** You may request a copy of the personal data we hold about you.",
            "**Correction:** You may update inaccurate information at any time via your profile settings.",
            "**Deletion:** You may request deletion of your account and associated data by contacting us.",
            "**Opt-out:** You may opt out of the leaderboard and non-essential emails in your account settings.",
        ],
    },
    {
        icon: Mail,
        title: "Contact Us",
        content: [
            "If you have any questions or concerns about this Privacy Policy, please reach out to us:",
            "📧 angel.murtev@pmggd.bg",
            "📧 raya.sokolova@pmggd.bg",
            "📍 Gotse Delchev, Blagoevgrad, Bulgaria",
        ],
    },
];

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
    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary mb-6 neu-shadow-sm">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
                    <p className="text-muted-foreground font-mono text-sm">
                        Last updated: February 23, 2026
                    </p>
                    <p className="mt-4 text-muted-foreground font-mono leading-relaxed max-w-xl mx-auto">
                        At PawBit we take your privacy seriously. This policy explains what data
                        we collect, why we collect it, and how we keep it safe.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-6">
                    {sections.map(({ icon: Icon, title, content }, idx) => (
                        <div
                            key={idx}
                            className="bg-card border-2 border-border rounded-xl p-6 neu-shadow"
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
                    By using PawBit you agree to this Privacy Policy. We may update it from
                    time to time; continued use of the platform constitutes acceptance of any
                    changes.
                </p>
            </div>
        </div>
    );
}
