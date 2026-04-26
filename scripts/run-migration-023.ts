/**
 * Apply migration 023: link guest enrollments to new users on signup.
 * Usage: npx tsx scripts/run-migration-023.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const sql = fs.readFileSync(
    "supabase/migrations/023_link_guest_enrollments_on_signup.sql",
    "utf-8"
  );
  // Supabase service-role key cannot run arbitrary SQL via the JS client.
  // We use the REST execute_sql RPC if it's exposed; otherwise fall back
  // to the database REST endpoint.
  const { error } = await sb.rpc("execute_sql", { sql });
  if (error) {
    console.error(
      "execute_sql RPC failed (likely not exposed). Apply this SQL manually via Supabase dashboard SQL editor:\n"
    );
    console.error(sql);
    process.exit(1);
  }
  console.log("✓ migration 023 applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
