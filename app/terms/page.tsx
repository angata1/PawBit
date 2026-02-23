import { ScrollText, CreditCard, ShieldAlert, Gavel, AlertTriangle, Mail } from "lucide-react";

export const metadata = {
    title: "Terms of Service – PawBit",
    description:
        "Read the terms and conditions that govern your use of PawBit.",
};

const sections = [
    {
        icon: ScrollText,
        title: "Acceptance of Terms",
        content: [
            "By accessing or using PawBit (the \"Service\") you confirm that you are at least 13 years old and agree to be bound by these Terms of Service.",
            "If you are using the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these terms.",
            "We reserve the right to update these terms at any time. Continued use of the Service after changes are posted constitutes your acceptance of the revised terms.",
        ],
    },
    {
        icon: ScrollText,
        title: "Use of the Service",
        content: [
            "You may use PawBit solely for personal, non-commercial purposes related to the welfare of street animals, unless you have a written agreement with us for commercial use.",
            "You agree **not** to: impersonate another person, upload false or misleading content, attempt to reverse-engineer the Service, or interfere with its normal operation.",
            "You are responsible for keeping your account credentials secure. Notify us immediately at angel.murtev@pmggd.bg if you suspect unauthorised access.",
            "We may suspend or terminate your account if you violate these terms or misuse the platform.",
        ],
    },
    {
        icon: CreditCard,
        title: "Donations & Payments",
        content: [
            "All monetary donations made through PawBit are **voluntary and non-refundable** unless a technical error resulted in an incorrect charge.",
            "Payments are processed securely by Stripe. PawBit does not store full card details.",
            "Donations go toward purchasing food supplies and maintaining the smart feeder network. We publish periodic impact reports to demonstrate fund usage.",
            "If you believe you were charged incorrectly, contact us within 14 days at angel.murtev@pmggd.bg.",
        ],
    },
    {
        icon: ShieldAlert,
        title: "User Content",
        content: [
            "By submitting content (photos, comments, etc.) you grant PawBit a worldwide, royalty-free licence to display and distribute that content within the Service.",
            "You retain ownership of your content. We will not sell it to third parties.",
            "You agree not to upload content that is unlawful, harmful, abusive, or infringes on another's intellectual property.",
            "We reserve the right to remove any content that violates these terms or our community guidelines without prior notice.",
        ],
    },
    {
        icon: AlertTriangle,
        title: "Disclaimers & Limitation of Liability",
        content: [
            "The Service is provided **\"as is\"** without warranties of any kind, express or implied.",
            "PawBit is not liable for any indirect, incidental, or consequential damages arising from your use of the Service.",
            "We do not guarantee uninterrupted access to the Service; maintenance windows and outages may occur.",
            "Our total liability to you for any claim arising out of these terms shall not exceed the amount you donated to PawBit in the 12 months preceding the claim.",
        ],
    },
    {
        icon: Gavel,
        title: "Governing Law",
        content: [
            "These terms are governed by the laws of the Republic of Bulgaria.",
            "Any disputes shall be resolved in the competent courts of Blagoevgrad, Bulgaria.",
            "If any provision of these terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.",
        ],
    },
    {
        icon: Mail,
        title: "Contact Us",
        content: [
            "If you have questions about these Terms of Service, please reach out:",
            "📧 angel.murtev@pmggd.bg",
            "📧 raya.sokolova@pmggd.bg",
            "📞 +359888940560 / +359877202811",
            "📍 Gotse Delchev, Blagoevgrad, Bulgaria",
        ],
    },
];

function renderLine(line: string) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 border-2 border-accent mb-6 neu-shadow-sm">
                        <Gavel className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
                    <p className="text-muted-foreground font-mono text-sm">
                        Last updated: February 23, 2026
                    </p>
                    <p className="mt-4 text-muted-foreground font-mono leading-relaxed max-w-xl mx-auto">
                        Please read these terms carefully before using PawBit. They set out your
                        rights and responsibilities as a user of our platform.
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
                    By using PawBit you acknowledge that you have read, understood, and agree
                    to be bound by these Terms of Service.
                </p>
            </div>
        </div>
    );
}
