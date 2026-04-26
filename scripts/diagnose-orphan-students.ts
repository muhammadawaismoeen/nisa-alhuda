/**
 * Find users who logged in but have no enrollments visible.
 *
 * Cross-references auth.users (who has signed in) with the enrollments
 * table (who is actually enrolled in something). Anyone in the first set
 * but not the second is going to see "No enrollments yet" on /dashboard
 * and is likely a student who paid out-of-band, was approved manually
 * but never had an enrollment row created, OR signed up via the public
 * register form without going through the enrollment wizard.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: list } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const users = list?.users ?? [];

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name, role");
  const profileById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const { data: enrollments } = await sb
    .from("enrollments")
    .select("student_id, offering_id, status, created_at, offering:offerings(title)");

  const enrolledMap = new Map<string, typeof enrollments>();
  for (const e of enrollments ?? []) {
    if (!enrolledMap.has(e.student_id)) enrolledMap.set(e.student_id, []);
    enrolledMap.get(e.student_id)!.push(e);
  }

  const orphans: { user: typeof users[number]; profile: { full_name: string; role: string } | null }[] = [];
  const enrolledStudents: { user: typeof users[number]; rows: NonNullable<typeof enrollments> }[] = [];

  for (const u of users) {
    const profile = profileById[u.id];
    // Skip non-students (admins, instructors, treasurers)
    if (profile && profile.role !== "student") continue;
    const rows = enrolledMap.get(u.id);
    if (!rows || rows.length === 0) {
      orphans.push({ user: u, profile });
    } else {
      enrolledStudents.push({ user: u, rows });
    }
  }

  console.log(`\n=== Logged-in students WITH enrollments (${enrolledStudents.length}) ===`);
  for (const { user: u, rows } of enrolledStudents.slice(0, 50)) {
    const lastSeen = u.last_sign_in_at
      ? new Date(u.last_sign_in_at).toISOString().slice(0, 16).replace("T", " ")
      : "never";
    console.log(`  ${(profileById[u.id]?.full_name || "—").padEnd(28)} ${u.email}`);
    for (const r of rows) {
      const off = (r as { offering?: { title?: string } }).offering?.title ?? r.offering_id;
      console.log(`     · ${r.status.padEnd(8)} → ${off}  (last sign-in: ${lastSeen})`);
    }
  }

  console.log(`\n=== Logged-in students with NO enrollment rows (${orphans.length}) ===`);
  console.log(`These are the users seeing "No enrollments yet":`);
  for (const { user: u, profile } of orphans) {
    const lastSeen = u.last_sign_in_at
      ? new Date(u.last_sign_in_at).toISOString().slice(0, 16).replace("T", " ")
      : "never";
    console.log(
      `  ${(profile?.full_name || "—").padEnd(28)} ${u.email?.padEnd(40) || "(no email)"}  last sign-in: ${lastSeen}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
