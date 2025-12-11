"use client";

import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'accent' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    href?: string;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    icon,
    href,
    ...props
}: ButtonProps) {
    // Playful, tactile base styles
    // hover: Lift up slightly + increased shadow
    // active: Push down + remove shadow + slight scale down (squash)
    const baseStyles = "relative inline-flex cursor-pointer items-center justify-center font-bold uppercase tracking-wider transition-all duration-200 border-2 border-foreground rounded-xl shadow-[3px_3px_0px_0px_rgba(60,50,30,1)] hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(60,50,30,1)] active:translate-y-1 active:shadow-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0 disabled:shadow-[3px_3px_0px_0px_rgba(60,50,30,1)] whitespace-nowrap";

    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90",
        outline: "bg-transparent text-foreground hover:bg-muted bg-white"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-lg"
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={classes}>
                {icon && <span className="mr-2">{icon}</span>}
                {children}
            </Link>
        );
    }

    return (
        <button
            className={classes}
            {...props}
        >
            {icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
}
