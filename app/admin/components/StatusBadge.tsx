import React from 'react';
import { CheckCircle, Zap, AlertTriangle, XCircle, Activity } from 'lucide-react';

export const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
        online: 'bg-green-100 text-green-700 border-green-300',
        offline: 'bg-red-100 text-red-700 border-red-300',
        disabled: 'bg-gray-100 text-gray-700 border-gray-300',
        never_connected: 'bg-gray-50 text-gray-500 border-gray-200',
    };
    const icons: Record<string, any> = {
        online: CheckCircle,
        offline: XCircle,
        disabled: XCircle,
        never_connected: AlertTriangle,
    };
    const Icon = icons[status] || Activity;
    const formattedStatus = status.replace('_', ' ');
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${map[status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
            <Icon className="w-3 h-3" />
            {formattedStatus}
        </span>
    );
};
