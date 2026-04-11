/**
 * Student Dashboard — "My Learning" hub.
 * Shows approved enrollments as active learning cards,
 * plus a summary of pending enrollments.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import {
  BookOpen,
  ArrowRight,
  Clock,
  GraduationCap,
  Calendar,
  Video,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import type { Offering, LiveSession, Profile as ProfileType } from "@/lib/types/database";

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch all enrollments with offering details
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, offering:offerings(*)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const approved = enrollments?.filter((e) => e.status === "approved") || [];
  const pending = enrollments?.filter((e) => e.status === "pending") || [];

  // For approved enrollments, count published lessons per offering
  const approvedOfferingIds = approved.map((e) => e.offering_id);
  let lessonCounts: Record<string, number> = {};

  if (approvedOfferingIds.length > 0) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("offering_id")
      .in("offering_id", approvedOfferingIds)
      .eq("is_published", true);

    if (lessons) {
      lessonCounts = lessons.reduce(
        (acc, l) => {
          acc[l.offering_id] = (acc[l.offering_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  // Fetch completed lesson counts per offering
  let completedCounts: Record<string, number> = {};

  if (approvedOfferingIds.length > 0) {
    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select("offering_id")
      .eq("student_id", user.id)
      .in("offering_id", approvedOfferingIds);

    if (progressData) {
      completedCounts = progressData.reduce(
        (acc, p: { offering_id: string }) => {
          acc[p.offering_id] = (acc[p.offering_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  // Fetch live sessions (RLS filters to enrolled offerings)
  let liveSessions: (LiveSession & {
    instructor: ProfileType;
    offering: Offering;
  })[] = [];

  try {
    const now = new Date();
    const { data: sessionsData } = await supabase
      .from("live_sessions")
      .select(
        "*, instructor:profiles!live_sessions_instructor_id_fkey(*), offering:offerings!live_sessions_offering_id_fkey(*)"
      )
      .gte(
        "scheduled_at",
        new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
      )
      .order("scheduled_at", { ascending: true });

    if (sessionsData) {
      liveSessions = (sessionsData as typeof liveSessions).filter((s) => {
        const start = new Date(s.scheduled_at);
        const end = new Date(
          start.getTime() + s.duration_minutes * 60 * 1000
        );
        return now >= start && now <= end;
      });
    }
  } catch {
    // Table may not exist before migration
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Learning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access your enrolled programs, courses, and workshops.
        </p>
      </div>

      {/* Live Now Banner */}
      {liveSessions.length > 0 && (
        <div className="mb-6 space-y-3">
          {liveSessions.map((session) => {
            const startedAgo = Math.floor(
              (new Date().getTime() - new Date(session.scheduled_at).getTime()) /
                (1000 * 60)
            );
            return (
              <div
                key={session.id}
                className="p-4 rounded-xl border border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-800 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                      <Video className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                      LIVE NOW &middot; {session.title}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {session.instructor?.full_name} &middot; Started{" "}
                      {startedAgo}m ago
                    </p>
                  </div>
                </div>
                <a
                  href={session.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors press shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Join Now
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending enrollments notice */}
      {pending.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {pending.length} enrollment{pending.length > 1 ? "s" : ""} pending
              review
            </p>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 ml-6">
            Your enrollment{pending.length > 1 ? "s are" : " is"} being
            reviewed. You&apos;ll get access once approved.{" "}
            <LinkButton
              variant="link"
              href="/dashboard/student/enrollments"
              className="text-xs h-auto p-0 text-amber-800 dark:text-amber-200 underline"
            >
              View details
            </LinkButton>
          </p>
        </div>
      )}

      {/* Active Learning */}
      {approved.length === 0 && pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No enrollments yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Browse our catalog to find programs and courses.
            </p>
            <LinkButton href="/offerings">Browse Catalog</LinkButton>
          </CardContent>
        </Card>
      ) : approved.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No active courses yet
            </p>
            <p className="text-sm text-muted-foreground">
              Your enrollments are being reviewed. You&apos;ll see your courses
              here once approved.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approved.map((enrollment) => {
            const offering = enrollment.offering as Offering;
            const count = lessonCounts[offering.id] || 0;
            const completed = completedCounts[offering.id] || 0;
            const pct = count > 0 ? Math.round((completed / count) * 100) : 0;

            return (
              <Card key={enrollment.id} className="hover-lift">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="default">Enrolled</Badge>
                  </div>

                  <h3 className="font-heading font-semibold text-lg mb-1">
                    {offering.title}
                  </h3>

                  {offering.short_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {offering.short_description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                    {offering.schedule_start && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(offering.schedule_start).toLocaleDateString(
                          "en-PK",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {count} {count === 1 ? "lesson" : "lessons"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {offering.type === "program"
                        ? "Program"
                        : offering.type === "course"
                          ? "Course"
                          : "Workshop"}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  {count > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {completed} of {count} lessons
                        </span>
                        <span className={pct === 100 ? "text-green-600 font-semibold" : ""}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100 ? "bg-green-500" : "bg-primary"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <LinkButton
                      className="w-full press"
                      href={`/dashboard/student/offerings/${offering.id}`}
                    >
                      {pct === 100 ? "Review Course" : "Continue Learning"}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </LinkButton>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
