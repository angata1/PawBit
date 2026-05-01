export interface OverviewStats {
    totalRevenue: number;
    revenueThisMonth: number;
    totalMeals: number;
    mealsThisMonth: number;
    totalUsers: number;
    totalWalletBalance: number;
    totalFeeders: number;
    activeFeeders: number;
    offlineFeeders: number;
    disabledFeeders: number;
    avgFoodLevel: number;
    totalAnimalsDetected: number;
}

export interface ChartDay {
    date: string;
    revenue?: number;
    meals?: number;
}

export interface Feeder {
    id: string | number;
    name: string;
    location?: { address: string; lat: number; lng: number; pi_key?: string };
    enabled: boolean;
    stock_level?: number;
    left_overs?: number;
    dispense_price_eur?: number;
    importance_rank?: number;
    created_at?: string;
    pi_auth_key?: string;
    last_seen_at?: string;
}

export interface Donor {
    name: string;
    email: string;
    total: number;
}

export interface Transaction {
    id: string;
    user: string;
    amount: number;
    type: string;
    date: string;
}

export interface AdminData {
    overview: OverviewStats;
    charts: {
        revenueByDay: ChartDay[];
        mealsByDay: ChartDay[];
    };
    feeders: Feeder[];
    topDonors: Donor[];
    recentTransactions: Transaction[];
}
