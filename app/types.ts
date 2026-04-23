export type ConnectionStatus = 'online' | 'offline' | 'disabled' | 'never_connected';

export interface Feeder {
    id: string;
    name: string;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    enabled: boolean;
    lastSeenAt: string | null;
    connectionStatus: ConnectionStatus;
    foodLevel: number;
    animalsDetected: number;
    lastFeeding?: string;
    liveStreamUrl?: string;
}

// Utility: derive connection status from enabled + lastSeenAt
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export function deriveConnectionStatus(enabled: boolean, lastSeenAt: string | null): ConnectionStatus {
    if (!enabled) return 'disabled';
    if (!lastSeenAt) return 'never_connected';
    const elapsed = Date.now() - new Date(lastSeenAt).getTime();
    return elapsed < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
}

export function formatLastSeen(lastSeenAt: string | null): string {
    if (!lastSeenAt) return 'Never connected';
    const seconds = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export interface Donation {
    id: string;
    donorName: string;
    donorId: string;
    amount: number;
    feederId: string;
    timestamp: string;
    message?: string;
}

export interface User {
    id: string;
    name: string;
    isAnonymous: boolean;
    totalDonated: number;
    balance: number;
}
