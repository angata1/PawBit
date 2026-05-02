import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// PATCH - update a feeder
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (dbUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const allowedFields = ['name', 'location', 'enabled', 'active', 'dispense_price_eur', 'pi_auth_key', 'stock_level', 'left_overs', 'importance_rank', 'status', 'is_streaming'];
    const updatePayload: any = {};
    for (const key of allowedFields) {
        if (body[key] !== undefined) {
            updatePayload[key] = body[key];
        }
    }

    if (updatePayload.dispense_price_eur !== undefined) {
        const price = Number(updatePayload.dispense_price_eur);
        if (!Number.isFinite(price) || price <= 0) {
            return NextResponse.json({ error: 'Dispense price must be greater than 0' }, { status: 400 });
        }
        updatePayload.dispense_price_eur = price;
    }

    const { data, error } = await supabase
        .from('feeders')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feeder: data });
}

// DELETE - remove a feeder
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (dbUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
        .from('feeders')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
