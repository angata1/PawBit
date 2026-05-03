import crypto from "crypto";

type CreateStreamingKeyArgs = {
    appId: string;
    channel: string;
    expiresAfterSeconds?: number;
    region: string;
    uid: string;
};

function getBasicAuthHeader() {
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (!customerId || !customerSecret) {
        throw new Error("Agora customer credentials are not configured");
    }

    return `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString("base64")}`;
}

export function buildAgoraIngestUrl(region: string, streamKey: string) {
    return `rtmp://rtls-ingress-prod-${region}.agoramdn.com/live/${streamKey}`;
}

export async function createAgoraStreamingKey({
    appId,
    channel,
    expiresAfterSeconds = Number(process.env.AGORA_STREAM_KEY_TTL_SECONDS ?? 86400),
    region,
    uid,
}: CreateStreamingKeyArgs) {
    const normalizedRegion = region.trim().toLowerCase();
    const response = await fetch(
        `https://api.agora.io/${normalizedRegion}/v1/projects/${appId}/rtls/ingress/streamkeys`,
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                Authorization: getBasicAuthHeader(),
                "Content-Type": "application/json",
                "X-Request-ID": crypto.randomUUID(),
            },
            body: JSON.stringify({
                settings: {
                    channel,
                    uid,
                    expiresAfter: expiresAfterSeconds,
                },
            }),
        }
    );

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(
            `Agora stream key creation failed (${response.status} ${response.statusText}): ${responseText}`
        );
    }

    let parsed: { status?: string; data?: { streamKey?: string } };
    try {
        parsed = JSON.parse(responseText) as typeof parsed;
    } catch {
        throw new Error("Agora stream key response was not valid JSON");
    }

    const streamKey = parsed.data?.streamKey;
    if (!streamKey) {
        throw new Error("Agora stream key response did not include streamKey");
    }

    return streamKey;
}
