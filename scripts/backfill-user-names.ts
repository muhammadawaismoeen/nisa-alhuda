/**
 * Backfill profiles.full_name for users whose auth account was provisioned
 * by the admin "Send credentials" flow before we started seeding
 * user_metadata.full_name on invite.
 *
 * Strategy:
 *   - Find profiles with full_name NULL / "" / "User" (the trigger default).
 *   - For each, look up their enrollment by student_id and pull a name from
 *     student_details (full_name, name, or first_name+last_name).
 *   - If found, update profiles.full_name.
 *
 * Safe to run repeatedly — only touches rows that still look like the
 * default placeholder.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type StudentDetails = {
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
};

function pickName(details: StudentDetails | null | undefined): string {
  if (!details) return "";
  const direct =
    details.full_name ||
    details.name ||
    [details.first_name, details.last_name].filter(Boolean).join(" ").trim();
  return direct || "";
}

async function main() {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .or("full_name.is.null,full_name.eq.,full_name.eq.User");

  if (error) {
    console.error("Failed to fetch profiles:", error.message);
    process.exit(1);
  }

  if (!profiles?.length) {
    console.log("No placeholder-named profiles found. Nothing to do.");
    return;
  }

  console.log(`Found ${profiles.length} profile(s) with placeholder names.`);

  let updated = 0;
  let missing = 0;

  for (const p of profiles) {
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("student_details, created_at")
      .eq("student_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const details = (enrollments?.[0]?.student_details || null) as
      | StudentDetails
      | null;
    const name = pickName(details);

    if (!name) {
      missing++;
      console.log(`  · ${p.id} — no student_details name, skipping`);
      continue;
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({ full_name: name })
      .eq("id", p.id);

    if (updErr) {
      console.error(`  ✗ ${p.id} — ${updErr.message}`);
      continue;
    }

    updated++;
    console.log(`  ✓ ${p.id} → "${name}"`);
  }

  console.log(
    `\nDone. Updated ${updated}. Skipped (no source name) ${missing}.`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
