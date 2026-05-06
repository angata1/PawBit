import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAgoraIngestUrl, createAgoraStreamingKey } from '@/lib/agora/mediaGateway';
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

type AdminSupabase = ReturnType<typeof createAdminClient>;

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let createdStreamId: string | null = null;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body)) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const feederId = body.feederId;

    if (!feederId) {
        return NextResponse.json({ error: 'Missing feederId' }, { status: 400 });
    }

    let adminSupabase: AdminSupabase;
    try {
        adminSupabase = createAdminClient();
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client is not configured' }, { status: 500 });
    }

    const { data: feeder, error: feederError } = await adminSupabase
        .from('feeders')
        .select('pi_auth_key')
        .eq('id', feederId)
        .single();

    if (feederError || !feeder) {
        return NextResponse.json({ error: 'Feeder not found' }, { status: 404 });
    }

    const feederRecord: unknown = feeder;
    if (!isRecord(feederRecord)) {
        return NextResponse.json({ error: 'Feeder not found' }, { status: 404 });
    }

    try {
        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID;
        const region = process.env.AGORA_REGION;

        if (!appId || !region) {
            const missing = [
                !appId ? 'NEXT_PUBLIC_AGORA_APP_ID or AGORA_APP_ID' : null,
                !region ? 'AGORA_REGION' : null,
            ].filter(Boolean).join(', ');
            return NextResponse.json({ error: `Agora stream key generation is not configured. Missing: ${missing}` }, { status: 500 });
        }

        const streamChannel = `pawbit-feeder-${feederId}`;
        const streamUid = `feeder-${feederId}`;
        await adminSupabase
            .from('livestreams')
            // @ts-expect-error: Livestreams table types are not correctly inferred by Supabase client
            .update({
                is_active: false,
                viewer_count: 0
            })
            .eq('feeder_id', feederId)
            .eq('stream_provider', 'agora')
            .eq('is_active', true);

        const streamKey = await createAgoraStreamingKey({
            appId,
            channel: streamChannel,
            region,
            uid: streamUid,
        });
        const streamUrl = buildAgoraIngestUrl(region, streamKey);

        const { data: insertedRows, error: insertError } = await adminSupabase
            .from('livestreams')
            // @ts-expect-error: Livestreams table types are not correctly inferred by Supabase client
            .insert({
                feeder_id: feederId,
                stream_provider: 'agora',
                stream_channel: streamChannel,
                stream_uid: streamUid,
                stream_key: streamKey,
                stream_url: streamUrl,
                viewer_count: 0,
                is_active: true
            })
            .select('id')
            .single();

        if (insertError || !insertedRows) {
            return NextResponse.json({ error: 'Failed to create livestream record' }, { status: 500 });
        }
        const insertedRecord: unknown = insertedRows;
        if (!isRecord(insertedRecord) || (typeof insertedRecord.id !== 'string' && typeof insertedRecord.id !== 'number')) {
            return NextResponse.json({ error: 'Failed to create livestream record' }, { status: 500 });
        }
        createdStreamId = String(insertedRecord.id);
        const insertedId = insertedRecord.id;

        const commandChannel = supabase.channel(`feeder_commands_${feederId}`);
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Realtime channel subscribe timed out')), 5000);
            commandChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    const payloadObj = {
                        requested_by: user.id,
                        stream_id: insertedId,
                        stream_channel: streamChannel,
                        stream_uid: streamUid,
                    };
                    const rawPayload = JSON.stringify(payloadObj);
                    const signature = crypto
                        .createHmac('sha256', (feederRecord.pi_auth_key as unknown as string) || 'fallback')
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
        if (createdStreamId) {
            await adminSupabase
                .from('livestreams')
                // @ts-expect-error: Livestreams table types are not correctly inferred by Supabase client
                .update({ is_active: false, viewer_count: 0 })
                .eq('id', createdStreamId);
        }
        return NextResponse.json({ error: 'Failed to start stream' }, { status: 500 });
    }
}
