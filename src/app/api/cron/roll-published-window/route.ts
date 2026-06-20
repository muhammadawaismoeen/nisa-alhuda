/**
 * Weekly cron — for Noor Journey One:
 *
 *   1. CREATE this week's Class N row for every subject that has a
 *      recurring schedule (Hadith Mon, Arabic Tue, Quran Wed, Fiqh Thu).
 *      N is derived from the count of existing scheduled lessons in the
 *      subject + 1. The row is created at the subject's recurring time
 *      (5:50 PM PKT) on the matching weekday of the current Mon-Sun PKT
 *      week, with is_published=true. Idempotent — skips if a lesson
 *      already exists at that scheduled_at.
 *
 *   2. PUBLISH any existing lesson row scheduled inside the current
 *      Mon-Sun PKT window that's somehow hidden (defensive).
 *
 *   3. HIDE any lesson row scheduled past this Sunday — keeps the
 *      published window to "this week only" so the student dashboard
 *      stays clean.
 *
 * Auth: Vercel sends Authorization: Bearer <CRON_SECRET>. Rejects all
 * other callers with 401.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const OFFERING_SLUG = "noor-journey-one";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** UTC Date for Monday 00:00 PKT of the calendar week containing `now`. */
function startOfPktWeek(now: Date): Date {
  const pkt = new Date(now.getTime() + PKT_OFFSET_MS);
  const dayOfWeek = pkt.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayPktUtcMs = Date.UTC(
    pkt.getUTCFullYear(),
    pkt.getUTCMonth(),
    pkt.getUTCDate() - daysSinceMonday,
    0, 0, 0
  );
  return new Date(mondayPktUtcMs - PKT_OFFSET_MS);
}

/** UTC Date for Sunday 23:59:59 PKT of the calendar week containing `now`. */
function endOfPktWeek(now: Date): Date {
  const pkt = new Date(now.getTime() + PKT_OFFSET_MS);
  const dayOfWeek = pkt.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sundayPktUtcMs = Date.UTC(
    pkt.getUTCFullYear(),
    pkt.getUTCMonth(),
    pkt.getUTCDate() + daysUntilSunday,
    23, 59, 59
  );
  return new Date(sundayPktUtcMs - PKT_OFFSET_MS);
}

/** Compute the UTC instant for `time` (HH:MM:SS PKT) on the `targetDay`-th
 *  weekday (0=Sun..6=Sat) of the calendar week starting at PKT Monday. */
function classOccurrenceUtc(weekStartUtc: Date, targetDay: number, hhmmss: string): Date {
  // weekStartUtc is Mon 00:00 PKT expressed as UTC. Adding (targetDay-1)*24h
  // for Tue/Wed/Thu/etc. since Monday=1 in our day_of_week convention here.
  // Convert targetDay (0=Sun..6=Sat) to "days from Monday".
  const daysFromMonday = targetDay === 0 ? 6 : targetDay - 1;
  const [h, m, s] = hhmmss.split(":").map(Number);
  const ms =
    weekStartUtc.getTime() +
    daysFromMonday * 24 * 3600 * 1000 +
    h * 3600 * 1000 + m * 60 * 1000 + (s ?? 0) * 1000;
  return new Date(ms);
}

function formatPktDateForTitle(scheduledUtc: Date): string {
  const pkt = new Date(scheduledUtc.getTime() + PKT_OFFSET_MS);
  return `${pkt.getUTCDate()} ${MONTHS[pkt.getUTCMonth()]} ${pkt.getUTCFullYear()}`;
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
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

  const { data: offering, error: offErr } = await sb
    .from("offerings")
    .select("id,title")
    .eq("slug", OFFERING_SLUG)
    .single();
  if (offErr || !offering) {
    try { await sb.from("cron_logs").insert({
      job_name: "roll-published-window",
      ran_at: now.toISOString(),
      success: false,
      records_processed: 0,
      error_message: `Offering ${OFFERING_SLUG} not found: ${offErr?.message ?? ""}`,
    }); } catch { /* ignore logging failures */ }
    return NextResponse.json(
      { error: `Offering ${OFFERING_SLUG} not found: ${offErr?.message ?? ""}` },
      { status: 500 }
    );
  }

  // Pull every subject in this offering that has a recurring schedule.
  const { data: subjects } = await sb
    .from("subjects")
    .select("id,slug,title,recurring_day_of_week,recurring_start_time")
    .eq("offering_id", offering.id)
    .not("recurring_day_of_week", "is", null)
    .not("recurring_start_time", "is", null);

  const weekStart = startOfPktWeek(now);
  const weekEnd = endOfPktWeek(now);

  const created: string[] = [];
  const skipped: string[] = [];

  // ───── 1. CREATE this week's Class N row for each subject ─────
  for (const s of subjects ?? []) {
    const scheduledUtc = classOccurrenceUtc(
      weekStart,
      s.recurring_day_of_week!,
      s.recurring_start_time!
    );
    // Skip if outside this week (shouldn't happen, defensive).
    if (scheduledUtc < weekStart || scheduledUtc > weekEnd) {
      skipped.push(`${s.slug} (computed time outside week)`);
      continue;
    }

    // Idempotent: if a lesson already exists with the same scheduled_at,
    // don't double-insert.
    const { data: dup } = await sb
      .from("lessons")
      .select("id")
      .eq("subject_id", s.id)
      .eq("scheduled_at", scheduledUtc.toISOString())
      .maybeSingle();
    if (dup) {
      skipped.push(`${s.slug} (already exists)`);
      continue;
    }

    // Class N = count(existing lessons with scheduled_at IS NOT NULL) + 1.
    const { count: existingCount } = await sb
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", s.id)
      .not("scheduled_at", "is", null);
    const n = (existingCount ?? 0) + 1;

    const title = `${s.title} - Class ${n} (${formatPktDateForTitle(scheduledUtc)})`;
    const { error: insErr } = await sb.from("lessons").insert({
      subject_id: s.id,
      offering_id: offering.id,
      title,
      scheduled_at: scheduledUtc.toISOString(),
      is_published: true,
      sort_order: n,
    });
    if (insErr) {
      skipped.push(`${s.slug} (insert error: ${insErr.message})`);
      continue;
    }
    created.push(`${s.slug} → ${title}`);
  }

  // ───── 2. PUBLISH everything in this week (defensive) ─────
  const { count: published, error: pubErr } = await sb
    .from("lessons")
    .update({ is_published: true }, { count: "exact" })
    .eq("offering_id", offering.id)
    .gte("scheduled_at", weekStart.toISOString())
    .lte("scheduled_at", weekEnd.toISOString())
    .eq("is_published", false);
  if (pubErr) {
    try { await sb.from("cron_logs").insert({
      job_name: "roll-published-window",
      ran_at: now.toISOString(),
      success: false,
      records_processed: created.length,
      error_message: `publish step: ${pubErr.message}`,
    }); } catch { /* ignore logging failures */ }
    return NextResponse.json({ error: pubErr.message }, { status: 500 });
  }

  // ───── 3. HIDE everything past this week ─────
  const { count: hidden, error: hideErr } = await sb
    .from("lessons")
    .update({ is_published: false }, { count: "exact" })
    .eq("offering_id", offering.id)
    .gt("scheduled_at", weekEnd.toISOString())
    .eq("is_published", true);
  if (hideErr) {
    try { await sb.from("cron_logs").insert({
      job_name: "roll-published-window",
      ran_at: now.toISOString(),
      success: false,
      records_processed: created.length,
      error_message: `hide step: ${hideErr.message}`,
    }); } catch { /* ignore logging failures */ }
    return NextResponse.json({ error: hideErr.message }, { status: 500 });
  }

  try {
    await sb.from("cron_logs").insert({
      job_name: "roll-published-window",
      ran_at: now.toISOString(),
      success: true,
      records_processed: created.length,
      error_message: null,
    });
  } catch { /* ignore logging failures */ }

  return NextResponse.json({
    ok: true,
    offering: offering.title,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    created,
    skipped,
    published,
    hidden,
    ranAt: now.toISOString(),
  });
}
