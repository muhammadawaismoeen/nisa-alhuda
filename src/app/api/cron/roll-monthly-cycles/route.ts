/**
 * Daily cron — Phase 1 of the recurring-payment plan.
 *
 * For every active monthly enrollment, ensure a placeholder
 * `monthly_payments` row exists for the *current* cycle so the admin
 * payment ledger and the student dashboard can show "this month is
 * owed but no receipt yet" before the sister submits anything.
 *
 * What it does, per run:
 *   1. Compute the current cycle key (firstOfMonth() → 27th-anchored).
 *   2. Skip silently if that cycle is earlier than FIRST_BILLABLE_CYCLE
 *      (pre-launch — nothing to do).
 *   3. For each enrollment where status='approved' AND
 *      offering.fee_type='monthly' AND it isn't a full FA waiver
 *      (fa_approved_amount = 0), insert a `monthly_payments` row with
 *      status='owed' for the current cycle.
 *   4. Idempotent: skips slots that already have a row (unique on
 *      enrollment_id + cycle_month). The student's first upload flips
 *      the row from 'owed' → 'pending'.
 *
 * What it does NOT do (deferred to later phases):
 *   - Send reminder emails / WhatsApp nudges
 *   - Mark rows as 'overdue'
 *   - Backfill past unpaid cycles
 *   - Lock LMS access for unpaid sisters
 *
 * Auth: Vercel sends Authorization: Bearer <CRON_SECRET>. Anything else
 * gets 401. Same shape as /api/cron/roll-published-window.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  firstOfMonth,
  FIRST_BILLABLE_CYCLE,
  cyclesBetween,
  monthlyAmountForEnrollment,
} from "@/lib/monthly-payments";
import type { Enrollment, Offering } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Row shape we select below — keeps the type-narrowing explicit so
// monthlyAmountForEnrollment() type-checks against the shared helper.
type EnrollmentForCron = Pick<
  Enrollment,
  | "id"
  | "student_id"
  | "offering_id"
  | "status"
  | "payment_method"
  | "payment_currency"
  | "fa_approved_amount"
  | "created_at"
> & {
  offerings: Pick<
    Offering,
    "id" | "price" | "price_inr" | "price_usd" | "fee_type"
  > | null;
};

/**
 * payment_method values that mean "this enrollment doesn't represent
 * actual revenue we're collecting monthly" — admin rescue rows, promo
 * comps, full waivers. We don't bill them.
 *
 * Keep separate from FA-partial (`fa_approved_amount > 0`), which IS a
 * paying customer at a reduced rate and SHOULD be billed monthly.
 */
const NON_BILLABLE_PAYMENT_METHODS = new Set([
  "manual_approval", // admin-created rescue / stranded student access
  "waiver",          // FA full waiver (also caught by fa_approved_amount === 0)
  "free",            // promo / no-cost enrollment
]);

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now = new Date();
  const currentCycle = firstOfMonth(now);

  // Pre-launch guard — until the platform's first billable cycle starts,
  // do nothing. Lets the cron deploy + run safely from day 1.
  if (currentCycle < FIRST_BILLABLE_CYCLE) {
    try { await sb.from("cron_logs").insert({
      job_name: "roll-monthly-cycles",
      ran_at: now.toISOString(),
      success: true,
      records_processed: 0,
      error_message: "pre-launch skip",
    }); } catch { /* ignore logging failures */ }
    return NextResponse.json({
      ok: true,
      skipped: "pre-launch",
      currentCycle,
      firstBillableCycle: FIRST_BILLABLE_CYCLE,
      ranAt: now.toISOString(),
    });
  }

  // Pull every approved enrollment on a monthly-fee offering. Inner-joining
  // on offerings + filtering fee_type narrows the set so we don't fetch
  // one-time enrollments at all.
  const { data: enrollments, error: enrErr } = await sb
    .from("enrollments")
    .select(
      "id, student_id, offering_id, status, payment_method, payment_currency, fa_approved_amount, created_at, offerings!inner(id, price, price_inr, price_usd, fee_type)"
    )
    .eq("status", "approved")
    .eq("offerings.fee_type", "monthly");

  if (enrErr) {
    try { await sb.from("cron_logs").insert({
      job_name: "roll-monthly-cycles",
      ran_at: now.toISOString(),
      success: false,
      records_processed: 0,
      error_message: enrErr.message,
    }); } catch { /* ignore logging failures */ }
    return NextResponse.json({ error: enrErr.message }, { status: 500 });
  }

  const rows = (enrollments || []) as unknown as EnrollmentForCron[];

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const e of rows) {
    if (!e.offerings) {
      skipped.push(`${e.id} (no offering join)`);
      continue;
    }

    // Skip enrollments that don't represent paying customers. This
    // covers admin rescue rows, full waivers, and promo comps —
    // creating monthly bills for them would be wrong.
    if (
      e.payment_method &&
      NON_BILLABLE_PAYMENT_METHODS.has(e.payment_method)
    ) {
      skipped.push(`${e.id} (non-billable: ${e.payment_method})`);
      continue;
    }

    // Full FA waiver — fa_approved_amount === 0 means the sister owes
    // nothing in perpetuity for this enrollment. Don't create rows.
    if (e.fa_approved_amount === 0) {
      skipped.push(`${e.id} (FA full waiver)`);
      continue;
    }

    // Does the current cycle actually fall within this student's billing
    // window? cyclesBetween() respects "enrolled mid-month → owe from next
    // 27th" so brand-new sisters don't get billed for the partial cycle.
    const owedCycles = cyclesBetween(e.created_at);
    if (!owedCycles.includes(currentCycle)) {
      skipped.push(`${e.id} (current cycle not owed yet)`);
      continue;
    }

    // Idempotent guard — unique(enrollment_id, cycle_month) protects us
    // at the DB level too, but checking up front gives clean accounting.
    const { data: dup } = await sb
      .from("monthly_payments")
      .select("id, status")
      .eq("enrollment_id", e.id)
      .eq("cycle_month", currentCycle)
      .maybeSingle();

    if (dup) {
      skipped.push(`${e.id} (row already exists, status=${dup.status})`);
      continue;
    }

    const { amount, currency } = monthlyAmountForEnrollment(
      e.offerings,
      e
    );

    const { error: insErr } = await sb.from("monthly_payments").insert({
      enrollment_id: e.id,
      student_id: e.student_id,
      offering_id: e.offering_id,
      cycle_month: currentCycle,
      amount,
      currency,
      payment_method: "bank_transfer",
      receipt_url: null,
      status: "owed",
    });

    if (insErr) {
      failed.push(`${e.id} (${insErr.message})`);
      continue;
    }
    created.push(`${e.id} (${currency} ${amount})`);
  }

  try {
    await sb.from("cron_logs").insert({
      job_name: "roll-monthly-cycles",
      ran_at: now.toISOString(),
      success: failed.length === 0,
      records_processed: created.length,
      error_message: failed.length > 0 ? `${failed.length} insert(s) failed` : null,
    });
  } catch { /* ignore logging failures */ }

  return NextResponse.json({
    ok: true,
    currentCycle,
    scanned: rows.length,
    created: created.length,
    skipped: skipped.length,
    failed: failed.length,
    details: { created, skipped, failed },
    ranAt: now.toISOString(),
  });
}
