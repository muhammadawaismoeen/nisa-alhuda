/**
 * Set / reset the four Noor Journey One teacher accounts.
 *
 * For each entry:
 *   - Locates the existing user (by old @nisaalhuda.com email OR by name
 *     match against profiles.full_name) and either updates them in place
 *     OR creates a fresh account if no match.
 *   - Sets the requested Gmail address + a known default password.
 *   - Marks email as confirmed so they can sign in straight away.
 *   - Updates the profile's primary role + roles[] array.
 *   - Wires the matching subject under "Noor Journey One" to point at
 *     this user.
 *
 * Idempotent: re-running just resets the password and re-syncs roles.
 *
 * Usage: npx tsx scripts/set-noor-teachers.ts
 */
import { createClient, type User } from "@supabase/supabase-js";
import * as crypto from "node:crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const OFFERING_SLUG = "noor-journey-one";

/**
 * Generates a 14-char password the teacher can read off a phone screen
 * and type on a keyboard without confusion: 8 lowercase + 4 digits + 2
 * uppercase, plus a static "@" separator. Excludes ambiguous chars
 * (l/1/I, 0/O) so SMS / WhatsApp transcription is reliable.
 */
function makePassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz"; // no l
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
  const digits = "23456789"; // no 0, 1
  const pick = (set: string, n: number) =>
    Array.from(crypto.randomBytes(n))
      .map((b) => set[b % set.length])
      .join("");
  // shape: Aa-aaaaa@99-Bb  → memorable, copy-pasteable, 14 chars
  return `${pick(upper, 1)}${pick(lower, 5)}@${pick(digits, 4)}${pick(upper, 1)}${pick(lower, 2)}`;
}

interface TeacherSpec {
  /** Display name. Also used as a profile match if the email lookup misses. */
  fullName: string;
  /** Slug of the subject under noor-journey-one to assign this teacher to. */
  subjectSlug: "quran" | "hadith" | "fiqh" | "arabic";
  /** Possible old emails to look up the existing user (in priority order). */
  oldEmails: string[];
  /** New email to set. */
  newEmail: string;
  /** Primary role. */
  primaryRole: "admin" | "instructor";
  /** All roles (must include the primary). */
  roles: ("admin" | "instructor")[];
}

const teachers: TeacherSpec[] = [
  {
    fullName: "Muallimah Neelam Ijaz",
    subjectSlug: "quran",
    oldEmails: ["neelam.ijaz@nisaalhuda.com"],
    newEmail: "nijaz.ni@gmail.com",
    primaryRole: "instructor",
    roles: ["instructor"],
  },
  {
    fullName: "Muallimah Sana Ahmed",
    subjectSlug: "hadith",
    oldEmails: ["sana.ahmed@nisaalhuda.com"],
    newEmail: "sannu17@gmail.com",
    primaryRole: "admin",
    roles: ["admin", "instructor"],
  },
  {
    fullName: "Muallimah Kareemunnisa Shaik",
    subjectSlug: "fiqh",
    oldEmails: ["kareemunnisa@nisaalhuda.com"],
    newEmail: "kareemunnisa.shammu@gmail.com",
    primaryRole: "instructor",
    roles: ["instructor"],
  },
  {
    fullName: "Muallimah Sana Areeba",
    subjectSlug: "arabic",
    oldEmails: ["sana.areeba@nisaalhuda.com"],
    newEmail: "sanaarcot@gmail.com",
    primaryRole: "instructor",
    roles: ["instructor"],
  },
];

async function findUser(t: TeacherSpec): Promise<User | null> {
  // 1. Try the new Gmail (in case the script ran already).
  // 2. Fall back to any of the old @nisaalhuda.com emails.
  // 3. Last resort: name match against profiles → join to auth.users.
  const candidates = [t.newEmail, ...t.oldEmails];

  // Bulk fetch user list once (small org — < 1000 users), then probe locally.
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = list?.users ?? [];

  for (const email of candidates) {
    const u = users.find(
      (x) => (x.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (u) return u;
  }

  // Profile-name fallback. Useful if the user was renamed but no email
  // ever lined up cleanly.
  const { data: profileMatch } = await sb
    .from("profiles")
    .select("id")
    .eq("full_name", t.fullName)
    .maybeSingle();
  if (profileMatch?.id) {
    const u = users.find((x) => x.id === profileMatch.id);
    if (u) return u;
  }

  return null;
}

async function upsertTeacher(t: TeacherSpec): Promise<string | null> {
  console.log(`\n— ${t.fullName} (${t.subjectSlug})`);

  // Each teacher gets her own freshly-generated password. We log it
  // (and only it) at the end of the run so the operator can hand it
  // out individually rather than via a shared default.
  const password = makePassword();

  let user = await findUser(t);

  if (user) {
    const { error: updateErr } = await sb.auth.admin.updateUserById(user.id, {
      email: t.newEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: t.fullName },
    });
    if (updateErr) {
      console.error(`   !! auth update failed:`, updateErr.message);
      return null;
    }
    console.log(`   ↻ updated existing user (${user.id})`);
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: t.newEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: t.fullName },
    });
    if (createErr || !created.user) {
      console.error(`   !! create failed:`, createErr?.message);
      return null;
    }
    user = created.user;
    console.log(`   ✓ created new user (${user.id})`);
  }

  // Sync profile fields. The auth signup trigger inserts a baseline
  // profile row; here we just reconcile the bits we care about.
  const { error: profileErr } = await sb
    .from("profiles")
    .update({
      full_name: t.fullName,
      role: t.primaryRole,
      roles: t.roles,
    })
    .eq("id", user.id);
  if (profileErr) {
    console.error(`   !! profile update failed:`, profileErr.message);
    return null;
  }
  console.log(`   ✓ profile role=${t.primaryRole} roles=[${t.roles.join(", ")}]`);

  // Assign the subject. We scope by offering slug to avoid picking up the
  // same-named slug on a different program.
  const { data: offering } = await sb
    .from("offerings")
    .select("id")
    .eq("slug", OFFERING_SLUG)
    .single();
  if (!offering) {
    console.error(`   !! offering "${OFFERING_SLUG}" not found`);
    return null;
  }

  const { data: subject } = await sb
    .from("subjects")
    .select("id, title")
    .eq("offering_id", offering.id)
    .eq("slug", t.subjectSlug)
    .single();
  if (!subject) {
    console.error(`   !! subject "${t.subjectSlug}" not found under ${OFFERING_SLUG}`);
    return null;
  }

  const { error: subjectErr } = await sb
    .from("subjects")
    .update({ instructor_id: user.id })
    .eq("id", subject.id);
  if (subjectErr) {
    console.error(`   !! subject assignment failed:`, subjectErr.message);
    return null;
  }
  console.log(`   ✓ assigned to "${subject.title}"`);

  return password;
}

async function main() {
  console.log("=== Resetting Noor Journey One teacher accounts ===");
  const issued: { teacher: TeacherSpec; password: string }[] = [];
  for (const t of teachers) {
    const password = await upsertTeacher(t);
    if (password) issued.push({ teacher: t, password });
  }
  console.log(`\n=== Credentials (share each individually) ===`);
  console.log(`Login URL: https://nisaalhuda.org/login\n`);
  for (const { teacher: t, password } of issued) {
    console.log(`  ${t.fullName}`);
    console.log(`    email:    ${t.newEmail}`);
    console.log(`    password: ${password}`);
    console.log(`    role:     ${t.primaryRole}${t.roles.length > 1 ? ` (+ ${t.roles.filter((r) => r !== t.primaryRole).join(", ")})` : ""}`);
    console.log(`    subject:  Noor Journey One — ${t.subjectSlug}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
