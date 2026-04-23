import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}

export const StatCard = ({
    title, value, subtitle, icon: Icon, color, trend, trendValue
}: StatCardProps) => (
    <div className="bg-white border-2 border-foreground rounded-2xl p-5 shadow-[3px_3px_0px_rgba(60,50,30,0.8)] hover:shadow-[5px_5px_0px_rgba(60,50,30,0.8)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl border-2 border-foreground ${color}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            {trendValue && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-green-100 text-green-700' : trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                    {trendValue}
                </div>
            )}
        </div>
        <div>
            <p className="text-2xl font-black text-foreground mb-0.5">{value}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1 font-mono">{subtitle}</p>}
        </div>
    </div>
);
