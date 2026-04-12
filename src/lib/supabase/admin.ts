/**
 * Supabase Admin Client — uses SERVICE_ROLE key.
 * ONLY use server-side (Server Actions, API Routes).
 * Bypasses RLS — use with caution.
 *
 * Use cases:
 *   - Guest enrollment (insert without auth)
 *   - Creating user accounts on admin approval
 *   - Querying auth.users for email checks
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
