import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
        const { data: feeders, error: feedersError } = await supabase
            .from('feeders')
            .select('*');

        // --- Donations (revenue & transactions) ---
        const { data: donations, error: donationsError } = await supabase
            .from('donations')
            .select('*')
            .order('created_at', { ascending: false });

        // --- Meals ---
        const { data: meals, error: mealsError } = await supabase
            .from('meals')
            .select('*')
            .order('triggered_at', { ascending: false });

        // --- Users ---
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');

        // === Derived Analytics ===

        // Total revenue = sum of all deposit transactions (positive amount_eur)
        const allDonations = donations || [];
        const depositTxns = allDonations.filter((d: any) => (d.amount_eur ?? 0) > 0);
        const totalRevenue = depositTxns.reduce((sum: number, d: any) => sum + (d.amount_eur || 0), 0);

        // Revenue last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const revenueThisMonth = depositTxns
            .filter((d: any) => new Date(d.created_at) >= thirtyDaysAgo)
            .reduce((sum: number, d: any) => sum + (d.amount_eur || 0), 0);

        // Revenue chart: last 14 days grouped by day
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            return d.toISOString().split('T')[0];
        });
        const revenueByDay = last14Days.map(day => {
            const dayRevenue = depositTxns
                .filter((d: any) => d.created_at?.startsWith(day))
                .reduce((sum: number, d: any) => sum + (d.amount_eur || 0), 0);
            return { date: day, revenue: parseFloat(dayRevenue.toFixed(2)) };
        });

        // Meals / feedings count
        const allMeals = meals || [];
        const totalMeals = allMeals.length;
        const mealsThisMonth = allMeals.filter((m: any) =>
            new Date(m.triggered_at || m.created_at) >= thirtyDaysAgo
        ).length;

        // Meals by day (last 14)
        const mealsByDay = last14Days.map(day => {
            const count = allMeals.filter((m: any) =>
                (m.triggered_at || m.created_at || '').startsWith(day)
            ).length;
            return { date: day, meals: count };
        });

        // Feeder status: derive from enabled + last_seen_at
        const allFeeders = feeders || [];
        const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
        const now = Date.now();

        const disabledFeeders = allFeeders.filter((f: any) => f.enabled === false);
        const enabledFeeders = allFeeders.filter((f: any) => f.enabled === true);
        const onlineFeeders = enabledFeeders.filter((f: any) =>
            f.last_seen_at && (now - new Date(f.last_seen_at).getTime()) < OFFLINE_THRESHOLD_MS
        );
        const offlineFeeders = enabledFeeders.filter((f: any) =>
            !f.last_seen_at || (now - new Date(f.last_seen_at).getTime()) >= OFFLINE_THRESHOLD_MS
        );

        // Food levels
        const avgFoodLevel = allFeeders.length > 0
            ? Math.round(allFeeders.reduce((s: number, f: any) => s + (f.stock_level ?? 0), 0) / allFeeders.length)
            : 0;

        // Users stats
        const allUsers = users || [];
        const totalUsers = allUsers.length;
        const totalWalletBalance = allUsers.reduce((s: number, u: any) => s + (u.balance || 0), 0);

        // Top donors (by sum of positive deposits)
        const donorMap: Record<string, number> = {};
        depositTxns.forEach((d: any) => {
            if (d.user_auth_id) {
                donorMap[d.user_auth_id] = (donorMap[d.user_auth_id] || 0) + (d.amount_eur || 0);
            }
        });
        const topDonors = Object.entries(donorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([auth_id, total]) => {
                const u = allUsers.find((u: any) => u.auth_id === auth_id);
                return {
                    name: u?.name || 'Anonymous',
                    email: u?.email || '',
                    total: parseFloat(total.toFixed(2))
                };
            });

        // Recent transactions (last 10)
        const recentTransactions = allDonations.slice(0, 10).map((d: any) => {
            const u = allUsers.find((u: any) => u.auth_id === d.user_auth_id);
            return {
                id: d.id,
                user: u?.name || 'Anonymous',
                amount: d.amount_eur,
                type: d.type,
                date: d.created_at
            };
        });

        // Animals detected across feeders (leftovers)
        const totalAnimalsDetected = allFeeders.reduce((s: number, f: any) =>
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

    } catch (error: any) {
        console.error('Admin stats error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
