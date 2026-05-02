import React, { useState } from 'react';
import { Plus, X, Save, CheckCircle, Loader2 } from 'lucide-react';
import { Feeder } from '../types';

interface AddFeederModalProps {
    onClose: () => void;
    onAdd: (feeder: Feeder) => void;
}

export const AddFeederModal = ({ onClose, onAdd }: AddFeederModalProps) => {
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
