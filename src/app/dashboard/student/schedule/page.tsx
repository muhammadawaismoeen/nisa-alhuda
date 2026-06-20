/**
 * Student Schedule Page — unified weekly view of all enrolled class schedules.
 *
 * Combines two data sources:
 *   1. Recurring weekly classes — from subjects.recurring_* fields (set by admin).
 *      These appear on the same weekday every week, indefinitely.
 *   2. Ad-hoc class sessions — from lessons.scheduled_at (specific date/time).
 *      Only shown in the week they actually fall in.
 *
 * All times are stored as UTC and displayed as PKT (UTC+5, no DST).
 */
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  WeeklyCalendar,
  type RecurringEvent,
  type AdhocEvent,
} from "@/components/schedule/weekly-calendar";

export default async function StudentSchedulePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── 1. Approved enrollments → offering IDs + titles ──────────────────────
  const { data: enrollmentsRaw } = await supabase
    .from("enrollments")
    .select("offering_id, offerings(id, title)")
    .eq("student_id", user.id)
    .eq("status", "approved");

  const offeringIds: string[] = [];
  const offeringTitleMap: Record<string, string> = {};

  for (const row of enrollmentsRaw ?? []) {
    const off = row.offerings as unknown as { id: string; title: string } | null;
    if (!off) continue;
    offeringIds.push(off.id);
    offeringTitleMap[off.id] = off.title;
  }

  // Assign a stable colour index per offering
  const colorMap: Record<string, number> = {};
  offeringIds.forEach((id, i) => { colorMap[id] = i; });

  const recurringEvents: RecurringEvent[] = [];
  const adhocEvents: AdhocEvent[] = [];

  if (offeringIds.length > 0) {
    // ── 2. Subjects with a complete recurring schedule ──────────────────────
    const { data: subjectsRaw } = await supabase
      .from("subjects")
      .select(
        "id, title, offering_id, recurring_day_of_week, recurring_start_time, recurring_duration_minutes, recurring_meeting_url, recurring_schedule_label"
      )
      .in("offering_id", offeringIds)
      .not("recurring_meeting_url", "is", null)
      .not("recurring_day_of_week", "is", null)
      .not("recurring_start_time", "is", null);

    for (const s of subjectsRaw ?? []) {
      if (
        s.recurring_day_of_week === null ||
        !s.recurring_start_time ||
        !s.recurring_meeting_url
      ) continue;

      const [startHour, startMinute] = (s.recurring_start_time as string)
        .split(":")
        .map(Number);

      recurringEvents.push({
        id: s.id,
        offeringId: s.offering_id,
        offeringTitle: offeringTitleMap[s.offering_id] ?? "",
        subjectTitle: s.title,
        dayOfWeek: s.recurring_day_of_week as number,
        startHour,
        startMinute,
        durationMinutes: (s.recurring_duration_minutes as number | null) ?? 60,
        meetingUrl: s.recurring_meeting_url as string,
        colorIndex: colorMap[s.offering_id] ?? 0,
      });
    }

    // ── 3. Ad-hoc lessons (window: 4 weeks ago → 8 weeks ahead) ────────────
    const windowStart = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString();

    const { data: lessonsRaw } = await supabase
      .from("lessons")
      .select(
        "id, title, offering_id, subject_id, scheduled_at, live_class_link, recording_url, subjects(title)"
      )
      .in("offering_id", offeringIds)
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd)
      .eq("is_published", true)
      .order("scheduled_at", { ascending: true });

    for (const lesson of lessonsRaw ?? []) {
      if (!lesson.scheduled_at) continue;

      const subjectTitle =
        (lesson.subjects as unknown as { title: string } | null)?.title ??
        (lesson.title as string);

      adhocEvents.push({
        id: lesson.id,
        offeringId: lesson.offering_id,
        offeringTitle: offeringTitleMap[lesson.offering_id] ?? "",
        subjectTitle,
        scheduledAtUtc: lesson.scheduled_at as string,
        durationMinutes: 60,
        liveClassLink: (lesson.live_class_link as string | null) ?? null,
        recordingUrl: (lesson.recording_url as string | null) ?? null,
        colorIndex: colorMap[lesson.offering_id] ?? 0,
      });
    }
  }

  // ── 4. Render (always — WeeklyCalendar handles its own empty state) ───────
  const DOTS = [
    "bg-violet-500", "bg-sky-500", "bg-rose-500", "bg-amber-500",
    "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-teal-500",
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
          <CalendarDays className="h-6 w-6 text-primary" />
          My Schedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly view of all your enrolled classes · All times in{" "}
          <span className="font-medium text-foreground">PKT</span> (Pakistan Standard Time)
        </p>
      </div>

      {/* Offering legend — one colour dot per course */}
      {offeringIds.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {offeringIds.map((id) => (
            <div key={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${DOTS[colorMap[id] % DOTS.length]}`} />
              {offeringTitleMap[id]}
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <WeeklyCalendar
        recurringEvents={recurringEvents}
        adhocEvents={adhocEvents}
      />

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground text-center">
        Recurring classes repeat every week · Specific lesson sessions appear only in their scheduled week
      </p>
    </div>
  );
}
