import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET - fetch all feeders
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

    const { data: feeders, error } = await supabase
        .from('feeders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feeders: feeders || [] });
}

// POST - create a new feeder
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (dbUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, lat, lng, status, food_level, dispense_price_eur } = body;
    const dispensePrice = Number(dispense_price_eur || 2);

    if (!name || !address) {
        return NextResponse.json({ error: 'Name and address are required' }, { status: 400 });
    }

    if (!Number.isFinite(dispensePrice) || dispensePrice <= 0) {
        return NextResponse.json({ error: 'Dispense price must be greater than 0' }, { status: 400 });
    }

    // Generate a unique registration key for the Raspberry Pi
    const pi_key = crypto.randomUUID();

    const { data, error } = await supabase
        .from('feeders')
        .insert({
            name,
            location: {
                address,
                lat: lat || 42.6977,
                lng: lng || 23.3219,
            },
            pi_auth_key: pi_key,
            enabled: status !== 'offline',
            stock_level: food_level || 100,
            left_overs: 0,
            dispense_price_eur: dispensePrice,
            importance_rank: 0
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create a pool for this feeder
    if (data) {
        await supabase.from('donation_pools').insert({
            feeder_id: data.id,
            balance_amount: 0.0
        });
    }

    // Return the generated key so the admin can copy it
    return NextResponse.json({ 
        feeder: {
            ...data,
            pi_auth_key: pi_key
        } 
    });
}
