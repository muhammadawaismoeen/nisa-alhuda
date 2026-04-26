/**
 * Clean up the 5 enrollment rows my bulk-enroll script created badly.
 *
 * Three are obvious duplicates of existing wizard-enrolled rows under a
 * sibling email (Gmail dot variants, parent-vs-child email, etc.) —
 * those get DELETED. The student already has access via her real
 * account; the duplicate row is just polluting the admin view with
 * "undefined undefined" / wrong amount.
 *
 * The remaining two have no sibling row anywhere, so we keep them but
 * zero out payment_amount and tag them so admin knows to verify.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Rows to remove entirely. These users have a properly wizard-enrolled
// row under a different email; the script row is a duplicate.
const DUPLICATE_EMAILS_TO_DELETE = [
  "amnaimran1982@gmail.com",   // Gmail dot duplicate of amna.imran1982
  "minsafaisal18@gmail.com",   // duplicate of adeelafaisal3 (parent email)
  "saraimranhehe@gmail.com",   // possible duplicate of imzimaqs (Sarah Imran)
];

// Rows we keep but mark as needing admin review.
const NEEDS_VERIFICATION_EMAILS = [
  "saima_hudanisa@gmail.com",
  "zyramariam14@gmail.com",
];

async function main() {
  console.log("=== Cleaning up duplicate / unverified enrollment rows ===\n");

  // 1. Delete the duplicates.
  for (const email of DUPLICATE_EMAILS_TO_DELETE) {
    const { data: existing } = await sb
      .from("enrollments")
      .select("id, payment_amount, payment_method")
      .eq("applicant_email", email)
      .eq("payment_method", "manual_approval")
      .maybeSingle();
    if (!existing) {
      console.log(`   = ${email}: no manual_approval row found, skipping`);
      continue;
    }
    const { error } = await sb
      .from("enrollments")
      .delete()
      .eq("id", existing.id);
    if (error) {
      console.error(`   !! ${email}: delete failed —`, error.message);
      continue;
    }
    console.log(`   ✗ ${email}: deleted (was PKR ${existing.payment_amount})`);
  }

  // 2. Mark the unverified ones with payment_amount = 0 so admin sees a
  //    clear flag in the table instead of a confidently-wrong "PKR 3,000".
  for (const email of NEEDS_VERIFICATION_EMAILS) {
    const { data: existing } = await sb
      .from("enrollments")
      .select("id, payment_amount")
      .eq("applicant_email", email)
      .eq("payment_method", "manual_approval")
      .maybeSingle();
    if (!existing) {
      console.log(`   = ${email}: no manual_approval row found, skipping`);
      continue;
    }
    const { error } = await sb
      .from("enrollments")
      .update({ payment_amount: 0 })
      .eq("id", existing.id);
    if (error) {
      console.error(`   !! ${email}: update failed —`, error.message);
      continue;
    }
    console.log(
      `   ↻ ${email}: amount cleared to 0 (was PKR ${existing.payment_amount}) — admin should verify`
    );
  }
}

main().catch(console.error);
