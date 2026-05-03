import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";

const TOKEN_TTL_SECONDS = 60 * 60;

function getViewerUid() {
    return Math.floor(Math.random() * 2_000_000_000) + 1;
}

export async function GET(request: Request) {
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        return NextResponse.json({ error: "Agora is not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const feederId = searchParams.get("feederId");
    const channel = searchParams.get("channel");

    if (!feederId || !channel) {
        return NextResponse.json({ error: "Missing feederId or channel" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: activeStream, error } = await supabase
        .from("livestreams")
        .select("id, stream_channel, stream_provider, is_active, viewer_count")
        .eq("feeder_id", feederId)
        .eq("stream_provider", "agora")
        .eq("stream_channel", channel)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not verify stream" }, { status: 500 });
    }

    if (!activeStream) {
        return NextResponse.json({ error: "Stream is not active" }, { status: 404 });
    }

    const uid = getViewerUid();
    const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        uid,
        RtcRole.SUBSCRIBER,
        TOKEN_TTL_SECONDS,
        TOKEN_TTL_SECONDS
    );

    return NextResponse.json({
        appId,
        channel,
        uid,
        token,
        streamId: String(activeStream.id),
        viewerCount: Number(activeStream.viewer_count ?? 0),
        expiresIn: TOKEN_TTL_SECONDS,
    });
}
