/**
 * Monthly cron — Phase 2 of the recurring-payment plan.
 *
 * Sends one email reminder per student per cycle for every `monthly_payments`
 * row that is still `status='owed'` and has not yet been reminded
 * (`reminded_at IS NULL`).
 *
 * What it does:
 *   1. Computes the current cycle key (firstOfMonth → 27th-anchored).
 *   2. Calls the SECURITY DEFINER SQL function `get_owed_reminder_targets`
 *      which joins monthly_payments + auth.users + profiles + offerings in
 *      one round-trip, returning student email, name, offering title,
 *      amount and currency.
 *   3. For each target, calls sendPaymentReminderEmail (fire-and-forget).
 *   4. Stamps `reminded_at = now()` on each row immediately after attempting
 *      the send — even if the email failed, we don't retry within the same
 *      cycle. The admin can see `reminded_at IS NULL` rows in the ledger
 *      to catch any skipped entries.
 *   5. Logs the run to `cron_logs`.
 *
 * Idempotency: `reminded_at IS NULL` means a row is reminded at most once
 * per cycle regardless of how many times this cron runs.
 *
 * Schedule: Run on the 28th of each month (day after the 27th cycle start)
 * at 04:00 UTC. Railway cron: `0 4 28 * *`
 * Header: Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { firstOfMonth, FIRST_BILLABLE_CYCLE } from "@/lib/monthly-payments";
import { sendPaymentReminderEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatCycleLabel(cycleDate: string): string {
  // cycleDate is "YYYY-MM-27" — render as "June 2026"
  const [year, month] = cycleDate.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

type ReminderTarget = {
  payment_id: string;
  enrollment_id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  offering_title: string;
  amount: number;
  currency: "PKR" | "INR" | "USD";
};

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

  async function log(success: boolean, records: number, errorMessage: string | null) {
    try {
      await sb.from("cron_logs").insert({
        job_name: "send-payment-reminders",
        ran_at: now.toISOString(),
        success,
        records_processed: records,
        error_message: errorMessage,
      });
    } catch { /* never block the response on a logging failure */ }
  }

  // Pre-launch guard.
  if (currentCycle < FIRST_BILLABLE_CYCLE) {
    await log(true, 0, "pre-launch skip");
    return NextResponse.json({ ok: true, cycle: currentCycle, skipped: "pre-launch" });
  }

  // One query — SECURITY DEFINER function joins auth.users for us.
  const { data: targets, error: fetchError } = await sb.rpc(
    "get_owed_reminder_targets",
    { p_cycle: currentCycle }
  );

  if (fetchError) {
    console.error("[send-payment-reminders] fetch error:", fetchError);
    await log(false, 0, fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const rows = (targets ?? []) as ReminderTarget[];
  if (rows.length === 0) {
    await log(true, 0, "no owed targets for cycle");
    return NextResponse.json({ ok: true, cycle: currentCycle, reminded: 0 });
  }

  const cycleLabel = formatCycleLabel(currentCycle);
  let reminded = 0;
  const failedPaymentIds: string[] = [];

  for (const row of rows) {
    // Stamp reminded_at BEFORE sending so even if email fails we don't
    // re-remind the student on the next cron run.
    const { error: stampError } = await sb
      .from("monthly_payments")
      .update({ reminded_at: now.toISOString() })
      .eq("id", row.payment_id);

    if (stampError) {
      console.error("[send-payment-reminders] stamp error:", row.payment_id, stampError);
      failedPaymentIds.push(row.payment_id);
      continue;
    }

    await sendPaymentReminderEmail(
      row.student_email,
      row.student_name || "Dear Student",
      row.offering_title,
      cycleLabel,
      row.amount,
      row.currency,
      row.enrollment_id
    );

    reminded++;
  }

  const success = failedPaymentIds.length === 0;
  const errMsg = success
    ? null
    : `Stamp failed for payment_ids: ${failedPaymentIds.join(", ")}`;

  await log(success, reminded, errMsg);

  return NextResponse.json({
    ok: success,
    cycle: currentCycle,
    reminded,
    total: rows.length,
    ...(errMsg ? { error: errMsg } : {}),
  });
}
