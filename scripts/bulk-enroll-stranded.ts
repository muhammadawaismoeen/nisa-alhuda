/**
 * Bulk-enroll the stranded students into Noor Journey One.
 *
 * The diagnostic script (diagnose-orphan-students.ts) found 11 logged-in
 * users with no enrollment row. After Awais's go-ahead, this script
 * inserts an `approved` enrollment row for each into the Noor Journey
 * One offering so they immediately see the program on /dashboard
 * instead of "No enrollments yet".
 *
 * Idempotent: skips users who already have an enrollment for this
 * offering.
 *
 * Usage: npx tsx scripts/bulk-enroll-stranded.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const OFFERING_SLUG = "noor-journey-one";

// Emails to enroll. Includes the 6 truly stranded students plus the 3
// duplicate emails — duplicates are harmless (they already have access
// via their other email anyway, and getting both endpoints to show the
// course is friendlier than telling the student "wrong email").
//
// Test accounts (testing.student@nisaalhuda.org, student@nisaalhuda.com)
// are deliberately excluded.
const EMAILS_TO_ENROLL = [
  // Truly stranded — registered but no enrollment row exists
  "spogmaybangash708@gmail.com",
  "zaininmom@gmail.com",
  "mehru.r@gmail.com",
  "saima_hudanisa@gmail.com",
  "mahdiakashef@gmail.com",
  "zyramariam14@gmail.com",
  // Duplicate-email users — already have an enrollment under a sibling
  // email, but enrolling here lets them see the course no matter which
  // login they use.
  "amnaimran1982@gmail.com",
  "minsafaisal18@gmail.com",
  "saraimranhehe@gmail.com",
];

async function main() {
  // 1. Look up the offering and its price.
  const { data: offering } = await sb
    .from("offerings")
    .select("id, title, price, fee_type")
    .eq("slug", OFFERING_SLUG)
    .single();
  if (!offering) {
    throw new Error(`Offering "${OFFERING_SLUG}" not found.`);
  }
  console.log(`📚 Target offering: ${offering.title} (price=${offering.price})`);

  // 2. Pull the auth user list once and map email → user.
  const { data: list } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const userByEmail = new Map<string, { id: string; email: string }>();
  for (const u of list?.users ?? []) {
    if (u.email) {
      userByEmail.set(u.email.toLowerCase(), { id: u.id, email: u.email });
    }
  }

  let createdCount = 0;
  let skippedCount = 0;
  let missingCount = 0;

  for (const rawEmail of EMAILS_TO_ENROLL) {
    const email = rawEmail.toLowerCase();
    const user = userByEmail.get(email);
    if (!user) {
      console.log(`   !! ${rawEmail}: no auth user found, skipping`);
      missingCount++;
      continue;
    }

    // Skip if an enrollment already exists for this user + offering.
    // Compound check: by student_id (modern) OR by applicant_email
    // (legacy guest enrollments). Either match means "already enrolled".
    const { data: existing } = await sb
      .from("enrollments")
      .select("id, status, student_id, applicant_email")
      .eq("offering_id", offering.id)
      .or(`student_id.eq.${user.id},applicant_email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      const wasGuest = existing.student_id !== user.id;
      const wasNotApproved = existing.status !== "approved";
      const updates: Record<string, unknown> = {};

      // Critical fix: guest enrollments have student_id = NULL even when
      // approved. The student dashboard filters by student_id, so these
      // users see "No enrollments yet" until we wire the rows to their
      // auth user id.
      if (wasGuest) updates.student_id = user.id;
      if (wasNotApproved) {
        updates.status = "approved";
        updates.reviewed_at = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await sb
          .from("enrollments")
          .update(updates)
          .eq("id", existing.id);
        if (error) {
          console.error(`   !! ${rawEmail}: update failed —`, error.message);
          continue;
        }
        const what = [
          wasGuest ? "linked student_id" : null,
          wasNotApproved ? "promoted to approved" : null,
        ]
          .filter(Boolean)
          .join(" + ");
        console.log(`   ↻ ${rawEmail}: ${what}`);
      } else {
        console.log(
          `   = ${rawEmail}: enrollment already correct (status=${existing.status})`
        );
      }
      skippedCount++;
      continue;
    }

    // Create a fresh approved enrollment. payment_receipt_url is left
    // null (allowed since migration 011) — these students paid out of
    // band and the admin approved them manually.
    const { error: insertErr } = await sb.from("enrollments").insert({
      student_id: user.id,
      offering_id: offering.id,
      applicant_email: user.email,
      status: "approved",
      payment_amount: offering.price,
      payment_method: "manual_approval",
      payment_currency: "PKR",
      reviewed_at: new Date().toISOString(),
    });
    if (insertErr) {
      console.error(`   !! ${rawEmail}: insert failed —`, insertErr.message);
      continue;
    }
    console.log(`   ✓ ${rawEmail}: enrolled as approved`);
    createdCount++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Created:      ${createdCount}`);
  console.log(`Already had:  ${skippedCount}`);
  console.log(`Missing user: ${missingCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
