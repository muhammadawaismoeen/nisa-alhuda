"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST
const GRID_START_HOUR = 8;  // 8 AM PKT
const GRID_END_HOUR = 22;   // 10 PM PKT
const GRID_HOURS = GRID_END_HOUR - GRID_START_HOUR; // 14
const PX_PER_HOUR = 68;     // height of each hourly row in pixels

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SHORT_DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Offering colour palette — rotates per offering
const COLORS = [
  { card: "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800", text: "text-violet-900 dark:text-violet-200" },
  { card: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800", text: "text-sky-900 dark:text-sky-200" },
  { card: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800", text: "text-rose-900 dark:text-rose-200" },
  { card: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800", text: "text-amber-900 dark:text-amber-200" },
  { card: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800", text: "text-emerald-900 dark:text-emerald-200" },
  { card: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", text: "text-orange-900 dark:text-orange-200" },
  { card: "bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800", text: "text-pink-900 dark:text-pink-200" },
  { card: "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800", text: "text-teal-900 dark:text-teal-200" },
];

// ── Prop types ────────────────────────────────────────────────────────────────

export interface RecurringEvent {
  /** Subject ID */
  id: string;
  offeringId: string;
  offeringTitle: string;
  subjectTitle: string;
  /** JS Date.getDay() convention: 0=Sun 1=Mon … 6=Sat */
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  meetingUrl: string;
  colorIndex: number;
}

export interface AdhocEvent {
  /** Lesson ID */
  id: string;
  offeringId: string;
  offeringTitle: string;
  subjectTitle: string;
  /** ISO 8601 UTC string */
  scheduledAtUtc: string;
  durationMinutes: number;
  liveClassLink: string | null;
  recordingUrl: string | null;
  colorIndex: number;
}

interface WeeklyCalendarProps {
  recurringEvents: RecurringEvent[];
  adhocEvents: AdhocEvent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Add PKT offset so getUTC* reads return PKT wall-clock values. */
function toPkt(utcMs: number): Date {
  return new Date(utcMs + PKT_OFFSET_MS);
}

/** Grid column index for a JS dayOfWeek (0=Sun). Mon→0, Tue→1 … Sun→6. */
function dayCol(dow: number): number {
  return dow === 0 ? 6 : dow - 1;
}

/** Monday of the week (as a PKT "fake-UTC" Date) + weekOffset weeks from now. */
function weekMonday(offset: number): Date {
  const pkt = toPkt(Date.now());
  const dow = pkt.getUTCDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(pkt);
  mon.setUTCDate(pkt.getUTCDate() + toMon + offset * 7);
  mon.setUTCHours(0, 0, 0, 0);
  return mon;
}

/** Top pixel offset for a PKT hour:minute within the grid. Returns null when outside grid. */
function gridTop(hour: number, minute: number): number | null {
  if (hour < GRID_START_HOUR || hour >= GRID_END_HOUR) return null;
  return ((hour - GRID_START_HOUR) * 60 + minute) * (PX_PER_HOUR / 60);
}

/** Pixel height for a duration. Clamped to min 28px so short events are readable. */
function gridHeight(minutes: number): number {
  return Math.max(minutes * (PX_PER_HOUR / 60), 28);
}

/** Format a PKT hour:minute as "6:00 PM". */
function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 || 12;
  const mm  = String(minute).padStart(2, "0");
  return `${h12}:${mm} ${hour < 12 ? "AM" : "PM"}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface EventBlockProps {
  title: string;
  offeringTitle: string;
  timeLabel: string;
  meetingUrl?: string | null;
  recordingUrl?: string | null;
  isLive: boolean;
  isSoon: boolean;
  colorIdx: number;
  heightPx: number;
}

function EventBlock({
  title, offeringTitle, timeLabel, meetingUrl, recordingUrl,
  isLive, isSoon, colorIdx, heightPx,
}: EventBlockProps) {
  const color = COLORS[colorIdx % COLORS.length];
  const liveStyle = "border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-700";

  return (
    <div
      className={cn(
        "w-full rounded-md border overflow-hidden px-1.5 py-1 text-left",
        isLive ? liveStyle : color.card
      )}
    >
      {isLive && (
        <span className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          Live now
        </span>
      )}
      <p className={cn(
        "text-[10px] font-semibold leading-tight",
        isLive ? "text-emerald-900 dark:text-emerald-200" : color.text
      )}>
        {title}
      </p>
      <p className="text-[9px] text-muted-foreground leading-tight truncate">{offeringTitle}</p>

      {heightPx >= 54 && (
        <p className="mt-0.5 text-[9px] text-muted-foreground">{timeLabel} PKT</p>
      )}

      {heightPx >= 48 && (isLive || isSoon) && meetingUrl && (
        <a
          href={meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 underline"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Join
        </a>
      )}

      {heightPx >= 48 && recordingUrl && !isLive && (
        <a
          href={recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex items-center gap-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400 underline"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Recording
        </a>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeeklyCalendar({ recurringEvents, adhocEvents }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(() => new Date());

  // Refresh "now" every minute so live-now indicator stays accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowPkt = useMemo(() => toPkt(now.getTime()), [now]);
  const mon    = useMemo(() => weekMonday(weekOffset), [weekOffset]);

  // ── Day column metadata ──
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setUTCDate(mon.getUTCDate() + i);
      const isToday =
        d.getUTCDate()     === nowPkt.getUTCDate()  &&
        d.getUTCMonth()    === nowPkt.getUTCMonth() &&
        d.getUTCFullYear() === nowPkt.getUTCFullYear();
      return {
        label: SHORT_DAYS[i],
        date:  d.getUTCDate(),
        month: d.getUTCMonth(),
        year:  d.getUTCFullYear(),
        isToday,
        colDow: i === 6 ? 0 : i + 1, // JS dayOfWeek for this column
      };
    });
  }, [mon, nowPkt]);

  const weekLabel = useMemo(() => {
    const s = days[0], e = days[6];
    if (s.month === e.month) {
      return `${SHORT_MONTHS[s.month]} ${s.date}–${e.date}, ${s.year}`;
    }
    return `${SHORT_MONTHS[s.month]} ${s.date} – ${SHORT_MONTHS[e.month]} ${e.date}, ${e.year}`;
  }, [days]);

  // ── Ad-hoc events visible this week ──
  const visibleAdhoc = useMemo(() => {
    // Week start/end in true UTC
    const wStartUtc = mon.getTime() - PKT_OFFSET_MS;
    const wEndUtc   = wStartUtc + 7 * 24 * 60 * 60 * 1000;
    return adhocEvents.filter((e) => {
      const ms = new Date(e.scheduledAtUtc).getTime();
      return ms >= wStartUtc && ms < wEndUtc;
    });
  }, [adhocEvents, mon]);

  // ── Live-now helpers ──
  function isRecurringLive(e: RecurringEvent): boolean {
    if (weekOffset !== 0) return false;
    if (nowPkt.getUTCDay() !== e.dayOfWeek) return false;
    const cur = nowPkt.getUTCHours() * 60 + nowPkt.getUTCMinutes();
    const start = e.startHour * 60 + e.startMinute;
    return cur >= start && cur < start + e.durationMinutes;
  }

  function isAdhocLive(e: AdhocEvent): boolean {
    const startMs = new Date(e.scheduledAtUtc).getTime();
    const endMs   = startMs + e.durationMinutes * 60_000;
    return now.getTime() >= startMs && now.getTime() < endMs;
  }

  // "Join" button shows when class is live OR starts within 15 min
  function isRecurringSoon(e: RecurringEvent): boolean {
    if (weekOffset !== 0) return false;
    if (nowPkt.getUTCDay() !== e.dayOfWeek) return false;
    const cur   = nowPkt.getUTCHours() * 60 + nowPkt.getUTCMinutes();
    const start = e.startHour * 60 + e.startMinute;
    return cur < start && start - cur <= 15;
  }

  function isAdhocSoon(e: AdhocEvent): boolean {
    const startMs = new Date(e.scheduledAtUtc).getTime();
    const diffMin = (startMs - now.getTime()) / 60_000;
    return diffMin > 0 && diffMin <= 15;
  }

  // ── Current-time indicator ──
  const timeLine = useMemo(() => {
    if (weekOffset !== 0) return null;
    const h = nowPkt.getUTCHours(), m = nowPkt.getUTCMinutes();
    return gridTop(h, m);
  }, [nowPkt, weekOffset]);

  const totalHeight = GRID_HOURS * PX_PER_HOUR;
  const hasAny = recurringEvents.length > 0 || adhocEvents.length > 0;

  // ── Today's classes (for the prominent top panel) ──
  const todayEvents = useMemo(() => {
    const results: { id: string; title: string; timeLabel: string; meetingUrl?: string | null; recordingUrl?: string | null; isLive: boolean; isSoon: boolean; colorIndex: number }[] = [];

    for (const e of recurringEvents) {
      if (nowPkt.getUTCDay() !== e.dayOfWeek) continue;
      const live = isRecurringLive(e);
      const soon = isRecurringSoon(e);
      results.push({
        id: e.id,
        title: `${e.subjectTitle} — ${e.offeringTitle}`,
        timeLabel: formatTime(e.startHour, e.startMinute),
        meetingUrl: e.meetingUrl,
        recordingUrl: null,
        isLive: live,
        isSoon: soon,
        colorIndex: e.colorIndex,
      });
    }

    for (const e of adhocEvents) {
      const pkt = toPkt(new Date(e.scheduledAtUtc).getTime());
      const isToday =
        pkt.getUTCDate()     === nowPkt.getUTCDate()  &&
        pkt.getUTCMonth()    === nowPkt.getUTCMonth() &&
        pkt.getUTCFullYear() === nowPkt.getUTCFullYear();
      if (!isToday) continue;
      results.push({
        id: e.id,
        title: `${e.subjectTitle} — ${e.offeringTitle}`,
        timeLabel: formatTime(pkt.getUTCHours(), pkt.getUTCMinutes()),
        meetingUrl: e.liveClassLink,
        recordingUrl: e.recordingUrl,
        isLive: isAdhocLive(e),
        isSoon: isAdhocSoon(e),
        colorIndex: e.colorIndex,
      });
    }

    // Sort by live first, then time label
    return results.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringEvents, adhocEvents, nowPkt, now]);

  // ── Agenda list for mobile ──
  const agendaByDay = useMemo(() => {
    const map: Record<number, { id: string; title: string; offeringTitle: string; timeLabel: string; meetingUrl?: string | null; recordingUrl?: string | null; isLive: boolean; colorIndex: number }[]> = {};

    for (let i = 0; i < 7; i++) {
      map[i] = [];
    }

    for (const e of recurringEvents) {
      const col = dayCol(e.dayOfWeek);
      map[col].push({
        id: e.id,
        title: e.subjectTitle,
        offeringTitle: e.offeringTitle,
        timeLabel: formatTime(e.startHour, e.startMinute),
        meetingUrl: e.meetingUrl,
        recordingUrl: null,
        isLive: isRecurringLive(e),
        colorIndex: e.colorIndex,
      });
    }

    for (const e of visibleAdhoc) {
      const pkt = toPkt(new Date(e.scheduledAtUtc).getTime());
      const col = dayCol(pkt.getUTCDay());
      map[col].push({
        id: e.id,
        title: e.subjectTitle,
        offeringTitle: e.offeringTitle,
        timeLabel: formatTime(pkt.getUTCHours(), pkt.getUTCMinutes()),
        meetingUrl: e.liveClassLink,
        recordingUrl: e.recordingUrl,
        isLive: isAdhocLive(e),
        colorIndex: e.colorIndex,
      });
    }

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringEvents, visibleAdhoc, nowPkt, now]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Today's classes panel ── */}
      {weekOffset === 0 && todayEvents.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Radio className="h-4 w-4 text-primary" />
            Today's Classes
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {todayEvents.map((ev) => {
              const color = COLORS[ev.colorIndex % COLORS.length];
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                    ev.isLive
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : color.card
                  )}
                >
                  <div className="min-w-0">
                    {ev.isLive && (
                      <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live now
                      </span>
                    )}
                    <p className={cn("truncate text-sm font-medium", ev.isLive ? "text-emerald-900 dark:text-emerald-200" : color.text)}>
                      {ev.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{ev.timeLabel} PKT</p>
                  </div>
                  {(ev.isLive || ev.isSoon) && ev.meetingUrl && (
                    <a
                      href={ev.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      Join
                    </a>
                  )}
                  {ev.recordingUrl && !ev.isLive && (
                    <a
                      href={ev.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Recording
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Week navigation ── */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-primary underline underline-offset-2"
            >
              Back to today
            </button>
          )}
        </div>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          aria-label="Next week"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Empty state ── */}
      {!hasAny && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No classes scheduled yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your instructor will set up your class times — check back soon.
          </p>
        </div>
      )}

      {/* ── Desktop: time-grid calendar ── */}
      {hasAny && (
        <div className="hidden md:block overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-[600px]">

            {/* Day header row */}
            <div className="grid border-b" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              <div className="border-r" /> {/* gutter spacer */}
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-r last:border-r-0 py-2.5 text-center",
                    day.isToday && "bg-primary/5"
                  )}
                >
                  <p className={cn("text-[11px] font-semibold uppercase tracking-wide", day.isToday ? "text-primary" : "text-muted-foreground")}>
                    {day.label}
                  </p>
                  <div className={cn(
                    "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                    day.isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  )}>
                    {day.date}
                  </div>
                </div>
              ))}
            </div>

            {/* Time rows + event cells */}
            <div className="relative grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)", height: totalHeight }}>

              {/* Hour lines (full-width, behind everything) */}
              {Array.from({ length: GRID_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute left-0 right-0 border-t border-muted/50"
                  style={{ top: i * PX_PER_HOUR }}
                />
              ))}

              {/* Half-hour lines */}
              {Array.from({ length: GRID_HOURS }, (_, i) => (
                <div
                  key={`h${i}`}
                  className="pointer-events-none absolute left-0 right-0 border-t border-muted/25"
                  style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                />
              ))}

              {/* Time gutter labels */}
              <div className="relative border-r">
                {Array.from({ length: GRID_HOURS }, (_, i) => {
                  const h = GRID_START_HOUR + i;
                  return (
                    <div
                      key={i}
                      className="absolute right-2 flex items-start"
                      style={{ top: i * PX_PER_HOUR - 7, height: PX_PER_HOUR }}
                    >
                      <span className="text-[9px] tabular-nums text-muted-foreground">
                        {h % 12 || 12}{h < 12 ? "a" : "p"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {days.map((day, col) => (
                <div
                  key={col}
                  className={cn(
                    "relative border-r last:border-r-0",
                    day.isToday && "bg-primary/[0.015]"
                  )}
                >
                  {/* Current-time red line (today only) */}
                  {day.isToday && timeLine !== null && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: timeLine }}
                    >
                      <span className="h-2 w-2 shrink-0 -translate-x-1 rounded-full bg-red-500" />
                      <span className="h-px flex-1 bg-red-500" />
                    </div>
                  )}

                  {/* Recurring events — always show on their weekday column */}
                  {recurringEvents
                    .filter((e) => dayCol(e.dayOfWeek) === col)
                    .map((e) => {
                      const top = gridTop(e.startHour, e.startMinute);
                      if (top === null) return null;
                      const h   = gridHeight(e.durationMinutes);
                      const live = isRecurringLive(e);
                      const soon = isRecurringSoon(e);
                      return (
                        <div
                          key={e.id}
                          className="absolute left-0.5 right-0.5 z-10"
                          style={{ top, height: h }}
                        >
                          <EventBlock
                            title={e.subjectTitle}
                            offeringTitle={e.offeringTitle}
                            timeLabel={formatTime(e.startHour, e.startMinute)}
                            meetingUrl={e.meetingUrl}
                            recordingUrl={null}
                            isLive={live}
                            isSoon={soon}
                            colorIdx={e.colorIndex}
                            heightPx={h}
                          />
                        </div>
                      );
                    })}

                  {/* Ad-hoc events for this specific week + day */}
                  {visibleAdhoc
                    .filter((e) => {
                      const pkt = toPkt(new Date(e.scheduledAtUtc).getTime());
                      return dayCol(pkt.getUTCDay()) === col;
                    })
                    .map((e) => {
                      const pkt = toPkt(new Date(e.scheduledAtUtc).getTime());
                      const h2  = pkt.getUTCHours(), m2 = pkt.getUTCMinutes();
                      const top = gridTop(h2, m2);
                      if (top === null) return null;
                      const ht   = gridHeight(e.durationMinutes);
                      const live = isAdhocLive(e);
                      const soon = isAdhocSoon(e);
                      return (
                        <div
                          key={e.id}
                          className="absolute left-0.5 right-0.5 z-10"
                          style={{ top, height: ht }}
                        >
                          <EventBlock
                            title={e.subjectTitle}
                            offeringTitle={e.offeringTitle}
                            timeLabel={formatTime(h2, m2)}
                            meetingUrl={e.liveClassLink}
                            recordingUrl={e.recordingUrl}
                            isLive={live}
                            isSoon={soon}
                            colorIdx={e.colorIndex}
                            heightPx={ht}
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: agenda list ── */}
      {hasAny && (
        <div className="md:hidden space-y-4">
          {days.map((day, col) => {
            const events = agendaByDay[col] ?? [];
            if (events.length === 0) return null;
            return (
              <div key={col}>
                <div className={cn(
                  "mb-2 flex items-center gap-2 text-sm font-semibold",
                  day.isToday && "text-primary"
                )}>
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    day.isToday ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {day.date}
                  </span>
                  {day.label}{day.isToday && <span className="text-xs font-normal text-muted-foreground">· Today</span>}
                </div>
                <div className="space-y-2 pl-9">
                  {events.map((ev) => {
                    const color = COLORS[ev.colorIndex % COLORS.length];
                    return (
                      <div
                        key={ev.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                          ev.isLive ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" : color.card
                        )}
                      >
                        <div className="min-w-0">
                          {ev.isLive && (
                            <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live now
                            </span>
                          )}
                          <p className={cn("text-sm font-medium truncate", ev.isLive ? "text-emerald-900 dark:text-emerald-200" : color.text)}>
                            {ev.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{ev.offeringTitle} · {ev.timeLabel} PKT</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {ev.meetingUrl && (
                            <a
                              href={ev.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                                ev.isLive
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "border hover:bg-muted text-foreground"
                              )}
                            >
                              {ev.isLive ? "Join" : "Link"}
                            </a>
                          )}
                          {ev.recordingUrl && !ev.isLive && (
                            <a
                              href={ev.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                            >
                              Recording
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
