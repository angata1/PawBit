"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    className?: string;
}

export default function Input({ label, className = "", ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-2 mb-4">
            <label className="font-bold text-sm uppercase tracking-wide text-foreground/80">
                {label}
            </label>
            <input
                className={`
          bg-white border-2 border-foreground rounded-lg px-4 py-3
          focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary
          neu-shadow-sm transition-all duration-200
          ${className}
        `}
                {...props}
            />
        </div>
    );
}
