import { createAdminClient } from '@/lib/supabase/admin';

export type MoneyEventInsert = {
    event_type: string;
    reason: string;
    reason_en?: string | null;
    amount_eur: number;
    actor_auth_id?: string | null;
    user_auth_id?: string | null;
    source_pool_id?: number | null;
    destination_pool_id?: number | null;
    feeder_id?: number | null;
    meal_id?: number | null;
    donation_id?: number | null;
    idempotency_key?: string | null;
};

export type MoneyEventAllocationInsert = {
    event_id: number;
    user_auth_id: string;
    donation_id?: number | null;
    amount_eur: number;
};

type InsertedEvent = {
    id: number;
};

export async function logMoneyEvent(
    event: MoneyEventInsert
): Promise<number | null> {
    let supabase;
    try {
        supabase = createAdminClient();
    } catch (error) {
        console.warn('Money event logging skipped:', error instanceof Error ? error.message : 'Admin client unavailable');
        return null;
    }

    const { data, error } = await supabase
        .from('money_events')
        .insert(event)
        .select('id')
        .maybeSingle();

    if (error) {
        console.warn('Money event logging failed:', error.message);
        return null;
    }

    const inserted = data as InsertedEvent | null;
    return inserted?.id ?? null;
}

export async function logMoneyEventAllocations(
    allocations: MoneyEventAllocationInsert[]
) {
    if (allocations.length === 0) return;

    let supabase;
    try {
        supabase = createAdminClient();
    } catch (error) {
        console.warn('Money event allocation logging skipped:', error instanceof Error ? error.message : 'Admin client unavailable');
        return;
    }

    const { error } = await supabase
        .from('money_event_allocations')
        .insert(allocations);

    if (error) {
        console.warn('Money event allocation logging failed:', error.message);
    }
}
