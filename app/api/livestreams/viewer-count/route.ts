import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ViewerCountRequestBody = {
    streamId?: string;
    viewerCount?: number;
};

export async function POST(request: Request) {
    let body: ViewerCountRequestBody;

    try {
        body = (await request.json()) as ViewerCountRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const streamId = body.streamId?.trim();
    const viewerCount = Math.max(0, Math.floor(Number(body.viewerCount ?? 0)));

    if (!streamId) {
        return NextResponse.json({ error: "Missing streamId" }, { status: 400 });
    }

    let supabase;
    try {
        supabase = createAdminClient();
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    }

    type LivestreamRow = { id: string; viewer_count: number | null };

    try {
        const { data: stream, error: streamError } = await (supabase
            .from("livestreams")
            .select("id, viewer_count")
            .eq("id", streamId)
            .maybeSingle() as unknown as Promise<{ data: LivestreamRow | null; error: { message: string } | null }>);

        if (streamError) {
            throw streamError;
        }

        if (!stream) {
            return NextResponse.json({ error: "Livestream not found" }, { status: 404 });
        }

        if (Number(stream.viewer_count ?? 0) !== viewerCount) {
            type UpdateBuilder = {
                update(values: Record<string, unknown>): {
                    eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
                };
            };
            const table = supabase.from("livestreams") as unknown as UpdateBuilder;
            const { error: updateError } = await table
                .update({ viewer_count: viewerCount })
                .eq("id", streamId);

            if (updateError) {
                throw updateError;
            }
        }

        return NextResponse.json({ streamId, viewerCount });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update viewer count" }, { status: 500 });
    }
}
