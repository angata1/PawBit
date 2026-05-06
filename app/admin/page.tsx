'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
    TrendingUp, Users, Zap, Wifi, AlertTriangle,
    DollarSign, Activity, RefreshCw, Plus, Trash2, Edit3,
    CheckCircle, XCircle, MapPin,
    BarChart2, Settings, Package, ArrowUpRight,
    ArrowDownRight, Clock, X, Save, Loader2, Battery,
    ArrowRightLeft, ShieldCheck, SlidersHorizontal, WalletCards,
    type LucideIcon
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
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

type AdminTab = 'overview' | 'feeders' | 'transactions' | 'pools';

type EditFeederForm = {
    name: string;
    address: string;
    lat: string;
    lng: string;
    status: 'enabled' | 'disabled';
    stock_level: string;
    left_overs: string;
    dispense_price_eur: string;
};

type DonationPool = {
    id: string | number;
    feeder_id: string | number | null;
    feeder_name: string;
    balance: number | string;
    last_updated: string | null;
};

type MoneyEvent = {
    id: string | number;
    created_at: string;
    event_type: string;
    reason: string;
    reason_en: string | null;
    amount_eur: number | string;
    source_pool_id: string | number | null;
    destination_pool_id: string | number | null;
    feeder_id: string | number | null;
};

type PoolAction = 'add' | 'withdraw' | 'transfer' | 'expense';
type SplitMode = 'single' | 'split';

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({
    title, value, subtitle, icon: Icon, color, trend, trendValue
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
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
    const t = useTranslations('Admin');
    type KnownStatus = 'online' | 'offline' | 'disabled' | 'never_connected';

    const isKnownStatus = (value: string): value is KnownStatus => {
        return value === 'online' || value === 'offline' || value === 'disabled' || value === 'never_connected';
    };

    const map: Record<string, string> = {
        online: 'bg-green-100 text-green-700 border-green-300',
        offline: 'bg-red-100 text-red-700 border-red-300',
        disabled: 'bg-gray-100 text-gray-700 border-gray-300',
        never_connected: 'bg-gray-50 text-gray-500 border-gray-200',
    };
    const icons: Record<KnownStatus, LucideIcon> = {
        online: CheckCircle,
        offline: XCircle,
        disabled: XCircle,
        never_connected: AlertTriangle,
    };
    const Icon = isKnownStatus(status) ? icons[status] : Activity;
    const formattedStatus = isKnownStatus(status)
        ? t(`status.${status}`)
        : status.replace('_', ' ');
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${map[status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
            <Icon className="w-3 h-3" />
            {formattedStatus}
        </span>
    );
};

// ─── Add Feeder Modal ─────────────────────────────────────────────────────────
type FeederFormState = {
    name: string;
    address: string;
    lat: string;
    lng: string;
    status: 'active' | 'maintenance' | 'offline';
    food_level: string;
    dispense_price_eur: string;
};

type FeederFormField = Exclude<keyof FeederFormState, 'status'>;

const AddFeederModal = ({ onClose, onAdd }: { onClose: () => void; onAdd: (feeder: Feeder) => void }) => {
    const t = useTranslations('Admin');
    const [form, setForm] = useState<FeederFormState>({
        name: '',
        address: '',
        lat: '42.6977',
        lng: '23.3219',
        status: 'active',
        food_level: '100',
        dispense_price_eur: '2.00',
    });
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
            const data = await res.json() as { feeder?: Feeder; error?: string };
            if (!res.ok) throw new Error(data.error || 'Failed to create feeder');
            if (!data.feeder) throw new Error('Failed to create feeder');
            onAdd(data.feeder);
            if (data.feeder.pi_auth_key) {
                setCreatedKey(data.feeder.pi_auth_key);
            } else {
                onClose();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create feeder');
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
                    <h2 className="text-2xl font-black">{t('modal.createdTitle')}</h2>
                    <p className="text-sm font-mono text-muted-foreground">{t('modal.createdDesc')}</p>
                    <div className="bg-muted p-4 rounded-xl border border-border select-all font-mono text-sm break-all font-bold">
                        {createdKey}
                    </div>
                    <button onClick={onClose} className="w-full px-4 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white shadow-sm mt-4 hover:bg-primary/90">
                        {t('modal.copied')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border-2 border-foreground neu-shadow-lg w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b-2 border-border">
                    <h2 className="text-xl font-black flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> {t('modal.addTitle')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 text-sm font-mono">{error}</div>}
                    {([
                        { label: t('feederForm.name'), key: 'name', type: 'text', placeholder: t('feederForm.placeholders.name') },
                        { label: t('feederForm.address'), key: 'address', type: 'text', placeholder: t('feederForm.placeholders.address') },
                        { label: t('feederForm.latitude'), key: 'lat', type: 'number', placeholder: t('feederForm.placeholders.latitude') },
                        { label: t('feederForm.longitude'), key: 'lng', type: 'number', placeholder: t('feederForm.placeholders.longitude') },
                        { label: t('feederForm.foodLevel'), key: 'food_level', type: 'number', placeholder: t('feederForm.placeholders.foodLevel') },
                        { label: t('feederForm.mealPrice'), key: 'dispense_price_eur', type: 'number', placeholder: t('feederForm.placeholders.mealPrice') },
                    ] satisfies Array<{ label: string; key: FeederFormField; type: 'text' | 'number'; placeholder: string; }>).map((f) => (
                        <div key={f.key}>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{f.label}</label>
                            <input
                                type={f.type}
                                value={form[f.key]}
                                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                required={f.key === 'name' || f.key === 'address'}
                                className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{t('feederForm.status')}</label>
                        <select
                            value={form.status}
                            onChange={e => setForm(prev => ({ ...prev, status: e.target.value as FeederFormState['status'] }))}
                            className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        >
                            {(['active', 'maintenance', 'offline'] as const).map(s => (
                                <option key={s} value={s}>{t(`feederForm.statusOptions.${s}`)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border-2 border-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors">{t('common.cancel')}</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-sm text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? t('common.saving') : t('common.saveFeeder')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
type TooltipPoint = {
    color?: string;
    name?: string;
    value?: number | string;
};

type CustomTooltipProps = {
    active?: boolean;
    payload?: TooltipPoint[];
    label?: string | number;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    const t = useTranslations('Admin');
    const locale = useLocale();
    if (active && payload && payload.length) {
        const dateStr = label ? new Date(label).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '';
        return (
            <div className="bg-white border-2 border-foreground rounded-xl p-3 neu-shadow">
                <p className="text-xs font-bold text-muted-foreground mb-1 font-mono">{dateStr}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-sm font-black" style={{ color: p.color }}>
                        {p.name === 'revenue' ? `€${p.value}` : p.value}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                            {p.name === 'revenue' ? t('chart.revenue') : p.name === 'meals' ? t('chart.meals') : p.name}
                        </span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
    const t = useTranslations('Admin');
    const locale = useLocale();
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [isAdminReady, setIsAdminReady] = useState(false);
    const [loadedTabs, setLoadedTabs] = useState<Record<AdminTab, boolean>>({
        overview: false,
        feeders: false,
        transactions: false,
        pools: false,
    });
    const [showAddFeeder, setShowAddFeeder] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingFeeder, setEditingFeeder] = useState<Feeder | null>(null);
    const [editForm, setEditForm] = useState<EditFeederForm>({
        name: '',
        address: '',
        lat: '0',
        lng: '0',
        status: 'enabled',
        stock_level: '0',
        left_overs: '0',
        dispense_price_eur: '2.00',
    });

    // Pool management state
    const [pools, setPools] = useState<DonationPool[]>([]);
    const [poolEvents, setPoolEvents] = useState<MoneyEvent[]>([]);
    const [poolLoading, setPoolLoading] = useState(false);
    const [poolAction, setPoolAction] = useState<PoolAction>('withdraw');
    const [splitMode, setSplitMode] = useState<SplitMode>('single');
    const [sourcePoolId, setSourcePoolId] = useState('');
    const [destinationPoolId, setDestinationPoolId] = useState('');
    const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
    const [poolAmount, setPoolAmount] = useState('');
    const [poolReason, setPoolReason] = useState('food_purchase');
    const [customReason, setCustomReason] = useState('');
    const [poolMessage, setPoolMessage] = useState('');

    const supabase = useMemo(() => createClient(), []);

    const markTabLoaded = useCallback((tab: AdminTab) => {
        setLoadedTabs(prev => ({ ...prev, [tab]: true }));
    }, []);

    const verifyAdmin = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return false;
            }

            const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
            if (dbUser?.role !== 'admin') {
                window.location.href = '/';
                return false;
            }

            setIsAdminReady(true);
            return true;
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to verify admin access');
            return false;
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    const fetchData = useCallback(async (tab: AdminTab, showRefreshAnimation = false) => {
        if (showRefreshAnimation) setRefreshing(true);
        setLoading(true);
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to load data');
            }
            const json = await res.json();
            setData(json);
            markTabLoaded(tab);
            setError('');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [markTabLoaded]);

    useEffect(() => {
        verifyAdmin();
    }, [verifyAdmin]);

    const handleDeleteFeeder = async (id: string | number) => {
        if (!confirm('Delete this feeder permanently?')) return;
        setDeletingId(String(id));
        try {
            const res = await fetch(`/api/admin/feeders/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setData(prev => prev ? { ...prev, feeders: prev.feeders.filter(f => f.id !== id) } : prev);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Failed to delete');
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
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Failed to update');
        }
    };

    // ── Pool management ──
    const fetchPools = useCallback(async () => {
        setPoolLoading(true);
        try {
            const res = await fetch('/api/admin/pools');
            if (!res.ok) throw new Error('Failed to load pools');
            const json = await res.json();
            setPools(json.pools || []);
            setPoolEvents(json.recentEvents || []);
            markTabLoaded('pools');
        } catch (e: unknown) {
            console.error('Pool fetch error:', e);
        } finally {
            setPoolLoading(false);
        }
    }, [markTabLoaded]);

    useEffect(() => {
        if (!isAdminReady || loadedTabs[activeTab]) return;
        if (activeTab === 'pools') {
            fetchPools();
            return;
        }
        fetchData(activeTab);
    }, [activeTab, fetchData, fetchPools, isAdminReady, loadedTabs]);

    const globalPool = pools.find(pool => pool.feeder_id === null) || null;
    const totalPoolBalance = pools.reduce((sum, pool) => sum + Number(pool.balance || 0), 0);
    const lowBalancePools = pools.filter(pool => Number(pool.balance || 0) < 5);
    const activePoolAmount = Number.parseFloat(poolAmount) || 0;
    const selectedSourcePool = pools.find(pool => String(pool.id) === sourcePoolId) || globalPool;
    const selectedDestinationPool = pools.find(pool => String(pool.id) === destinationPoolId) || globalPool;
    const reasonOptions = [
        { value: 'food_purchase', label: t('pools.reasons.food_purchase') },
        { value: 'feeder_repair', label: t('pools.reasons.feeder_repair') },
        { value: 'livestream_cost', label: t('pools.reasons.livestream_cost') },
        { value: 'hardware_upgrade', label: t('pools.reasons.hardware_upgrade') },
        { value: 'emergency_support', label: t('pools.reasons.emergency_support') },
        { value: 'admin_adjustment', label: t('pools.reasons.admin_adjustment') },
        { value: 'custom', label: t('pools.reasons.custom') },
    ];
    const poolActionMeta: Record<PoolAction, { label: string; tone: string; icon: LucideIcon; description: string }> = {
        add: { label: t('pools.actionAdd'), tone: 'bg-green-500', icon: ArrowDownRight, description: t('pools.actionAddDesc') },
        withdraw: { label: t('pools.actionWithdraw'), tone: 'bg-red-500', icon: ArrowUpRight, description: t('pools.actionWithdrawDesc') },
        transfer: { label: t('pools.actionTransfer'), tone: 'bg-blue-500', icon: ArrowRightLeft, description: t('pools.actionTransferDesc') },
        expense: { label: t('pools.actionExpense'), tone: 'bg-orange-500', icon: WalletCards, description: t('pools.actionExpenseDesc') },
    };
    const splitEntries = pools
        .map(pool => ({
            pool,
            amount: Number.parseFloat(splitAmounts[String(pool.id)] || '0') || 0,
        }))
        .filter(entry => entry.amount > 0);
    const splitTotal = splitEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const operationSources = (poolAction === 'withdraw' || poolAction === 'expense')
        ? splitMode === 'split'
            ? splitEntries
            : selectedSourcePool
                ? [{ pool: selectedSourcePool, amount: activePoolAmount }]
                : []
        : poolAction === 'transfer' && selectedSourcePool
            ? [{ pool: selectedSourcePool, amount: activePoolAmount }]
            : [];
    const operationDestinations = poolAction === 'add' && selectedDestinationPool
        ? [{ pool: selectedDestinationPool, amount: activePoolAmount }]
        : poolAction === 'transfer' && selectedDestinationPool
            ? [{ pool: selectedDestinationPool, amount: activePoolAmount }]
            : [];
    const hasInsufficientFunds = operationSources.some(entry => Number(entry.pool.balance || 0) < entry.amount);
    const splitMismatch = (poolAction === 'withdraw' || poolAction === 'expense') && splitMode === 'split' && Math.abs(splitTotal - activePoolAmount) > 0.009;
    const transferSamePool = poolAction === 'transfer' && selectedSourcePool && selectedDestinationPool && String(selectedSourcePool.id) === String(selectedDestinationPool.id);
    const canSubmitPoolOperation = activePoolAmount > 0 && !hasInsufficientFunds && !splitMismatch && !transferSamePool && (
        poolAction === 'add'
            ? Boolean(selectedDestinationPool)
            : poolAction === 'transfer'
                ? Boolean(selectedSourcePool && selectedDestinationPool)
                : splitMode === 'split'
                    ? splitEntries.length > 0
                    : Boolean(selectedSourcePool)
    );

    const handlePoolAction = async () => {
        const amt = parseFloat(poolAmount);
        if (!amt || amt <= 0 || !canSubmitPoolOperation) return;
        setPoolLoading(true);
        setPoolMessage('');
        try {
            const entries = (poolAction === 'withdraw' || poolAction === 'expense') && splitMode === 'split'
                ? splitEntries.map(entry => ({ poolId: Number(entry.pool.id), amount: entry.amount }))
                : undefined;
            const resolvedReason = poolReason === 'custom' ? (customReason.trim() || 'admin_adjustment') : (poolReason || 'admin_adjustment');
            const resolvedReasonEn = poolReason === 'custom' ? (customReason.trim() || 'Custom') : (reasonOptions.find(option => option.value === poolReason)?.label || poolReason);
            const res = await fetch('/api/admin/pools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: poolAction,
                    amount: amt,
                    reason: resolvedReason,
                    reasonEn: resolvedReasonEn,
                    sourcePoolId: poolAction === 'transfer' || ((poolAction === 'withdraw' || poolAction === 'expense') && splitMode === 'single')
                        ? Number(selectedSourcePool?.id)
                        : undefined,
                    destinationPoolId: poolAction === 'add' || poolAction === 'transfer'
                        ? Number(selectedDestinationPool?.id)
                        : undefined,
                    entries,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Action failed');
            setPoolMessage(`Recorded ${poolActionMeta[poolAction].label.toLowerCase()} of ${fmtCurrency(amt)}`);
            setPoolAmount('');
            setSplitAmounts({});
            setCustomReason('');
            await fetchPools();
        } catch (e: unknown) {
            setPoolMessage(`Failed: ${e instanceof Error ? e.message : 'Action failed'}`);
        } finally {
            setPoolLoading(false);
        }
    };

    const currencyFormatter = useMemo(() => new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }), [locale]);
    const fmtCurrency = (v: number) => currencyFormatter.format(v);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' });
    const fmtShortDate = (d: string) => new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short' });

    const PieColors = ['#22c55e', '#ef4444', '#9ca3af', '#e05c5c'];
    const feederStatuses = data ? [
        { name: t('status.online'), value: data.overview.activeFeeders },
        { name: t('status.offline'), value: data.overview.offlineFeeders },
        { name: t('status.disabled'), value: data.overview.disabledFeeders },
    ].filter(s => s.value > 0) : [];

    if (loading && !isAdminReady) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-mono text-muted-foreground">{t('loading')}</p>
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
                            { key: 'overview', label: t('tabs.overview'), icon: BarChart2 },
                            { key: 'feeders', label: t('tabs.feeders', { count: data?.feeders.length ?? 0 }), icon: Package },
                            { key: 'transactions', label: t('tabs.transactions'), icon: DollarSign },
                            { key: 'pools', label: t('tabs.pools'), icon: Battery },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key as AdminTab)}
                                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <t.icon className="w-4 h-4" />
                                <span className="hidden xs:inline sm:inline">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            if (activeTab === 'pools') {
                                fetchPools();
                                return;
                            }
                            fetchData(activeTab, true);
                        }}
                        disabled={refreshing || poolLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-foreground rounded-lg text-xs font-bold hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0 ml-4"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{t('common.refresh')}</span>
                    </button>
                </div>
            </header>

            {/* ── Error banner ── */}
            {error && (
                <div className="bg-red-50 border-b-2 border-red-300 px-6 py-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-sm font-mono text-red-700">{error}</span>
                    <span className="text-xs text-red-500 ml-auto">{t('common.dataUnavailable')}</span>
                </div>
            )}

            <main className="px-3 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto">
                {activeTab !== 'pools' && !loadedTabs[activeTab] && (
                    <div className="bg-white border-2 border-foreground rounded-2xl p-12 neu-shadow text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="font-black">Loading {activeTab} data</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">This admin tab loads only when opened.</p>
                    </div>
                )}

                {/* ══════════ OVERVIEW TAB ══════════ */}
                {activeTab === 'overview' && data && loadedTabs.overview && (
                    <div className="space-y-8">

                        {/* KPI Cards */}
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{t('overview.keyMetrics')}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                                <StatCard
                                    title={t('overview.totalRevenue')}
                                    value={fmtCurrency(data.overview.totalRevenue)}
                                    subtitle={t('overview.thisMonthValue', { value: fmtCurrency(data.overview.revenueThisMonth) })}
                                    icon={TrendingUp}
                                    color="bg-primary"
                                    trend="up"
                                    trendValue={t('overview.mtd')}
                                />
                                <StatCard
                                    title={t('overview.totalMeals')}
                                    value={data.overview.totalMeals.toLocaleString()}
                                    subtitle={t('overview.thisMonthMeals', { value: data.overview.mealsThisMonth })}
                                    icon={Zap}
                                    color="bg-accent"
                                    trend="up"
                                    trendValue={t('overview.mtd')}
                                />
                                <StatCard
                                    title={t('overview.registeredUsers')}
                                    value={data.overview.totalUsers}
                                    subtitle={t('overview.walletValue', { value: fmtCurrency(data.overview.totalWalletBalance) })}
                                    icon={Users}
                                    color="bg-blue-500"
                                />
                                <StatCard
                                    title={t('overview.activeFeeders')}
                                    value={data.overview.activeFeeders}
                                    subtitle={t('overview.ofTotal', { value: data.overview.totalFeeders })}
                                    icon={Wifi}
                                    color="bg-green-500"
                                    trend={data.overview.offlineFeeders > 0 ? 'down' : 'neutral'}
                                    trendValue={data.overview.offlineFeeders > 0 ? t('overview.offlineCount', { value: data.overview.offlineFeeders }) : undefined}
                                />
                                <StatCard
                                    title={t('overview.avgFoodLevel')}
                                    value={`${data.overview.avgFoodLevel}%`}
                                    subtitle={t('overview.acrossAllFeeders')}
                                    icon={Battery}
                                    color={data.overview.avgFoodLevel < 30 ? 'bg-red-500' : data.overview.avgFoodLevel < 60 ? 'bg-yellow-500' : 'bg-green-500'}
                                />
                                <StatCard
                                    title={t('overview.catsDetected')}
                                    value={data.overview.totalAnimalsDetected}
                                    subtitle={t('overview.liveAcrossNetwork')}
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
                                        <h3 className="font-black text-lg">{t('overview.revenueTitle')}</h3>
                                        <p className="text-sm text-muted-foreground font-mono">{t('overview.revenueSubtitle')}</p>
                                    </div>
                                    <div className="bg-primary/10 px-3 py-1 rounded-lg border border-primary/30">
                                        <span className="text-sm font-bold text-primary">{fmtCurrency(data.overview.revenueThisMonth)}</span>
                                        <span className="text-xs text-muted-foreground ml-1">{t('overview.perMonth')}</span>
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
                                        <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => currencyFormatter.format(Number(v))} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="revenue" stroke="#7aa374" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#7aa374' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-black text-lg">{t('overview.feedingsTitle')}</h3>
                                        <p className="text-sm text-muted-foreground font-mono">{t('overview.feedingsSubtitle')}</p>
                                    </div>
                                    <div className="bg-accent/10 px-3 py-1 rounded-lg border border-accent/30">
                                        <span className="text-sm font-bold text-accent-foreground">{data.overview.mealsThisMonth}</span>
                                        <span className="text-xs text-muted-foreground ml-1">{t('overview.perMonth')}</span>
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
                                <h3 className="font-black text-lg mb-1">{t('overview.feederStatusTitle')}</h3>
                                <p className="text-sm text-muted-foreground font-mono mb-4">{t('overview.feederStatusSubtitle')}</p>
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
                                        {t('overview.noFeederData')}<br />{t('overview.checkFeedersTable')}
                                    </div>
                                )}
                            </div>

                            {/* Top Donors */}
                            <div className="xl:col-span-2 bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                                <h3 className="font-black text-lg mb-1">{t('overview.topDonorsTitle')}</h3>
                                <p className="text-sm text-muted-foreground font-mono mb-5">{t('overview.topDonorsSubtitle')}</p>
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
                                        {t('overview.noDonorData')}<br />{t('overview.donorHint')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                <div className="bg-white border-2 border-foreground rounded-2xl p-6 neu-shadow">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="font-black text-lg">{t('overview.recentTransactionsTitle')}</h3>
                                    <p className="text-sm text-muted-foreground font-mono">{t('overview.recentTransactionsSubtitle')}</p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('transactions')}
                                    className="text-sm font-bold text-primary hover:underline"
                                >
                                    {t('overview.viewAll')}
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
                                                    <p className="text-xs text-muted-foreground font-mono">{tx.type?.replace('deposit:', `${t('transactions.txTypes.deposit')} `).replace('feeding', t('transactions.txTypes.feeding'))}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{fmtCurrency(tx.amount).replace(/^€/,'')}
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
                                    {t('overview.noTransactions')}<br />{t('overview.checkDonationsTable')}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════ FEEDERS TAB ══════════ */}
                {activeTab === 'feeders' && data && loadedTabs.feeders && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black">{t('feeders.title')}</h2>
                                <p className="text-sm text-muted-foreground font-mono">{t('feeders.subtitle')}</p>
                            </div>
                            <button
                                onClick={() => setShowAddFeeder(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white text-sm neu-shadow hover:neu-shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <Plus className="w-4 h-4" /> {t('feeders.addFeeder')}
                            </button>
                        </div>

                        {/* Summary row */}
                        {data && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: t('feeders.total'), value: data.feeders.length, color: 'bg-primary' },
                                    { label: t('status.online'), value: data.overview.activeFeeders, color: 'bg-green-500' },
                                    { label: t('status.offline'), value: data.overview.offlineFeeders, color: 'bg-red-500' },
                                    { label: t('status.disabled'), value: data.overview.disabledFeeders, color: 'bg-gray-500' },
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
                                <h3 className="font-bold text-lg mb-2">{t('feeders.noFeedersTitle')}</h3>
                                <p className="text-muted-foreground text-sm font-mono mb-5">{t('feeders.noFeedersDesc')}</p>
                                <button
                                    onClick={() => setShowAddFeeder(true)}
                                    className="px-6 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white text-sm"
                                >
                                    {t('feeders.addFirstFeeder')}
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
                                                        {feeder.location?.address} • {t('feeders.lastSeen', { value: formatLastSeen(feeder.last_seen_at || null) })}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{t('feeders.piKey')}</span>
                                                        <code className="text-[10px] bg-muted px-2 py-1 rounded border border-foreground/10 font-mono select-all cursor-copy hover:bg-muted/80 transition-colors">
                                                            {feeder.pi_auth_key || t('feeders.noKey')}
                                                        </code>
                                                    </div>
                                                </div>

                                                {/* Metrics */}
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="text-center">
                                                        <p className="font-black text-primary">{foodLevel}%</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('feeders.food')}</p>
                                                        <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                                                            <div className={`h-full rounded-full transition-all ${foodLevel > 60 ? 'bg-green-500' : foodLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${foodLevel}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-black text-accent-foreground">{animals}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('feeders.leftovers')}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-black text-primary">{fmtCurrency(Number(feeder.dispense_price_eur || 2))}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('feeders.meal')}</p>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                                                        {t('feeders.id', { value: String(feeder.id).slice(0, 8) })}
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
                                                        title={t('feeders.editTitle')}
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteFeeder(feeder.id)}
                                                        disabled={isDeleting}
                                                        className="p-2 rounded-lg border-2 border-foreground/20 hover:border-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                        title={t('feeders.deleteTitle')}
                                                    >
                                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                    <Link
                                                        href={`/feeder/${feeder.id}`}
                                                        className="p-2 rounded-lg border-2 border-foreground/20 hover:border-accent hover:bg-accent/10 transition-colors"
                                                        title={t('feeders.viewPublicPage')}
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
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.name')}</label>
                                                            <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.address')}</label>
                                                            <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.latitude')}</label>
                                                            <input type="number" step="any" value={editForm.lat} onChange={e => setEditForm({ ...editForm, lat: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.longitude')}</label>
                                                            <input type="number" step="any" value={editForm.lng} onChange={e => setEditForm({ ...editForm, lng: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.foodLevel')}</label>
                                                            <input type="number" min="0" max="100" value={editForm.stock_level} onChange={e => setEditForm({ ...editForm, stock_level: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.leftovers')}</label>
                                                            <input type="number" min="0" value={editForm.left_overs} onChange={e => setEditForm({ ...editForm, left_overs: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.mealPrice')}</label>
                                                            <input type="number" min="0.01" step="0.01" value={editForm.dispense_price_eur} onChange={e => setEditForm({ ...editForm, dispense_price_eur: e.target.value })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('feederForm.adminStatus')}</label>
                                                            <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as EditFeederForm['status'] })} className="w-full px-3 py-1.5 border-2 border-foreground rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
                                                                <option value="enabled">{t('feederForm.enabled')}</option>
                                                                <option value="disabled">{t('feederForm.disabled')}</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 items-center justify-end">
                                                        <button
                                                            onClick={() => setEditingFeeder(null)}
                                                            className="px-4 py-1.5 border-2 border-foreground rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                                                        >
                                                            {t('common.cancel')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateFeeder(feeder)}
                                                            className="px-4 py-1.5 bg-primary border-2 border-foreground rounded-lg text-xs font-bold text-white flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                                                        >
                                                            <Save className="w-3 h-3" /> {t('common.saveChanges')}
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
                {activeTab === 'transactions' && data && loadedTabs.transactions && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black">{t('transactions.title')}</h2>
                            <p className="text-sm text-muted-foreground font-mono">{t('transactions.subtitle')}</p>
                        </div>

                        {/* Summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard
                                title={t('transactions.totalDeposits')}
                                value={fmtCurrency(data.overview.totalRevenue)}
                                icon={ArrowDownRight}
                                color="bg-green-500"
                            />
                            <StatCard
                                title={t('transactions.thisMonth')}
                                value={fmtCurrency(data.overview.revenueThisMonth)}
                                icon={TrendingUp}
                                color="bg-primary"
                            />
                            <StatCard
                                title={t('transactions.totalMealsPaid')}
                                value={data.overview.totalMeals}
                                icon={Zap}
                                color="bg-accent"
                            />
                            <StatCard
                                title={t('transactions.walletBalances')}
                                value={fmtCurrency(data.overview.totalWalletBalance)}
                                subtitle={t('transactions.unclaimedFunds')}
                                icon={DollarSign}
                                color="bg-blue-500"
                            />
                        </div>

                        {/* Full transaction table */}
                        <div className="bg-white border-2 border-foreground rounded-2xl shadow-[3px_3px_0px_rgba(60,50,30,0.8)] overflow-hidden">
                            <div className="p-5 border-b-2 border-border flex items-center justify-between">
                                <h3 className="font-black">{t('transactions.allTransactions')}</h3>
                                <span className="text-xs font-mono text-muted-foreground">{t('transactions.recordsShown', { value: data.recentTransactions.length })}</span>
                            </div>
                            {data.recentTransactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-border bg-muted/30">
                                                {[t('transactions.columns.type'), t('transactions.columns.user'), t('transactions.columns.amount'), t('transactions.columns.date')].map(h => (
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
                                                            {tx.type?.replace('deposit:', t('transactions.txTypes.deposit')).replace('feeding', t('transactions.txTypes.feeding')) || t('transactions.unknown')}
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
                                    <p className="font-bold text-muted-foreground mb-1">{t('transactions.noTransactions')}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{t('transactions.checkDonationsTable')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* ══════════ POOLS TAB ══════════ */}
                {activeTab === 'pools' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black">{t('pools.title')}</h2>
                            <p className="text-sm text-muted-foreground font-mono">{t('pools.subtitle')}</p>
                        </div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border-2 border-foreground rounded-2xl p-5 shadow-[3px_3px_0px_rgba(60,50,30,0.8)]">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pools.totalInPools')}</p>
                                <p className="text-3xl font-black mt-2">{fmtCurrency(totalPoolBalance)}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-2">{t('pools.managedBalances', { count: pools.length })}</p>
                            </div>
                            <div className="bg-white border-2 border-foreground rounded-2xl p-5 shadow-[3px_3px_0px_rgba(60,50,30,0.8)]">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pools.globalReserve')}</p>
                                <p className="text-3xl font-black mt-2 text-primary">{fmtCurrency(Number(globalPool?.balance || 0))}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-2">{t('pools.fallbackMoney')}</p>
                            </div>
                            <div className={`border-2 border-foreground rounded-2xl p-5 shadow-[3px_3px_0px_rgba(60,50,30,0.8)] ${lowBalancePools.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pools.riskWatch')}</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <p className={`text-3xl font-black ${lowBalancePools.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowBalancePools.length}</p>
                                    {lowBalancePools.length > 0 && <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono mt-2">{t('pools.poolsBelowLimit', { count: lowBalancePools.length, limit: fmtCurrency(5) })}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-black text-lg">{t('pools.poolMap')}</h3>
                                        <p className="text-sm text-muted-foreground font-mono">{t('pools.poolMapDesc')}</p>
                                    </div>
                                    <button onClick={fetchPools} disabled={poolLoading} className="p-2 rounded-lg border-2 border-foreground/20 hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50" title="Refresh pools">
                                        <RefreshCw className={`w-4 h-4 ${poolLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {poolLoading && pools.length === 0 && (
                                        <div className="col-span-full bg-white border-2 border-dashed border-foreground/20 rounded-2xl p-10 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                                            <p className="font-black">{t('pools.loadingBalances')}</p>
                                            <p className="text-xs text-muted-foreground font-mono mt-1">{t('pools.loadingBalancesDesc')}</p>
                                        </div>
                                    )}
                                    {pools.map(pool => {
                                        const poolIdStr = String(pool.id);
                                        const isSource = sourcePoolId === poolIdStr && (poolAction === 'withdraw' || poolAction === 'expense' || poolAction === 'transfer');
                                        const isDestination = destinationPoolId === poolIdStr && (poolAction === 'add' || poolAction === 'transfer');
                                        const isSelected = isSource || isDestination;
                                        return (
                                            <button
                                                key={pool.id}
                                                type="button"
                                                onClick={() => {
                                                    const id = poolIdStr;
                                                    if (poolAction === 'add') {
                                                        setDestinationPoolId(prev => prev === id ? '' : id);
                                                    } else if (poolAction === 'transfer') {
                                                        if (!sourcePoolId || sourcePoolId === id) {
                                                            setSourcePoolId(prev => prev === id ? '' : id);
                                                        } else {
                                                            setDestinationPoolId(prev => prev === id ? '' : id);
                                                        }
                                                    } else {
                                                        setSourcePoolId(prev => prev === id ? '' : id);
                                                    }
                                                }}
                                                className={`text-left bg-white border-2 rounded-2xl p-5 transition-all duration-200 ${
                                                    isSource
                                                        ? 'border-red-500 ring-4 ring-red-200 scale-[1.03] shadow-[5px_5px_0px_rgba(239,68,68,0.35)] z-10 relative'
                                                        : isDestination
                                                            ? 'border-green-500 ring-4 ring-green-200 scale-[1.03] shadow-[5px_5px_0px_rgba(34,197,94,0.35)] z-10 relative'
                                                            : 'shadow-[3px_3px_0px_rgba(60,50,30,0.8)] hover:-translate-y-0.5'
                                                } ${
                                                    !isSelected && (pool.feeder_id === null ? 'border-primary' : 'border-foreground')
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className={`absolute -top-2.5 -right-2.5 text-[10px] font-black px-2 py-0.5 rounded-full border-2 uppercase tracking-wider ${
                                                        isSource ? 'bg-red-500 text-white border-red-700' : 'bg-green-500 text-white border-green-700'
                                                    }`}>
                                                        {isSource ? t('pools.sourceBadge') : t('pools.toBadge')}
                                                    </span>
                                                )}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`p-2 rounded-xl border-2 border-foreground ${pool.feeder_id === null ? 'bg-primary' : Number(pool.balance || 0) < 5 ? 'bg-red-500' : 'bg-accent'}`}>
                                                            <DollarSign className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-sm truncate">{pool.feeder_name}</p>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{pool.feeder_id === null ? t('pools.global') : t('pools.feederLabel', { id: pool.feeder_id })}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase ${Number(pool.balance || 0) < 5 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                        {Number(pool.balance || 0) < 5 ? t('pools.low') : t('pools.funded')}
                                                    </span>
                                                </div>
                                                <p className="text-3xl font-black text-foreground">{fmtCurrency(Number(pool.balance || 0))}</p>
                                                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden border border-foreground/10">
                                                    <div className={`h-full ${Number(pool.balance || 0) < 5 ? 'bg-red-500' : pool.feeder_id === null ? 'bg-primary' : 'bg-accent'}`} style={{ width: `${Math.min(100, Math.max(6, (Number(pool.balance || 0) / Math.max(1, totalPoolBalance)) * 100))}%` }} />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-mono mt-2">{pool.last_updated ? new Date(pool.last_updated).toLocaleString(locale) : '-'}</p>
                                            </button>
                                        );
                                    })}
                                    {!poolLoading && pools.length === 0 && (
                                        <div className="col-span-full bg-white border-2 border-dashed border-foreground/30 rounded-2xl p-10 text-center">
                                            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                            <p className="font-black">{t('pools.noPoolsTitle')}</p>
                                            <p className="text-xs text-muted-foreground font-mono mt-1">{t('pools.noPoolsDescMap')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white border-2 border-foreground rounded-2xl p-6 shadow-[3px_3px_0px_rgba(60,50,30,0.8)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                    <h3 className="font-black text-lg">{t('pools.operationBuilder')}</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-5">
                                    {(Object.keys(poolActionMeta) as PoolAction[]).map(action => {
                                        const meta = poolActionMeta[action];
                                        const Icon = meta.icon;
                                        return (
                                            <button key={action} type="button" onClick={() => {
                                                setPoolAction(action);
                                                // Clear stale selections when switching mode
                                                setSourcePoolId('');
                                                setDestinationPoolId('');
                                                setSplitAmounts({});
                                            }} className={`p-3 rounded-xl border-2 text-left transition-all ${poolAction === action ? 'border-foreground bg-muted shadow-[2px_2px_0px_rgba(60,50,30,0.8)]' : 'border-foreground/15 hover:border-primary'}`}>
                                                <span className={`w-8 h-8 rounded-lg border-2 border-foreground ${meta.tone} flex items-center justify-center mb-2`}>
                                                    <Icon className="w-4 h-4 text-white" />
                                                </span>
                                                <span className="block font-black text-sm">{meta.label}</span>
                                                <span className="block text-[10px] text-muted-foreground font-mono mt-1">{meta.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="space-y-4">
                                    <input type="number" step="0.01" min="0.01" value={poolAmount} onChange={e => setPoolAmount(e.target.value)} placeholder={t('pools.amountPlaceholder')} className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm" />
                                    <select value={poolReason} onChange={e => { setPoolReason(e.target.value); if (e.target.value !== 'custom') setCustomReason(''); }} className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm">
                                        {reasonOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                    {poolReason === 'custom' && (
                                        <input
                                            type="text"
                                            value={customReason}
                                            onChange={e => setCustomReason(e.target.value)}
                                            placeholder={t('pools.customReasonPlaceholder')}
                                            className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                        />
                                    )}

                                    {(poolAction === 'withdraw' || poolAction === 'expense') && (
                                        <div className="flex rounded-xl border-2 border-foreground overflow-hidden">
                                            {(['single', 'split'] as const).map(mode => (
                                                <button key={mode} type="button" onClick={() => setSplitMode(mode)} className={`flex-1 px-3 py-2 text-xs font-black uppercase ${splitMode === mode ? 'bg-foreground text-white' : 'bg-white hover:bg-muted'}`}>
                                                    {mode === 'single' ? t('pools.onePool') : t('pools.split')}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {(poolAction === 'transfer' || ((poolAction === 'withdraw' || poolAction === 'expense') && splitMode === 'single')) && (
                                        <select value={sourcePoolId || String(globalPool?.id || '')} onChange={e => setSourcePoolId(e.target.value)} className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm">
                                            {pools.map(pool => <option key={pool.id} value={String(pool.id)}>{t('pools.fromPool', { name: pool.feeder_name, amount: fmtCurrency(Number(pool.balance || 0)) })}</option>)}
                                        </select>
                                    )}

                                    {(poolAction === 'add' || poolAction === 'transfer') && (
                                        <select value={destinationPoolId || String(globalPool?.id || '')} onChange={e => setDestinationPoolId(e.target.value)} className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm">
                                            {pools.map(pool => <option key={pool.id} value={String(pool.id)}>{t('pools.toPool', { name: pool.feeder_name, amount: fmtCurrency(Number(pool.balance || 0)) })}</option>)}
                                        </select>
                                    )}

                                    {(poolAction === 'withdraw' || poolAction === 'expense') && splitMode === 'split' && (
                                        <div className="rounded-xl border-2 border-foreground/15 p-3 bg-muted/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <SlidersHorizontal className="w-4 h-4 text-primary" />
                                                <p className="text-xs font-black uppercase">{t('pools.splitSources')}</p>
                                                <span className={`ml-auto text-xs font-mono ${splitMismatch ? 'text-red-600' : 'text-green-700'}`}>{fmtCurrency(splitTotal)} / {fmtCurrency(activePoolAmount)}</span>
                                            </div>
                                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                                {pools.map(pool => (
                                                    <div key={pool.id} className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 items-center">
                                                        <span className="text-xs font-bold truncate">{pool.feeder_name}</span>
                                                        <input type="number" step="0.01" min="0" value={splitAmounts[String(pool.id)] || ''} onChange={e => setSplitAmounts(prev => ({ ...prev, [String(pool.id)]: e.target.value }))} placeholder="0.00" className="px-2 py-1.5 border-2 border-foreground/20 rounded-lg bg-white font-mono text-xs" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-xl border-2 border-foreground/15 bg-background p-4">
                                        <p className="text-xs font-black uppercase tracking-wider mb-3">{t('pools.preview')}</p>
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-4">
                                            <div className="space-y-1">
                                                {(operationSources.length > 0 ? operationSources : poolAction === 'add' ? [{ pool: { id: 'admin', feeder_name: t('pools.adminFunds'), balance: 0 } as DonationPool, amount: activePoolAmount }] : []).map(entry => (
                                                    <div key={`source-${entry.pool.id}`} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5">
                                                        <p className="text-[10px] font-black uppercase text-red-700 truncate">{t('pools.fromBadgePreview', { name: entry.pool.feeder_name })}</p>
                                                        <p className="text-xs font-mono">{fmtCurrency(entry.amount || 0)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={`w-10 h-10 rounded-full border-2 border-foreground ${poolActionMeta[poolAction].tone} flex items-center justify-center shadow-[2px_2px_0px_rgba(60,50,30,0.8)]`}>
                                                {React.createElement(poolActionMeta[poolAction].icon, { className: 'w-4 h-4 text-white' })}
                                            </div>
                                            <div className="space-y-1">
                                                {(operationDestinations.length > 0 ? operationDestinations : (poolAction === 'withdraw' || poolAction === 'expense') ? [{ pool: { id: 'outside', feeder_name: poolReason === 'custom' ? (customReason.trim() || t('pools.customFallback')) : (reasonOptions.find(option => option.value === poolReason)?.label || t('pools.externalUse')), balance: 0 } as DonationPool, amount: activePoolAmount }] : []).map(entry => (
                                                    <div key={`destination-${entry.pool.id}`} className="rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-right">
                                                        <p className="text-[10px] font-black uppercase text-green-700 truncate">{t('pools.toBadgePreview', { name: entry.pool.feeder_name })}</p>
                                                        <p className="text-xs font-mono">{fmtCurrency(entry.amount || 0)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {[...operationSources, ...operationDestinations].map((entry, index) => {
                                                const current = Number(entry.pool.balance || 0);
                                                const isDestination = operationDestinations.some(dest => dest.pool.id === entry.pool.id && index >= operationSources.length);
                                                const next = isDestination ? current + entry.amount : current - entry.amount;
                                                return (
                                                    <div key={`${entry.pool.id}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                                                        <span className="font-bold truncate">{entry.pool.feeder_name}</span>
                                                        <span className={`font-mono whitespace-nowrap ${next < 0 ? 'text-red-600' : 'text-foreground'}`}>{fmtCurrency(current)} -&gt; {fmtCurrency(next)}</span>
                                                    </div>
                                                );
                                            })}
                                            {operationSources.length === 0 && operationDestinations.length === 0 && (
                                                <p className="text-xs text-muted-foreground font-mono">{t('pools.previewPlaceholder')}</p>
                                            )}
                                        </div>
                                    </div>

                                    {(hasInsufficientFunds || splitMismatch || transferSamePool) && (
                                        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-mono text-red-700">
                                            {hasInsufficientFunds ? t('pools.insufficientFunds') : splitMismatch ? t('pools.splitMismatch') : t('pools.transferSame')}
                                        </div>
                                    )}

                                    <button onClick={handlePoolAction} disabled={poolLoading || !canSubmitPoolOperation} className={`w-full px-5 py-3 border-2 border-foreground rounded-xl font-black text-sm text-white shadow-[3px_3px_0px_rgba(60,50,30,0.8)] hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${poolActionMeta[poolAction].tone}`}>
                                        {poolLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : React.createElement(poolActionMeta[poolAction].icon, { className: 'w-4 h-4' })}
                                        {t('pools.confirmAction', { action: poolActionMeta[poolAction].label })}
                                    </button>

                                    {poolMessage && (
                                        <div className={`p-3 rounded-xl border text-sm font-mono ${poolMessage.startsWith('Failed') ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
                                            {poolMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pool Balances */}
                        <div className="hidden">
                            {pools.map(pool => (
                                <div key={pool.id} className={`bg-white border-2 border-foreground rounded-2xl p-5 shadow-[3px_3px_0px_rgba(60,50,30,0.8)] ${pool.feeder_id === null ? 'ring-2 ring-primary' : ''}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-xl border-2 border-foreground ${pool.feeder_id === null ? 'bg-primary' : 'bg-accent'}`}>
                                                <DollarSign className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm">{pool.feeder_name}</p>
                                                {pool.feeder_id === null && <span className="text-[10px] font-bold text-primary uppercase">{t('pools.primaryFund')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-foreground">€{Number(pool.balance).toFixed(2)}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-1">{t('pools.updated', { value: pool.last_updated ? new Date(pool.last_updated).toLocaleString(locale) : '–' })}</p>
                                </div>
                            ))}
                            {pools.length === 0 && !poolLoading && (
                                <div className="col-span-full bg-white border-2 border-dashed border-foreground/30 rounded-2xl p-12 text-center">
                                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="font-bold text-muted-foreground">{t('pools.noPoolsTitle')}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{t('pools.noPoolsDesc')}</p>
                                </div>
                            )}
                        </div>

                        {/* Admin Actions */}
                        <div className="hidden">
                            <h3 className="font-black text-lg mb-1">{t('pools.actionsTitle')}</h3>
                            <p className="text-sm text-muted-foreground font-mono mb-5">{t('pools.actionsSubtitle')}</p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Action Select */}
                                <div className="flex-shrink-0">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{t('pools.actionLabel')}</label>
                                    <select
                                        value={poolAction}
                                        onChange={e => setPoolAction(e.target.value as PoolAction)}
                                        className="w-full px-4 py-2.5 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                    >
                                        <option value="withdraw">{t('pools.deduct')}</option>
                                        <option value="add">{t('pools.add')}</option>
                                    </select>
                                </div>

                                {/* Amount */}
                                <div className="flex-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{t('pools.amountLabel')}</label>
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
                                {poolAction === 'withdraw' && (
                                    <div className="flex-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{t('pools.reasonLabel')}</label>
                                        <input
                                            type="text"
                                            value={poolReason}
                                            onChange={e => setPoolReason(e.target.value)}
                                            placeholder={t('pools.reasonPlaceholder')}
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
                                            poolAction === 'withdraw' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                        }`}
                                    >
                                        {poolLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : poolAction === 'withdraw' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                        {poolAction === 'withdraw' ? t('pools.withdraw') : t('pools.addFunds')}
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

                        {/* Recent Money Events */}
                        <div className="bg-white border-2 border-foreground rounded-2xl p-6 shadow-[3px_3px_0px_rgba(60,50,30,0.8)]">
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="font-black text-lg">{t('pools.recentMovements')}</h3>
                                    <p className="text-sm text-muted-foreground font-mono">{t('pools.recentMovementsDesc')}</p>
                                </div>
                                <button
                                    onClick={fetchPools}
                                    disabled={poolLoading}
                                    className="p-2 rounded-lg border-2 border-foreground/20 hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                                    title="Refresh movements"
                                >
                                    <RefreshCw className={`w-4 h-4 ${poolLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {poolEvents.length > 0 ? (
                                <div className="space-y-2">
                                    {poolEvents.slice(0, 10).map((event) => (
                                        <div key={event.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-foreground/10 bg-muted/20">
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm truncate">{event.reason_en || event.reason.replaceAll('_', ' ')}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">
                                                    {t.has(`pools.eventTypes.${event.event_type}`) ? t(`pools.eventTypes.${event.event_type}`) : event.event_type.replaceAll('_', ' ')} - {event.created_at ? new Date(event.created_at).toLocaleString(locale) : '-'}
                                                </p>
                                            </div>
                                            <span className="font-black text-sm whitespace-nowrap">{fmtCurrency(Number(event.amount_eur || 0))}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed border-foreground/10 rounded-xl text-sm text-muted-foreground font-mono">
                                    {t('pools.noMovements')}
                                </div>
                            )}
                        </div>

                        {/* Explanation */}
                        <div className="bg-muted/30 border-2 border-foreground/10 rounded-2xl p-5">
                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> {t('pools.howItWorksTitle')}</h4>
                            <ul className="text-xs text-muted-foreground font-mono space-y-1.5 list-disc list-inside">
                                <li><strong>{t('pools.bullets.globalPoolTitle')}</strong> — {t('pools.bullets.globalPool')}</li>
                                <li><strong>{t('pools.bullets.feederPoolTitle')}</strong> — {t('pools.bullets.feederPool')}</li>
                                <li><strong>{t('pools.bullets.liveDonationTitle')}</strong> — {t('pools.bullets.liveDonation')}</li>
                                <li><strong>{t('pools.bullets.deductionsTitle')}</strong> — {t('pools.bullets.deductions')}</li>
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
