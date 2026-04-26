/**
 * Inspect the rows my bulk-enroll script created so we know what's
 * actually broken vs what the UI is just rendering badly.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SUSPECT_EMAILS = [
  "saima_hudanisa@gmail.com",
  "zyramariam14@gmail.com",
  "amnaimran1982@gmail.com",
  "minsafaisal18@gmail.com",
  "saraimranhehe@gmail.com",
];

async function main() {
  const { data: rows } = await sb
    .from("enrollments")
    .select(
      "id, student_id, applicant_email, payment_amount, payment_method, payment_receipt_url, payment_currency, created_at, status, student_details, offering:offerings(slug, title), student:profiles!enrollments_student_id_fkey(full_name)"
    )
    .in("applicant_email", SUSPECT_EMAILS);

  for (const r of rows || []) {
    console.log(`\n— ${r.applicant_email}`);
    console.log(`  id:                 ${r.id}`);
    console.log(`  status:             ${r.status}`);
    console.log(`  payment_amount:     ${r.payment_amount}`);
    console.log(`  payment_method:     ${r.payment_method}`);
    console.log(`  payment_currency:   ${r.payment_currency}`);
    console.log(`  payment_receipt_url:${r.payment_receipt_url ?? "NULL"}`);
    console.log(`  created_at:         ${r.created_at}`);
    console.log(`  offering:           ${(r.offering as { title?: string } | null)?.title ?? "?"}`);
    console.log(`  profile.full_name:  ${(r.student as { full_name?: string } | null)?.full_name ?? "?"}`);
    console.log(`  student_details:    ${JSON.stringify(r.student_details)}`);
  }
}

main().catch(console.error);
