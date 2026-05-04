import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type DonationRow = {
    id: number;
    user_auth_id: string | null;
    amount_eur: number | null;
    created_at: string;
    type: string | null;
};

type MealRow = {
    time_of_meal: string;
};

type FeederRow = {
    enabled: boolean | null;
    last_seen_at: string | null;
    stock_level: number | null;
    left_overs: number | null;
};

type UserRow = {
    auth_id: string;
    name: string | null;
    email: string | null;
    balance: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (dbUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // --- Feeders ---
        const { data: feedersRaw, error: feedersError } = await supabase
            .from('feeders')
            .select('*');

        // --- Donations (revenue & transactions) ---
        const { data: donationsRaw, error: donationsError } = await supabase
            .from('donations')
            .select('*')
            .order('created_at', { ascending: false });

        // --- Meals ---
        const { data: mealsRaw, error: mealsError } = await supabase
            .from('meals')
            .select('*')
            .order('time_of_meal', { ascending: false });

        // --- Users ---
        const { data: usersRaw, error: usersError } = await supabase
            .from('users')
            .select('*');

        if (feedersError || donationsError || mealsError || usersError) {
            const msg =
                feedersError?.message ||
                donationsError?.message ||
                mealsError?.message ||
                usersError?.message ||
                'Failed to fetch stats data';
            return NextResponse.json({ error: msg }, { status: 500 });
        }

        // === Derived Analytics ===

        // Total revenue = sum of all deposit transactions (positive amount_eur)
        const allDonations = asArray<DonationRow>(donationsRaw as unknown);
        const depositTxns = allDonations.filter((d) => (d.amount_eur ?? 0) > 0);
        const totalRevenue = depositTxns.reduce((sum, d) => sum + (d.amount_eur || 0), 0);

        // Revenue last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const revenueThisMonth = depositTxns
            .filter((d) => new Date(d.created_at) >= thirtyDaysAgo)
            .reduce((sum, d) => sum + (d.amount_eur || 0), 0);

        // Revenue chart: last 14 days grouped by day
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            return d.toISOString().split('T')[0];
        });
        const revenueByDay = last14Days.map(day => {
            const dayRevenue = depositTxns
                .filter((d) => d.created_at?.startsWith(day))
                .reduce((sum, d) => sum + (d.amount_eur || 0), 0);
            return { date: day, revenue: parseFloat(dayRevenue.toFixed(2)) };
        });

        // Meals / feedings count
        const allMeals = asArray<MealRow>(mealsRaw as unknown);
        const totalMeals = allMeals.length;
        const mealsThisMonth = allMeals.filter((m) => new Date(m.time_of_meal) >= thirtyDaysAgo).length;

        // Meals by day (last 14)
        const mealsByDay = last14Days.map(day => {
            const count = allMeals.filter((m) => (m.time_of_meal || '').startsWith(day)).length;
            return { date: day, meals: count };
        });

        // Feeder status: derive from enabled + last_seen_at
        const allFeeders = asArray<FeederRow>(feedersRaw as unknown);
        const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
        const now = Date.now();

        const disabledFeeders = allFeeders.filter((f) => f.enabled === false);
        const enabledFeeders = allFeeders.filter((f) => f.enabled === true);
        const onlineFeeders = enabledFeeders.filter((f) =>
            f.last_seen_at && (now - new Date(f.last_seen_at).getTime()) < OFFLINE_THRESHOLD_MS
        );
        const offlineFeeders = enabledFeeders.filter((f) =>
            !f.last_seen_at || (now - new Date(f.last_seen_at).getTime()) >= OFFLINE_THRESHOLD_MS
        );

        // Food levels
        const avgFoodLevel = allFeeders.length > 0
            ? Math.round(allFeeders.reduce((s, f) => s + (f.stock_level ?? 0), 0) / allFeeders.length)
            : 0;

        // Users stats
        const allUsers = asArray<UserRow>(usersRaw as unknown);
        const totalUsers = allUsers.length;
        const totalWalletBalance = allUsers.reduce((s, u) => s + (u.balance || 0), 0);

        // Top donors (by sum of positive deposits)
        const donorMap: Record<string, number> = {};
        depositTxns.forEach((d) => {
            if (d.user_auth_id) {
                donorMap[d.user_auth_id] = (donorMap[d.user_auth_id] || 0) + (d.amount_eur || 0);
            }
        });
        const topDonors = Object.entries(donorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([auth_id, total]) => {
                const u = allUsers.find((u) => u.auth_id === auth_id);
                return {
                    name: u?.name || 'Anonymous',
                    email: u?.email || '',
                    total: parseFloat(total.toFixed(2))
                };
            });

        // Recent transactions (last 10)
        const recentTransactions = allDonations.slice(0, 10).map((d) => {
            const u = allUsers.find((u) => u.auth_id === d.user_auth_id);
            return {
                id: d.id,
                user: u?.name || 'Anonymous',
                amount: d.amount_eur,
                type: d.type,
                date: d.created_at
            };
        });

        // Animals detected across feeders (leftovers)
        const totalAnimalsDetected = allFeeders.reduce((s, f) =>
            s + (f.left_overs ?? 0), 0);

        return NextResponse.json({
            overview: {
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                revenueThisMonth: parseFloat(revenueThisMonth.toFixed(2)),
                totalMeals,
                mealsThisMonth,
                totalUsers,
                totalWalletBalance: parseFloat(totalWalletBalance.toFixed(2)),
                totalFeeders: allFeeders.length,
                activeFeeders: onlineFeeders.length,
                offlineFeeders: offlineFeeders.length,
                disabledFeeders: disabledFeeders.length,
                avgFoodLevel,
                totalAnimalsDetected,
            },
            charts: {
                revenueByDay,
                mealsByDay,
            },
            feeders: allFeeders,
            topDonors,
            recentTransactions,
        });

    } catch (error: unknown) {
        console.error('Admin stats error:', error);
        const message = isRecord(error) && typeof error.message === 'string' ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
