'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, Users, Zap, Wifi, WifiOff, AlertTriangle,
    DollarSign, Activity, RefreshCw, Plus, Trash2, Edit3,
    CheckCircle, XCircle, ChevronDown, ChevronUp, MapPin,
    BarChart2, Settings, LogOut, PawPrint, Package, ArrowUpRight,
    ArrowDownRight, Clock, X, Save, Loader2, Battery, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { deriveConnectionStatus, formatLastSeen } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OverviewStats {
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

interface ChartDay {
    date: string;
    revenue?: number;
    meals?: number;
}

interface Feeder {
    id: string | number;
    name: string;
    location?: { address: string; lat: number; lng: number; pi_key?: string };
    enabled: boolean;
    stock_level?: number;
    left_overs?: number;
    dispense_price_eur?: number;
    importance_rank?: number;
    created_at?: string;
    pi_auth_key?: string; // used temporarily after creation
    last_seen_at?: string;
}

interface Donor {
    name: string;
    email: string;
    total: number;
}

interface Transaction {
    id: string;
    user: string;
    amount: number;
    type: string;
    date: string;
}

interface AdminData {
    overview: OverviewStats;
    charts: {
        revenueByDay: ChartDay[];
        mealsByDay: ChartDay[];
    };
    feeders: Feeder[];
    topDonors: Donor[];
    recentTransactions: Transaction[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({
    title, value, subtitle, icon: Icon, color, trend, trendValue
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}) => (
    <div className="bg-white border-2 border-foreground rounded-2xl p-5 neu-shadow hover:neu-shadow-lg hover:-translate-y-0.5 transition-all duration-200">
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

const StatusBadge = ({ status }: { status: string }) => {
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

// ─── Add Feeder Modal ─────────────────────────────────────────────────────────
const AddFeederModal = ({ onClose, onAdd }: { onClose: () => void; onAdd: (feeder: Feeder) => void }) => {
    const [form, setForm] = useState({ name: '', address: '', lat: '42.6977', lng: '23.3219', status: 'active', food_level: '100', dispense_price_eur: '2.00' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdKey, setCreatedKey] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/feeders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    lat: parseFloat(form.lat),
                    lng: parseFloat(form.lng),
                    food_level: parseInt(form.food_level),
                    dispense_price_eur: parseFloat(form.dispense_price_eur),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create feeder');
            onAdd(data.feeder);
            if (data.feeder.pi_auth_key) {
                setCreatedKey(data.feeder.pi_auth_key);
            } else {
                onClose();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (createdKey) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl border-2 border-foreground neu-shadow-lg w-full max-w-md p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black">Feeder Created!</h2>
                    <p className="text-sm font-mono text-muted-foreground">Please copy the Raspberry Pi Registration Key below. You will need it to connect the python script.</p>
                    <div className="bg-muted p-4 rounded-xl border border-border select-all font-mono text-sm break-all font-bold">
                        {createdKey}
                    </div>
                    <button onClick={onClose} className="w-full px-4 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white shadow-sm mt-4 hover:bg-primary/90">
                        I have copied the key
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border-2 border-foreground neu-shadow-lg w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b-2 border-border">
                    <h2 className="text-xl font-black flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add New Feeder</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 text-sm font-mono">{error}</div>}
                    {[
                        { label: 'Feeder Name', key: 'name', type: 'text', placeholder: 'e.g. Central Park Feeder' },
                        { label: 'Address', key: 'address', type: 'text', placeholder: 'e.g. Vitosha Blvd, Sofia' },
                        { label: 'Latitude', key: 'lat', type: 'number', placeholder: '42.6977' },
                        { label: 'Longitude', key: 'lng', type: 'number', placeholder: '23.3219' },
                        { label: 'Food Level (%)', key: 'food_level', type: 'number', placeholder: '100' },
                        { label: 'Meal Price (EUR)', key: 'dispense_price_eur', type: 'number', placeholder: '2.00' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{f.label}</label>
                            <input
                                type={f.type}
                                value={(form as any)[f.key]}
                                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                required={f.key === 'name' || f.key === 'address'}
                                className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Status</label>
                        <select
                            value={form.status}
                            onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        >
                            {['active', 'maintenance', 'offline'].map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border-2 border-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-sm text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? 'Saving...' : 'Save Feeder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
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

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'feeders' | 'transactions' | 'pools'>('overview');
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [showAddFeeder, setShowAddFeeder] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingFeeder, setEditingFeeder] = useState<Feeder | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [feedersExpanded, setFeedersExpanded] = useState<Record<string, boolean>>({});
    const [userEmail, setUserEmail] = useState('');

    // Pool management state
    const [pools, setPools] = useState<any[]>([]);
    const [poolLoading, setPoolLoading] = useState(false);
    const [poolAction, setPoolAction] = useState<'add' | 'deduct'>('deduct');
    const [poolAmount, setPoolAmount] = useState('');
    const [poolReason, setPoolReason] = useState('');
    const [poolMessage, setPoolMessage] = useState('');

    const supabase = createClient();

    const fetchData = useCallback(async (showRefreshAnimation = false) => {
        if (showRefreshAnimation) setRefreshing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }

            const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
            if (dbUser?.role !== 'admin') {
                window.location.href = '/';
                return;
            }
            const res = await fetch('/api/admin/stats');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to load data');
            }
            const json = await res.json();
            setData(json);
            setError('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase.auth]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || '');
        };
        init();
        fetchData();
    }, [fetchData]);

    const handleDeleteFeeder = async (id: string | number) => {
        if (!confirm('Delete this feeder permanently?')) return;
        setDeletingId(String(id));
        try {
            const res = await fetch(`/api/admin/feeders/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setData(prev => prev ? { ...prev, feeders: prev.feeders.filter(f => f.id !== id) } : prev);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleUpdateFeeder = async (feeder: Feeder) => {
        try {
            const body = {
                name: editForm.name,
                location: {
                    ...feeder.location,
                    address: editForm.address,
                    lat: parseFloat(editForm.lat),
                    lng: parseFloat(editForm.lng),
                },
                enabled: editForm.status === 'enabled',
                stock_level: parseInt(editForm.stock_level, 10),
                left_overs: parseInt(editForm.left_overs, 10),
                dispense_price_eur: parseFloat(editForm.dispense_price_eur),
            };
            const res = await fetch(`/api/admin/feeders/${feeder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to update');
            const updated = await res.json();
            setData(prev => prev ? {
                ...prev,
                feeders: prev.feeders.map(f => f.id === feeder.id ? updated.feeder : f)
            } : prev);
            setEditingFeeder(null);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    // ── Pool management ──
    const fetchPools = useCallback(async () => {
        setPoolLoading(true);
        try {
            const res = await fetch('/api/admin/pools');
            if (!res.ok) throw new Error('Failed to load pools');
            const json = await res.json();
            setPools(json.pools || []);
        } catch (e: any) {
            console.error('Pool fetch error:', e);
        } finally {
            setPoolLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'pools') fetchPools();
    }, [activeTab, fetchPools]);

    const handlePoolAction = async () => {
        const amt = parseFloat(poolAmount);
        if (!amt || amt <= 0) return;
        setPoolLoading(true);
        setPoolMessage('');
        try {
            const res = await fetch('/api/admin/pools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: poolAction, amount: amt, reason: poolReason || 'admin_adjustment' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Action failed');
            setPoolMessage(`✅ Successfully ${poolAction === 'deduct' ? 'deducted' : 'added'} €${amt.toFixed(2)}`);
            setPoolAmount('');
            setPoolReason('');
            fetchPools();
        } catch (e: any) {
            setPoolMessage(`❌ ${e.message}`);
        } finally {
            setPoolLoading(false);
        }
    };

    const fmtCurrency = (v: number) => `€${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const fmtShortDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    // Color palette
    const CHART_COLORS = ['#7aa374', '#ecae78', '#86c4b4', '#f4c05a', '#c47ab4'];

    const PieColors = ['#22c55e', '#ef4444', '#9ca3af', '#e05c5c'];
    const feederStatuses = data ? [
        { name: 'Online', value: data.overview.activeFeeders },
        { name: 'Offline', value: data.overview.offlineFeeders },
        { name: 'Disabled', value: data.overview.disabledFeeders },
    ].filter(s => s.value > 0) : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-mono text-muted-foreground">Loading admin data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">

            {/* ── Top Bar ── */}
            <header className="sticky top-[73px] z-40 bg-white/95 backdrop-blur-md border-b-2 border-foreground">
                {/* Tab navigation — horizontally scrollable on mobile */}
                <div className="px-2 sm:px-6 flex items-center justify-between bg-muted/30">
                    <div className="flex gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
                        {[
                            { key: 'overview', label: 'Overview', icon: BarChart2 },
                            { key: 'feeders', label: `Feeders (${data?.feeders.length ?? 0})`, icon: Package },
                            { key: 'transactions', label: 'Transactions', icon: DollarSign },
                            { key: 'pools', label: 'Pools', icon: Battery },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key as any)}
                                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <t.icon className="w-4 h-4" />
                                <span className="hidden xs:inline sm:inline">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-foreground rounded-lg text-xs font-bold hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0 ml-4"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </header>

            {/* ── Error banner ── */}
            {error && (
                <div className="bg-red-50 border-b-2 border-red-300 px-6 py-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-sm font-mono text-red-700">{error}</span>
                    <span className="text-xs text-red-500 ml-auto">Data may be unavailable — check Supabase tables</span>
                </div>
            )}

            <main className="px-3 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">

                {/* ══════════ OVERVIEW TAB ══════════ */}
                {activeTab === 'overview' && data && (
                    <div className="space-y-8">

                        {/* KPI Cards */}
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Key Metrics</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                                <StatCard
                                    title="Total Revenue"
                                    value={fmtCurrency(data.overview.totalRevenue)}
                                    subtitle={`${fmtCurrency(data.overview.revenueThisMonth)} this month`}
                                    icon={TrendingUp}
                                    color="bg-primary"
                                    trend="up"
                                    trendValue="MTD"
                                />
                                <StatCard
                                    title="Total Meals"
                                    value={data.overview.totalMeals.toLocaleString()}
                                    subtitle={`${data.overview.mealsThisMonth} this month`}
                                    icon={Zap}
                                    color="bg-accent"
                                    trend="up"
                                    trendValue="MTD"
                                />
                                <StatCard
                                    title="Registered Users"
                                    value={data.overview.totalUsers}
                                    subtitle={`€${data.overview.totalWalletBalance.toFixed(0)} in wallets`}
                                    icon={Users}
                                    color="bg-blue-500"
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
                                    title="Cats Detected"
                                    value={data.overview.totalAnimalsDetected}
                                    subtitle="Live across network"
                                    icon={Activity}
                                    color="bg-purple-500"
                                />
                            </div>
                        </div>

                        {/* Revenue & Meals Charts */}
                        <div className="grid xl:grid-cols-2 gap-6">
                            <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-black text-lg">Revenue (14 days)</h3>
                                        <p className="text-sm text-muted-foreground font-mono">Wallet top-ups &amp; deposits</p>
                                    </div>
                                    <div className="bg-primary/10 px-3 py-1 rounded-lg border border-primary/30">
                                        <span className="text-sm font-bold text-primary">{fmtCurrency(data.overview.revenueThisMonth)}</span>
                                        <span className="text-xs text-muted-foreground ml-1">/ mo</span>
                                    </div>
                                </div>
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
                                        <Area type="monotone" dataKey="revenue" stroke="#7aa374" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#7aa374' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-black text-lg">Feedings Triggered (14 days)</h3>
                                        <p className="text-sm text-muted-foreground font-mono">Dispensed meals per day</p>
                                    </div>
                                    <div className="bg-accent/10 px-3 py-1 rounded-lg border border-accent/30">
                                        <span className="text-sm font-bold text-accent-foreground">{data.overview.mealsThisMonth}</span>
                                        <span className="text-xs text-muted-foreground ml-1">/ mo</span>
                                    </div>
                                </div>
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

                        {/* Feeder status pie + Top donors side-by-side */}
                        <div className="grid xl:grid-cols-3 gap-6">
                            {/* Feeder Status Distribution */}
                            <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                                <h3 className="font-black text-lg mb-1">Feeder Status</h3>
                                <p className="text-sm text-muted-foreground font-mono mb-4">Network health overview</p>
                                {feederStatuses.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={feederStatuses} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                                {feederStatuses.map((_, i) => (
                                                    <Cell key={i} fill={PieColors[i % PieColors.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => [v, 'feeders']} />
                                            <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-bold">{v}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm font-mono">
                                        No feeder data available.<br />Check Supabase `feeders` table.
                                    </div>
                                )}
                            </div>

                            {/* Top Donors */}
                            <div className="xl:col-span-2 bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                                <h3 className="font-black text-lg mb-1">Top Donors</h3>
                                <p className="text-sm text-muted-foreground font-mono mb-5">Highest lifetime deposits</p>
                                {data.topDonors.length > 0 ? (
                                    <div className="space-y-3">
                                        {data.topDonors.map((donor, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-foreground flex-shrink-0 ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-orange-300' : 'bg-muted'}`}>
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate">{donor.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono truncate">{donor.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-primary">{fmtCurrency(donor.total)}</p>
                                                    <div className="h-1.5 bg-muted rounded-full mt-1 w-24">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, (donor.total / (data.topDonors[0]?.total || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-muted-foreground text-sm font-mono border-2 border-dashed border-foreground/10 rounded-xl">
                                        No donor data yet.<br />Donations will appear here once users top up their wallets.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="font-black text-lg">Recent Transactions</h3>
                                    <p className="text-sm text-muted-foreground font-mono">Latest platform activity</p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('transactions')}
                                    className="text-sm font-bold text-primary hover:underline"
                                >
                                    View All →
                                </button>
                            </div>
                            {data.recentTransactions.length > 0 ? (
                                <div className="space-y-2">
                                    {data.recentTransactions.slice(0, 8).map((tx, i) => (
                                        <div key={tx.id || i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0 text-lg ${tx.amount > 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                                                    {tx.amount > 0 ? '↓' : '🐾'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{tx.user}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{tx.type?.replace('deposit:', 'Deposit ').replace('feeding', 'Feeding')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount?.toFixed(2)}€
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-end">
                                                    <Clock className="w-3 h-3" />
                                                    {tx.date ? fmtDate(tx.date) : '–'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-muted-foreground text-sm font-mono border-2 border-dashed border-foreground/10 rounded-xl">
                                    No transactions found. Check Supabase `donations` table.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════ FEEDERS TAB ══════════ */}
                {activeTab === 'feeders' && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black">Feeder Management</h2>
                                <p className="text-sm text-muted-foreground font-mono">Manage and monitor your hardware network</p>
                            </div>
                            <button
                                onClick={() => setShowAddFeeder(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white text-sm neu-shadow hover:neu-shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add Feeder
                            </button>
                        </div>

                        {/* Summary row */}
                        {data && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total', value: data.feeders.length, color: 'bg-primary' },
                                    { label: 'Online', value: data.overview.activeFeeders, color: 'bg-green-500' },
                                    { label: 'Offline', value: data.overview.offlineFeeders, color: 'bg-red-500' },
                                    { label: 'Disabled', value: data.overview.disabledFeeders, color: 'bg-gray-500' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white border-2 border-foreground rounded-xl p-4 neu-shadow flex items-center gap-3">
                                        <div className={`w-2 h-10 rounded-full ${s.color}`} />
                                        <div>
                                            <p className="text-2xl font-black">{s.value}</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Feeders list */}
                        {data?.feeders.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-foreground/30 rounded-2xl p-12 text-center">
                                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <h3 className="font-bold text-lg mb-2">No feeders in database</h3>
                                <p className="text-muted-foreground text-sm font-mono mb-5">
                                    Your Supabase `feeders` table is empty. Add your first feeder to get started.
                                </p>
                                <button
                                    onClick={() => setShowAddFeeder(true)}
                                    className="px-6 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white text-sm"
                                >
                                    Add First Feeder
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(data?.feeders || []).map(feeder => {
                                    const foodLevel = feeder.stock_level ?? 0;
                                    const animals = feeder.left_overs ?? 0;
                                    const connectionStatus = deriveConnectionStatus(feeder.enabled, feeder.last_seen_at || null);
                                    const isEditing = editingFeeder?.id === feeder.id;
                                    const isDeleting = deletingId === String(feeder.id);

                                    return (
                                        <div key={feeder.id} className="bg-white border-2 border-foreground rounded-2xl neu-shadow overflow-hidden">
                                            {/* Main row */}
                                            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                                {/* Status indicator */}
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                                    connectionStatus === 'online' ? 'bg-green-500 animate-pulse' :
                                                    connectionStatus === 'disabled' ? 'bg-gray-400' : 'bg-red-500'
                                                }`} />

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <h3 className="font-black text-base">{feeder.name}</h3>
                                                        <StatusBadge status={connectionStatus} />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {feeder.location?.address} • Last seen: {formatLastSeen(feeder.last_seen_at || null)}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Pi Key:</span>
                                                        <code className="text-[10px] bg-muted px-2 py-1 rounded border border-foreground/10 font-mono select-all cursor-copy hover:bg-muted/80 transition-colors">
                                                            {feeder.pi_auth_key || 'No key'}
                                                        </code>
                                                    </div>
                                                </div>

                                                {/* Metrics */}
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="text-center">
                                                        <p className="font-black text-primary">{foodLevel}%</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Food</p>
                                                        <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                                                            <div className={`h-full rounded-full transition-all ${foodLevel > 60 ? 'bg-green-500' : foodLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${foodLevel}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-black text-accent-foreground">{animals}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Leftovers</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-black text-primary">€{Number(feeder.dispense_price_eur || 2).toFixed(2)}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Meal</p>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                                                        ID: {String(feeder.id).slice(0, 8)}...
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setEditingFeeder(feeder);
                                                            setEditForm({
                                                                name: feeder.name || '',
                                                                address: feeder.location?.address || '',
                                                                lat: feeder.location?.lat?.toString() || '0',
                                                                lng: feeder.location?.lng?.toString() || '0',
                                                                status: feeder.enabled ? 'enabled' : 'disabled',
                                                                stock_level: feeder.stock_level?.toString() || '0',
                                                                left_overs: feeder.left_overs?.toString() || '0',
                                                                dispense_price_eur: feeder.dispense_price_eur?.toString() || '2.00',
                                                            });
                                                        }}
                                                        className="p-2 rounded-lg border-2 border-foreground/20 hover:border-primary hover:bg-primary/10 transition-colors"
                                                        title="Edit feeder"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteFeeder(feeder.id)}
                                                        disabled={isDeleting}
                                                        className="p-2 rounded-lg border-2 border-foreground/20 hover:border-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                        title="Delete feeder"
                                                    >
                                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                    <Link
                                                        href={`/feeder/${feeder.id}`}
                                                        className="p-2 rounded-lg border-2 border-foreground/20 hover:border-accent hover:bg-accent/10 transition-colors"
                                                        title="View public page"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Inline edit panel */}
                                            {isEditing && (
                                                <div className="border-t-2 border-border bg-muted/30 px-5 py-4 flex flex-col gap-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
                                                            <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Address</label>
                                                            <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Latitude</label>
                                                            <input type="number" step="any" value={editForm.lat} onChange={e => setEditForm({ ...editForm, lat: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Longitude</label>
                                                            <input type="number" step="any" value={editForm.lng} onChange={e => setEditForm({ ...editForm, lng: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Food Level (%)</label>
                                                            <input type="number" min="0" max="100" value={editForm.stock_level} onChange={e => setEditForm({ ...editForm, stock_level: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Leftovers</label>
                                                            <input type="number" min="0" value={editForm.left_overs} onChange={e => setEditForm({ ...editForm, left_overs: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Meal Price (EUR)</label>
                                                            <input type="number" min="0.01" step="0.01" value={editForm.dispense_price_eur} onChange={e => setEditForm({ ...editForm, dispense_price_eur: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Admin Status</label>
                                                            <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                                                                <option value="enabled">Enabled</option>
                                                                <option value="disabled">Disabled</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 items-center justify-end">
                                                        <button
                                                            onClick={() => setEditingFeeder(null)}
                                                            className="px-4 py-1.5 border-2 border-foreground rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateFeeder(feeder)}
                                                            className="px-4 py-1.5 bg-primary border-2 border-foreground rounded-lg text-xs font-bold text-white flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                                                        >
                                                            <Save className="w-3 h-3" /> Save Changes
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ TRANSACTIONS TAB ══════════ */}
                {activeTab === 'transactions' && data && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black">Transaction Ledger</h2>
                            <p className="text-sm text-muted-foreground font-mono">All deposits &amp; feeding expenditures from Supabase</p>
                        </div>

                        {/* Summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard
                                title="Total Deposits"
                                value={fmtCurrency(data.overview.totalRevenue)}
                                icon={ArrowDownRight}
                                color="bg-green-500"
                            />
                            <StatCard
                                title="This Month"
                                value={fmtCurrency(data.overview.revenueThisMonth)}
                                icon={TrendingUp}
                                color="bg-primary"
                            />
                            <StatCard
                                title="Total Meals Paid"
                                value={data.overview.totalMeals}
                                icon={Zap}
                                color="bg-accent"
                            />
                            <StatCard
                                title="Wallet Balances"
                                value={fmtCurrency(data.overview.totalWalletBalance)}
                                subtitle="Unclaimed funds"
                                icon={DollarSign}
                                color="bg-blue-500"
                            />
                        </div>

                        {/* Full transaction table */}
                        <div className="bg-white border-2 border-foreground rounded-2xl shadow-[3px_3px_0px_rgba(60,50,30,0.8)] overflow-hidden">
                            <div className="p-5 border-b-2 border-border flex items-center justify-between">
                                <h3 className="font-black">All Transactions</h3>
                                <span className="text-xs font-mono text-muted-foreground">{data.recentTransactions.length} records shown</span>
                            </div>
                            {data.recentTransactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-border bg-muted/30">
                                                {['Type', 'User', 'Amount', 'Date'].map(h => (
                                                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recentTransactions.map((tx, i) => (
                                                <tr key={tx.id || i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${tx.amount > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                                            {tx.amount > 0 ? <ArrowDownRight className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                                            {tx.type?.replace('deposit:', 'Deposit').replace('feeding', 'Feeding') || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-sm">{tx.user}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`font-black text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                                            {tx.amount > 0 ? '+' : ''}{typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount}€
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                                                        {tx.date ? new Date(tx.date).toLocaleString('en-GB') : '–'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="font-bold text-muted-foreground mb-1">No transactions found</p>
                                    <p className="text-xs text-muted-foreground font-mono">Check Supabase `donations` table schema and RLS policies</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* ══════════ POOLS TAB ══════════ */}
                {activeTab === 'pools' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black">Donation Pool Management</h2>
                            <p className="text-sm text-muted-foreground font-mono">View balances, add funds, or deduct for maintenance & repairs</p>
                        </div>

                        {/* Pool Balances */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {pools.map(pool => (
                                <div key={pool.id} className={`bg-white border-2 border-foreground rounded-2xl p-5 shadow-[3px_3px_0px_rgba(60,50,30,0.8)] ${pool.feeder_id === null ? 'ring-2 ring-primary' : ''}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-xl border-2 border-foreground ${pool.feeder_id === null ? 'bg-primary' : 'bg-accent'}`}>
                                                <DollarSign className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm">{pool.feeder_name}</p>
                                                {pool.feeder_id === null && <span className="text-[10px] font-bold text-primary uppercase">Primary Fund</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-foreground">€{Number(pool.balance).toFixed(2)}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-1">Updated: {pool.last_updated ? new Date(pool.last_updated).toLocaleString('en-GB') : '–'}</p>
                                </div>
                            ))}
                            {pools.length === 0 && !poolLoading && (
                                <div className="col-span-full bg-white border-2 border-dashed border-foreground/30 rounded-2xl p-12 text-center">
                                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="font-bold text-muted-foreground">No donation pools found</p>
                                    <p className="text-xs text-muted-foreground font-mono">Run the SQL migration to initialize the Global Pool</p>
                                </div>
                            )}
                        </div>

                        {/* Admin Actions */}
                        <div className="bg-white border-2 border-foreground rounded-2xl p-6 shadow-[3px_3px_0px_rgba(60,50,30,0.8)]">
                            <h3 className="font-black text-lg mb-1">Admin Actions — Global Pool</h3>
                            <p className="text-sm text-muted-foreground font-mono mb-5">Add or deduct funds for maintenance, repairs, new feeders, etc.</p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Action Select */}
                                <div className="flex-shrink-0">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Action</label>
                                    <select
                                        value={poolAction}
                                        onChange={e => setPoolAction(e.target.value as any)}
                                        className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                    >
                                        <option value="deduct">Deduct (Withdraw)</option>
                                        <option value="add">Add (Top Up)</option>
                                    </select>
                                </div>

                                {/* Amount */}
                                <div className="flex-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Amount (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={poolAmount}
                                        onChange={e => setPoolAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                    />
                                </div>

                                {/* Reason */}
                                {poolAction === 'deduct' && (
                                    <div className="flex-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Reason</label>
                                        <input
                                            type="text"
                                            value={poolReason}
                                            onChange={e => setPoolReason(e.target.value)}
                                            placeholder="e.g. feeder repair, new hardware"
                                            className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                        />
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex items-end">
                                    <button
                                        onClick={handlePoolAction}
                                        disabled={poolLoading || !poolAmount}
                                        className={`px-6 py-2.5 border-2 border-foreground rounded-xl font-bold text-sm text-white shadow-[3px_3px_0px_rgba(60,50,30,0.8)] hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2 ${
                                            poolAction === 'deduct' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                        }`}
                                    >
                                        {poolLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : poolAction === 'deduct' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                        {poolAction === 'deduct' ? 'Withdraw' : 'Add Funds'}
                                    </button>
                                </div>
                            </div>

                            {/* Feedback */}
                            {poolMessage && (
                                <div className={`mt-4 p-3 rounded-xl border text-sm font-mono ${
                                    poolMessage.startsWith('✅') ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
                                }`}>
                                    {poolMessage}
                                </div>
                            )}
                        </div>

                        {/* Explanation */}
                        <div className="bg-muted/30 border-2 border-foreground/10 rounded-2xl p-5">
                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> How Donation Pools Work</h4>
                            <ul className="text-xs text-muted-foreground font-mono space-y-1.5 list-disc list-inside">
                                <li><strong>Global Pool</strong> — Funds available to ALL feeders. Used when a feeder&apos;s own pool is empty.</li>
                                <li><strong>Feeder Pool</strong> — Funds dedicated to a specific feeder. Checked FIRST before the global pool.</li>
                                <li><strong>Live Donation</strong> — User clicks &quot;Feed&quot; directly. Deducted from their wallet, bypasses pools entirely.</li>
                                <li><strong>Deductions</strong> — Admin can withdraw from the Global Pool for maintenance, repairs, and infrastructure costs.</li>
                            </ul>
                        </div>
                    </div>
                )}

            </main>

            {/* ── Add Feeder Modal ── */}
            {showAddFeeder && (
                <AddFeederModal
                    onClose={() => setShowAddFeeder(false)}
                    onAdd={(f) => {
                        setData(prev => prev ? { ...prev, feeders: [f, ...prev.feeders] } : prev);
                    }}
                />
            )}
        </div>
    );
}
