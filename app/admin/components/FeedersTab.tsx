import React from 'react';
import Link from 'next/link';
import { Package, Plus, MapPin, Edit3, Trash2, ArrowUpRight, Loader2, Save } from 'lucide-react';
import { AdminData, Feeder } from '../types';
import { StatusBadge } from './StatusBadge';
import { deriveConnectionStatus, formatLastSeen } from '../../types';

interface FeedersTabProps {
    data: AdminData;
    deletingId: string | null;
    editingFeeder: Feeder | null;
    editStatus: string;
    setEditingFeeder: (f: Feeder | null) => void;
    setEditStatus: (s: string) => void;
    handleDeleteFeeder: (id: string | number) => void;
    handleUpdateFeederStatus: (feeder: Feeder) => void;
    setShowAddFeeder: (s: boolean) => void;
}

export const FeedersTab = ({
    data, deletingId, editingFeeder, editStatus,
    setEditingFeeder, setEditStatus,
    handleDeleteFeeder, handleUpdateFeederStatus, setShowAddFeeder
}: FeedersTabProps) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black">Feeder Management</h2>
                    <p className="text-sm text-muted-foreground font-mono">Connected to live Supabase database</p>
                </div>
                <button
                    onClick={() => setShowAddFeeder(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white text-sm shadow-[3px_3px_0px_rgba(60,50,30,0.8)] hover:shadow-[5px_5px_0px_rgba(60,50,30,0.8)] hover:-translate-y-0.5 transition-all"
                >
                    <Plus className="w-4 h-4" /> Add Feeder
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: data.feeders.length, color: 'bg-primary' },
                    { label: 'Online', value: data.overview.activeFeeders, color: 'bg-green-500' },
                    { label: 'Offline', value: data.overview.offlineFeeders, color: 'bg-red-500' },
                    { label: 'Disabled', value: data.overview.disabledFeeders, color: 'bg-gray-500' },
                ].map(s => (
                    <div key={s.label} className="bg-white border-2 border-foreground rounded-xl p-4 shadow-[3px_3px_0px_rgba(60,50,30,0.8)] flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${s.color}`} />
                        <div>
                            <p className="text-2xl font-black">{s.value}</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {data.feeders.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-foreground/30 rounded-2xl p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-bold text-lg mb-2">No feeders in database</h3>
                    <button onClick={() => setShowAddFeeder(true)} className="px-6 py-2.5 bg-primary border-2 border-foreground rounded-xl font-bold text-white text-sm">
                        Add First Feeder
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {data.feeders.map(feeder => {
                        const foodLevel = feeder.stock_level ?? 0;
                        const animals = feeder.left_overs ?? 0;
                        const connectionStatus = deriveConnectionStatus(feeder.enabled, feeder.last_seen_at || null);
                        const isEditing = editingFeeder?.id === feeder.id;
                        const isDeleting = deletingId === String(feeder.id);

                        return (
                            <div key={feeder.id} className="bg-white border-2 border-foreground rounded-2xl shadow-[3px_3px_0px_rgba(60,50,30,0.8)] overflow-hidden">
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                        connectionStatus === 'online' ? 'bg-green-500 animate-pulse' :
                                        connectionStatus === 'disabled' ? 'bg-gray-400' : 'bg-red-500'
                                    }`} />
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
                                            <code className="text-[10px] bg-muted px-2 py-1 rounded border border-foreground/10 font-mono select-all cursor-copy">
                                                {feeder.pi_auth_key || 'No key'}
                                            </code>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-center">
                                            <p className="font-black text-primary">{foodLevel}%</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">Food</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-accent-foreground">{animals}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Leftovers</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => { setEditingFeeder(feeder); setEditStatus(feeder.enabled ? 'enabled' : 'disabled'); }} className="p-2 rounded-lg border-2 border-foreground/20 hover:border-primary hover:bg-primary/10 transition-colors">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteFeeder(feeder.id)} disabled={isDeleting} className="p-2 rounded-lg border-2 border-foreground/20 hover:border-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                        <Link href={`/feeder/${feeder.id}`} className="p-2 rounded-lg border-2 border-foreground/20 hover:border-accent hover:bg-accent/10 transition-colors">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="border-t-2 border-border bg-muted/30 px-5 py-4 flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Admin Status:</label>
                                            <select
                                                value={editStatus}
                                                onChange={e => setEditStatus(e.target.value)}
                                                className="px-3 py-1.5 border-2 border-foreground rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {['enabled', 'disabled'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => handleUpdateFeederStatus(feeder)} className="px-4 py-1.5 bg-primary border-2 border-foreground rounded-lg text-xs font-bold text-white flex items-center gap-1.5 hover:bg-primary/90">
                                                <Save className="w-3 h-3" /> Save
                                            </button>
                                            <button onClick={() => setEditingFeeder(null)} className="px-4 py-1.5 border-2 border-foreground rounded-lg text-xs font-bold hover:bg-muted">
                                                Cancel
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
    );
};
