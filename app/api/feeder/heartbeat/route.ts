import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// POST - Raspberry Pi heartbeat
// Called every ~30s by the Python script on the Pi.
// Authenticates via pi_auth_key, updates last_seen_at + sensor data.
// Returns 403 if the feeder is disabled by admin.
export async function POST(request: Request) {
    const supabase = await createClient();

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isRecord(body)) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const pi_auth_key = body.pi_auth_key;
    const stock_level = body.stock_level;
    const left_overs = body.left_overs;

    if (typeof pi_auth_key !== 'string' || !pi_auth_key) {
        return NextResponse.json({ error: 'pi_auth_key is required' }, { status: 400 });
    }

    // Look up feeder by its unique auth key
    const { data: feeder, error: lookupError } = await supabase
        .from('feeders')
        .select('id, enabled')
        .eq('pi_auth_key', pi_auth_key)
        .single();

    if (lookupError || !feeder) {
        return NextResponse.json({ error: 'Feeder not found. Invalid pi_auth_key.' }, { status: 404 });
    }

    // Enforce admin-disabled feeders
    if (!feeder.enabled) {
        return NextResponse.json(
            { error: 'Feeder is disabled by admin', reason: 'feeder_disabled' },
            { status: 403 }
        );
    }

    // Build the update payload — always set last_seen_at
    const updatePayload: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
    };

    if (typeof stock_level === 'number') {
        updatePayload.stock_level = Math.max(0, Math.min(100, stock_level));
    }

    if (typeof left_overs === 'number') {
        updatePayload.left_overs = Math.max(0, left_overs);
    }

    const { error: updateError } = await supabase
        .from('feeders')
        .update(updatePayload)
        .eq('id', feeder.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', feeder_id: feeder.id });
}
