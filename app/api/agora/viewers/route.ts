import { NextResponse } from "next/server";

type AgoraChannelUsersResponse = {
    success?: boolean;
    data?: {
        channel_exist?: boolean;
        broadcasters?: Array<number | string> | null;
        audience?: Array<number | string> | null;
        audience_total?: number | null;
    };
};

function getAgoraCredentials() {
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID || process.env.AGORA_REST_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET || process.env.AGORA_REST_CUSTOMER_SECRET;

    if (!appId || !customerId || !customerSecret) {
        return null;
    }

    return { appId, customerId, customerSecret };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel")?.trim();

    if (!channel) {
        return NextResponse.json({ error: "Missing channel" }, { status: 400 });
    }

    const credentials = getAgoraCredentials();
    if (!credentials) {
        return NextResponse.json({
            channel,
            channelExists: false,
            viewerCount: 0,
            broadcasterCount: 0,
            warning: "Agora REST credentials are not configured",
        });
    }

    const basicAuth = Buffer.from(`${credentials.customerId}:${credentials.customerSecret}`).toString("base64");
    const response = await fetch(
        `https://api.agora.io/dev/v1/channel/user/${encodeURIComponent(credentials.appId)}/${encodeURIComponent(channel)}`,
        {
            headers: {
                Authorization: `Basic ${basicAuth}`,
                Accept: "application/json",
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const body = await response.text();
        console.error("Agora viewer query failed:", response.status, body);
        return NextResponse.json({ error: "Could not query Agora viewers" }, { status: 502 });
    }

    const data = (await response.json()) as AgoraChannelUsersResponse;
    const audience = Array.isArray(data.data?.audience) ? data.data.audience : [];
    const broadcasters = Array.isArray(data.data?.broadcasters) ? data.data.broadcasters : [];
    const uniqueAudienceCount = new Set(audience.map((uid) => String(uid))).size;

    return NextResponse.json({
        channel,
        channelExists: Boolean(data.data?.channel_exist),
        viewerCount: Math.max(0, uniqueAudienceCount),
        broadcasterCount: broadcasters.length,
    });
}
