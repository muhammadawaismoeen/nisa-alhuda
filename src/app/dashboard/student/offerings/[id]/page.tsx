/**
 * Student Learning Hub — the main learning page for an enrolled offering.
 * Shows subjects with expandable lessons, live class links, and recordings.
 * Only accessible to students with approved enrollment.
 */
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Video,
  Clock,
  CheckCircle,
} from "lucide-react";
import { SubjectAccordion } from "./subject-accordion";
import type { Subject, Lesson } from "@/lib/types/database";

export default async function StudentLearningHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify student has an approved enrollment for this offering
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("offering_id", id)
    .single();

  if (!enrollment || enrollment.status !== "approved") {
    notFound();
  }

  // Fetch offering details
  const { data: offering } = await supabase
    .from("offerings")
    .select("*")
    .eq("id", id)
    .single();

  if (!offering) notFound();

  // Fetch subjects for this offering with instructor info
  const { data: subjects } = await supabase
    .from("subjects")
    .select("*, instructor:profiles(full_name)")
    .eq("offering_id", id)
    .order("sort_order", { ascending: true });

  // Fetch all published lessons for this offering
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("offering_id", id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  // Group lessons by subject
  const lessonsBySubject: Record<string, Lesson[]> = {};
  (lessons || []).forEach((lesson: Lesson) => {
    const sid = lesson.subject_id || "__no_subject__";
    if (!lessonsBySubject[sid]) lessonsBySubject[sid] = [];
    lessonsBySubject[sid].push(lesson);
  });

  const totalLessons = lessons?.length || 0;

  // Fetch student's progress for this offering
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("student_id", user.id)
    .eq("offering_id", id);

  const completedLessonIds = (progress || []).map(
    (p: { lesson_id: string }) => p.lesson_id
  );
  const completedCount = completedLessonIds.length;
  const completionPct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Determine upcoming lesson
  const now = new Date();
  const upcomingLesson = (lessons || []).find(
    (l: Lesson) => l.scheduled_at && new Date(l.scheduled_at) > now
  );

  return (
    <div>
      {/* Back nav */}
      <LinkButton
        variant="ghost"
        href="/dashboard/student"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to My Learning
      </LinkButton>

      {/* Offering Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">
            {offering.type === "program"
              ? "Program"
              : offering.type === "course"
                ? "Course"
                : "Workshop"}
          </Badge>
          <Badge variant="default">Enrolled</Badge>
        </div>
        <h1 className="text-2xl font-bold mb-2">{offering.title}</h1>
        {offering.short_description && (
          <p className="text-sm text-muted-foreground max-w-2xl">
            {offering.short_description}
          </p>
        )}

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {offering.schedule_start && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(offering.schedule_start).toLocaleDateString("en-PK", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {offering.schedule_end && (
                  <>
                    {" — "}
                    {new Date(offering.schedule_end).toLocaleDateString(
                      "en-PK",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>
              {subjects?.length || 0}{" "}
              {(subjects?.length || 0) === 1 ? "subject" : "subjects"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Video className="h-4 w-4" />
            <span>
              {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
            </span>
          </div>
          {totalLessons > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>
                {completedCount}/{totalLessons} completed ({completionPct}%)
              </span>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        {totalLessons > 0 && (
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Overall Progress</span>
              <span className={completionPct === 100 ? "text-green-600 font-semibold" : ""}>
                {completionPct}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completionPct === 100 ? "bg-green-500" : "bg-primary"
                }`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upcoming class notice */}
      {upcomingLesson && upcomingLesson.live_class_link && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Upcoming: {upcomingLesson.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(upcomingLesson.scheduled_at!).toLocaleDateString(
                    "en-PK",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
              <a
                href={upcomingLesson.live_class_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press shrink-0"
              >
                Join Class
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjects & Lessons */}
      {!subjects || subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              Content coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              Your instructor is preparing the lessons. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <SubjectAccordion
          subjects={subjects as (Subject & { instructor: { full_name: string } | null })[]}
          lessonsBySubject={lessonsBySubject}
          completedLessonIds={completedLessonIds}
          offeringId={id}
        />
      )}
    </div>
  );
}
