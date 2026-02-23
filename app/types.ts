export interface Feeder {
    id: string;
    name: string;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    status: 'active' | 'maintenance' | 'feeding' | 'offline';
    foodLevel: number;
    animalsDetected: number;
    lastFeeding?: string;
    liveStreamUrl?: string;
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
