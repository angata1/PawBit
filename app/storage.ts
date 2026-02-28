import { Feeder, Donation, User } from './types';

let feeders: Feeder[] = [
    {
        id: '1',
        name: 'Central Park Feeder',
        location: {
            lat: 42.6977,
            lng: 23.3219,
            address: 'Central Park, Sofia',
        },
        status: 'active',
        foodLevel: 80,
        animalsDetected: 2,
        lastFeeding: '2 hours ago',
        liveStreamUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: '2',
        name: 'Vitosha Blvd Station',
        location: {
            lat: 42.6920,
            lng: 23.3200,
            address: 'Vitosha Blvd, Sofia',
        },
        status: 'active',
        foodLevel: 45,
        animalsDetected: 0,
        lastFeeding: '5 hours ago',
        liveStreamUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop'
    },
    {
        id: '3',
        name: 'NDK Park Unit',
        location: {
            lat: 42.6850,
            lng: 23.3190,
            address: 'National Palace of Culture',
        },
        status: 'maintenance',
        foodLevel: 10,
        animalsDetected: 5,
        lastFeeding: '1 day ago',
        liveStreamUrl: 'https://images.unsplash.com/photo-1519052537078-e6302a4968ef?q=80&w=1744&auto=format&fit=crop'
    },
];

let users: User[] = [
    {
        id: 'u1',
        name: 'Alice Johnson',
        isAnonymous: false,
        totalDonated: 150.50,
        balance: 0
    },
    {
        id: 'u2',
        name: 'Bob Smith',
        isAnonymous: false,
        totalDonated: 225.75,
        balance: 0
    },
    {
        id: 'u3',
        name: 'Charlie Brown',
        isAnonymous: false,
        totalDonated: 185.25,
        balance: 0
    },
    {
        id: 'u4',
        name: 'Anonymous',
        isAnonymous: true,
        totalDonated: 95.00,
        balance: 0
    },
    {
        id: 'u5',
        name: 'Emily Davis',
        isAnonymous: false,
        totalDonated: 310.00,
        balance: 0
    },
    {
        id: 'u6',
        name: 'Frank Wilson',
        isAnonymous: false,
        totalDonated: 75.50,
        balance: 0
    },
    {
        id: 'u7',
        name: 'Grace Lee',
        isAnonymous: false,
        totalDonated: 120.25,
        balance: 0
    },
    {
        id: 'u8',
        name: 'Anonymous',
        isAnonymous: true,
        totalDonated: 55.00,
        balance: 0
    }
];

let donations: Donation[] = [
    {
        id: 'd1',
        donorName: 'Alice',
        donorId: 'u1',
        amount: 5,
        feederId: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        message: 'For the kitties!'
    },
    {
        id: 'd2',
        donorName: 'Bob',
        donorId: 'u2',
        amount: 10,
        feederId: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        message: 'Keep up the good work'
    }
];

export const Storage = {
    getFeeders: (): Feeder[] => {
        return feeders;
    },
    getFeeder: (id: string): Feeder | undefined => {
        return feeders.find(f => f.id === id);
    },
    getDonations: (): Donation[] => {
        return donations;
    },
    addDonation: (donation: Donation) => {
        donations.push(donation);
    },
    updateFeeder: (updatedFeeder: Feeder) => {
        feeders = feeders.map(f => f.id === updatedFeeder.id ? updatedFeeder : f);
    },
    getUsers: (): User[] => {
        return users;
    },
    distributeFoodFlow: (amount: number, user: User) => {
        // Mock implementation: distribute to random feeders
        console.log(`Distributing ${amount} from ${user.name}`);
        // In a real app, this would update multiple feeders
    }
};
