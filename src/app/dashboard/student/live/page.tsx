/**
 * Student Live Sessions page.
 *
 * Sourced from `lessons` (not the legacy `live_sessions` table). Shows
 * Live Now / Upcoming / Past for every class in offerings the student is
 * enrolled in. Past classes link to their recording when available.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  ExternalLink,
  Calendar,
  Clock,
  PlayCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecordingPlayer } from "@/components/lesson/recording-player";
import { isYouTubeUrl } from "@/lib/video-helpers";
import { isSameDayPkt } from "@/lib/recurring-schedule";
import type { Lesson } from "@/lib/types/database";

interface LessonWithRefs extends Lesson {
  subject: {
    id: string;
    title: string;
    instructor_id: string;
    /**
     * Fallback Zoom/Meet URL set at the subject level (migration 024).
     * Used when the per-lesson `live_class_link` is not set — common
     * for the new pattern where admin sets one recurring URL per
     * subject and pre-creates 52 weekly lesson rows without links.
     */
    recurring_meeting_url: string | null;
  } | null;
  offering: { id: string; title: string } | null;
  instructor: { id: string; full_name: string } | null;
}

/** Resolve the join URL for a lesson — per-lesson link wins, subject's recurring URL is the fallback. */
function joinUrlFor(lesson: LessonWithRefs): string | null {
  return lesson.live_class_link ?? lesson.subject?.recurring_meeting_url ?? null;
}

export default async function StudentLivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Find the student's approved enrollments → offering ids.
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("offering_id")
    .eq("student_id", user.id)
    .eq("status", "approved");

  const offeringIds = [
    ...new Set((enrollments || []).map((e) => e.offering_id)),
  ];

  // Pull every published class in those offerings, with subject + instructor.
  let lessons: LessonWithRefs[] = [];
  if (offeringIds.length > 0) {
    const { data } = await supabase
      .from("lessons")
      .select(
        "*, subject:subjects(id, title, instructor_id, recurring_meeting_url), offering:offerings(id, title)"
      )
      .in("offering_id", offeringIds)
      .eq("is_published", true)
      .order("scheduled_at", { ascending: true });

    const baseLessons = (data as LessonWithRefs[]) || [];

    // Resolve instructor full_name for each subject (one lookup map for all).
    const instructorIds = [
      ...new Set(
        baseLessons
          .map((l) => l.subject?.instructor_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    let instructorMap: Record<string, { id: string; full_name: string }> = {};
    if (instructorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", instructorIds);
      instructorMap = Object.fromEntries(
        (profs || []).map((p) => [p.id, p as { id: string; full_name: string }])
      );
    }
    lessons = baseLessons.map((l) => ({
      ...l,
      instructor: l.subject?.instructor_id
        ? instructorMap[l.subject.instructor_id] ?? null
        : null,
    }));
  }

  const nowMs = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  const live = lessons.filter((l) => {
    if (!l.scheduled_at || l.recording_url) return false;
    if (!joinUrlFor(l)) return false;
    const start = new Date(l.scheduled_at).getTime();
    return nowMs >= start && nowMs <= start + TWO_HOURS;
  });

  const upcoming = lessons.filter((l) => {
    if (!l.scheduled_at) return false;
    return new Date(l.scheduled_at).getTime() > nowMs;
  });

  const past = lessons
    .filter((l) => {
      if (!l.scheduled_at) return false;
      const start = new Date(l.scheduled_at).getTime();
      return nowMs > start + TWO_HOURS;
    })
    .reverse()
    .slice(0, 30);

  return (
    <div>
      <PageHeader
        icon={Video}
        title="Live Sessions"
        subtitle="Join live classes and revisit past recordings."
      />

      {/* Live Now */}
      {live.length > 0 && (
        <section className="mb-6">
          <div className="space-y-3">
            {live.map((lesson) => {
              const startedAgo = Math.floor(
                (nowMs - new Date(lesson.scheduled_at!).getTime()) /
                  (1000 * 60)
              );
              return (
                <Card
                  key={lesson.id}
                  className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                            <Video className="h-5 w-5 text-red-600" />
                          </div>
                          <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
                              <span className="text-[8px] text-white font-bold">
                                LIVE
                              </span>
                            </span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-lg">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {lesson.subject?.title}
                            {lesson.instructor?.full_name
                              ? ` · ${lesson.instructor.full_name}`
                              : ""}{" "}
                            · Started {startedAgo}m ago
                          </p>
                          {lesson.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={joinUrlFor(lesson)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors press shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Now
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      <section className="mb-8">
        <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Sessions
          {upcoming.length > 0 && (
            <Badge variant="outline">{upcoming.length}</Badge>
          )}
        </h2>

        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-1">
                No upcoming sessions
              </p>
              <p className="text-sm text-muted-foreground">
                Your instructors will schedule live sessions here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((lesson) => {
              const scheduled = new Date(lesson.scheduled_at!);
              const diffMs = scheduled.getTime() - nowMs;
              const diffMins = Math.floor(diffMs / (1000 * 60));
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);

              let timeLabel = "";
              if (diffDays > 0) {
                timeLabel = `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
              } else if (diffHours > 0) {
                timeLabel = `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
              } else {
                timeLabel = `in ${diffMins} min`;
              }

              return (
                <Card
                  key={lesson.id}
                  className="border-blue-200/60 dark:border-blue-800/60"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {lesson.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-600 border-blue-300 shrink-0"
                          >
                            {timeLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {lesson.subject?.title}
                          {lesson.instructor?.full_name
                            ? ` · ${lesson.instructor.full_name}`
                            : ""}{" "}
                          ·{" "}
                          {scheduled.toLocaleString("en-PK", {
                            timeZone: "Asia/Karachi",
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          PKT
                        </p>
                        {lesson.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      {/* Join button only shows for sessions happening
                          TODAY (PKT). Tomorrow's classes still appear in
                          the list with their countdown badge ("in 1
                          day"), but with no Join button until that day
                          arrives. Mirrors the founder ask 2026-04-29. */}
                      {joinUrlFor(lesson) &&
                        isSameDayPkt(lesson.scheduled_at, new Date()) && (
                          <a
                            href={joinUrlFor(lesson)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Join
                          </a>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Sessions */}
      {past.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            Past Sessions
          </h2>
          <div className="space-y-2">
            {past.map((lesson) => {
              const scheduled = new Date(lesson.scheduled_at!);
              return (
                <Card key={lesson.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Video className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {lesson.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {lesson.subject?.title}
                          {lesson.instructor?.full_name
                            ? ` · ${lesson.instructor.full_name}`
                            : ""}{" "}
                          ·{" "}
                          {scheduled.toLocaleString("en-PK", {
                            timeZone: "Asia/Karachi",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          PKT
                        </p>
                      </div>
                      {/* Pill link only for non-YouTube URLs. YouTube
                          recordings render as a collapsible embed row
                          below the meta line. */}
                      {lesson.recording_url &&
                        !isYouTubeUrl(lesson.recording_url) && (
                          <a
                            href={lesson.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium px-3 py-1.5 transition-colors shrink-0"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Watch recording
                          </a>
                        )}
                    </div>
                    {lesson.recording_url &&
                      isYouTubeUrl(lesson.recording_url) && (
                        <div className="mt-3">
                          <RecordingPlayer url={lesson.recording_url} />
                        </div>
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
