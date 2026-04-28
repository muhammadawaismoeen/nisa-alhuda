/**
 * Weekly cron — roll the published window forward.
 *
 * Runs every Sunday 18:59 UTC (= Sunday 23:59 PKT, just before
 * Monday). For the active cohort (Noor Journey One):
 *   - PUBLISH every lesson whose scheduled_at falls inside the new
 *     calendar week (Mon-Sun PKT)
 *   - HIDE every lesson whose scheduled_at is past that Sunday
 *
 * Lessons in past weeks (with recordings) are left published — they
 * remain accessible for catch-up. Lessons with no scheduled_at
 * (resource-only blocks like "Course Materials & Planner") are also
 * left untouched.
 *
 * Auth: Vercel sends the configured CRON_SECRET in the Authorization
 * header. Any other caller gets 401.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const OFFERING_SLUG = "noor-journey-one";

/** Returns the UTC Date for Monday 00:00 PKT of the calendar week containing `now`. */
function startOfPktWeek(now: Date): Date {
  const pkt = new Date(now.getTime() + PKT_OFFSET_MS);
  const dayOfWeek = pkt.getUTCDay(); // 0=Sun..6=Sat
  // Days back to Monday — Sunday counts as 6 days back from Monday.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayPktUtcMs = Date.UTC(
    pkt.getUTCFullYear(),
    pkt.getUTCMonth(),
    pkt.getUTCDate() - daysSinceMonday,
    0,
    0,
    0
  );
  return new Date(mondayPktUtcMs - PKT_OFFSET_MS);
}

/** Returns the UTC Date for Sunday 23:59:59 PKT of the calendar week containing `now`. */
function endOfPktWeek(now: Date): Date {
  const pkt = new Date(now.getTime() + PKT_OFFSET_MS);
  const dayOfWeek = pkt.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sundayPktUtcMs = Date.UTC(
    pkt.getUTCFullYear(),
    pkt.getUTCMonth(),
    pkt.getUTCDate() + daysUntilSunday,
    23,
    59,
    59
  );
  return new Date(sundayPktUtcMs - PKT_OFFSET_MS);
}

export async function GET(req: Request) {
  // Reject non-Vercel callers. Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on this deployment" },
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

  // Resolve the active cohort.
  const { data: offering, error: offErr } = await sb
    .from("offerings")
    .select("id,title")
    .eq("slug", OFFERING_SLUG)
    .single();
  if (offErr || !offering) {
    return NextResponse.json(
      { error: `Offering ${OFFERING_SLUG} not found: ${offErr?.message ?? ""}` },
      { status: 500 }
    );
  }

  const now = new Date();
  const weekStart = startOfPktWeek(now);
  const weekEnd = endOfPktWeek(now);

  // 1. Publish anything in the new window that's currently hidden.
  const { count: published, error: pubErr } = await sb
    .from("lessons")
    .update({ is_published: true }, { count: "exact" })
    .eq("offering_id", offering.id)
    .gte("scheduled_at", weekStart.toISOString())
    .lte("scheduled_at", weekEnd.toISOString())
    .eq("is_published", false);
  if (pubErr) {
    return NextResponse.json({ error: pubErr.message }, { status: 500 });
  }

  // 2. Hide anything past the new window that's currently visible.
  const { count: hidden, error: hideErr } = await sb
    .from("lessons")
    .update({ is_published: false }, { count: "exact" })
    .eq("offering_id", offering.id)
    .gt("scheduled_at", weekEnd.toISOString())
    .eq("is_published", true);
  if (hideErr) {
    return NextResponse.json({ error: hideErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    offering: offering.title,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    published,
    hidden,
    ranAt: now.toISOString(),
  });
}
