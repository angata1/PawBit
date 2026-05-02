import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feederId } = await request.json();

    if (!feederId) {
        return NextResponse.json({ error: 'Missing feederId' }, { status: 400 });
    }

    const { data: feeder, error: feederError } = await supabase
        .from('feeders')
        .select('pi_auth_key')
        .eq('id', feederId)
        .single();

    if (feederError || !feeder) {
        return NextResponse.json({ error: 'Feeder not found' }, { status: 404 });
    }

    try {
        const commandChannel = supabase.channel(`feeder_commands_${feederId}`);
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Realtime channel subscribe timed out')), 5000);
            commandChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    const payloadObj = { requested_by: user.id };
                    const rawPayload = JSON.stringify(payloadObj);
                    const signature = crypto
                        .createHmac('sha256', feeder.pi_auth_key || 'fallback')
                        .update(rawPayload)
                        .digest('hex');

                    await commandChannel.send({
                        type: 'broadcast',
                        event: 'start_stream',
                        payload: {
                            raw: rawPayload,
                            signature
                        }
                    });
                    resolve();
                }
            });
        });
        await supabase.removeChannel(commandChannel);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to start stream' }, { status: 500 });
    }
}
