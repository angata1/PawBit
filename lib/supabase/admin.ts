import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        const missing = [
            !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
            !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
        ].filter(Boolean).join(", ");
        throw new Error(`Supabase admin client is not configured. Missing: ${missing}`);
    }

    if (!adminClient) {
        adminClient = createClient(url, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return adminClient;
}
