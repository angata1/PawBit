import React from 'react';
import { 
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { TrendingUp, Zap, Users, Wifi, Battery, Activity, Clock } from 'lucide-react';
import { AdminData } from '../types';
import { StatCard } from './StatCard';

interface OverviewTabProps {
    data: AdminData;
    fmtCurrency: (v: number) => string;
    fmtDate: (d: string) => string;
    fmtShortDate: (d: string) => string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dateStr = label ? new Date(label).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
        return (
            <div className="bg-white border-2 border-foreground rounded-xl p-3 neu-shadow">
                <p className="text-xs font-bold text-muted-foreground mb-1 font-mono">{dateStr}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="text-sm font-black" style={{ color: p.color }}>
                        {p.name === 'revenue' ? `€${p.value}` : p.value}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{p.name}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const OverviewTab = ({ data, fmtCurrency, fmtDate, fmtShortDate }: OverviewTabProps) => {
    const PieColors = ['#22c55e', '#ef4444', '#9ca3af', '#e05c5c'];
    const feederStatuses = [
        { name: 'Online', value: data.overview.activeFeeders },
        { name: 'Offline', value: data.overview.offlineFeeders },
        { name: 'Disabled', value: data.overview.disabledFeeders },
    ].filter(s => s.value > 0);

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Key Metrics</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard
                        title="Total Revenue"
                        value={fmtCurrency(data.overview.totalRevenue)}
                        subtitle={`${fmtCurrency(data.overview.revenueThisMonth)} this month`}
                        icon={TrendingUp} color="bg-primary" trend="up" trendValue="MTD"
                    />
                    <StatCard
                        title="Total Meals"
                        value={data.overview.totalMeals.toLocaleString()}
                        subtitle={`${data.overview.mealsThisMonth} this month`}
                        icon={Zap} color="bg-accent" trend="up" trendValue="MTD"
                    />
                    <StatCard
                        title="Registered Users"
                        value={data.overview.totalUsers}
                        subtitle={`€${data.overview.totalWalletBalance.toFixed(0)} in wallets`}
                        icon={Users} color="bg-blue-500"
                    />
                    <StatCard
                        title="Active Feeders"
                        value={data.overview.activeFeeders}
                        subtitle={`of ${data.overview.totalFeeders} total`}
                        icon={Wifi}
                        color="bg-green-500"
                        trend={data.overview.offlineFeeders > 0 ? 'down' : 'neutral'}
                        trendValue={data.overview.offlineFeeders > 0 ? `${data.overview.offlineFeeders} offline` : undefined}
                    />
                    <StatCard
                        title="Avg Food Level"
                        value={`${data.overview.avgFoodLevel}%`}
                        subtitle="Across all feeders"
                        icon={Battery}
                        color={data.overview.avgFoodLevel < 30 ? 'bg-red-500' : data.overview.avgFoodLevel < 60 ? 'bg-yellow-500' : 'bg-green-500'}
                    />
                    <StatCard
                        title="Animals Detected"
                        value={data.overview.totalAnimalsDetected}
                        subtitle="Live across network"
                        icon={Activity} color="bg-purple-500"
                    />
                </div>
            </div>

            {/* Charts */}
            <div className="grid xl:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                    <h3 className="font-black text-lg mb-6">Revenue (14 days)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={data.charts.revenueByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7aa374" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7aa374" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tickFormatter={fmtShortDate} stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#7aa374" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                    <h3 className="font-black text-lg mb-6">Feedings Triggered (14 days)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.charts.mealsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <XAxis dataKey="date" tickFormatter={fmtShortDate} stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="meals" fill="#ecae78" radius={[4, 4, 0, 0]}>
                                {data.charts.mealsByDay.map((_, i) => (
                                    <Cell key={i} fill={i === data.charts.mealsByDay.length - 1 ? '#7aa374' : '#ecae78'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status & Donors */}
            <div className="grid xl:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                    <h3 className="font-black text-lg mb-4">Feeder Status</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={feederStatuses} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                {feederStatuses.map((_, i) => (
                                    <Cell key={i} fill={PieColors[i % PieColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="xl:col-span-2 bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                    <h3 className="font-black text-lg mb-5">Top Donors</h3>
                    <div className="space-y-3">
                        {data.topDonors.map((donor, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-foreground ${i === 0 ? 'bg-yellow-400' : 'bg-muted'}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{donor.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate">{donor.email}</p>
                                </div>
                                <p className="font-black text-primary">{fmtCurrency(donor.total)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
