import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseServiceClient(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use the Supabase database.");
  }

  if (!serviceClient) {
    serviceClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return serviceClient;
}
