/**
 * Subject Folder — the unified per-subject view.
 *
 * One screen per subject. Lists every "Class" (a `lessons` row) with its
 * meeting link, recording, and attached resources inline. Replaces the
 * fragmented Live Hub + Resources flow as the primary instructor surface.
 *
 * Data model:
 *   subject (1) → classes (many `lessons` rows) → resources (many files
 *   per class via `resources.lesson_id`)
 *
 * Both instructors (their own subject) and admins (any subject) can use
 * this page; RLS already permits both.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getDashboardViewer } from "@/lib/auth-helpers";
import { LessonList } from "./lesson-list";
import type { Lesson, Resource } from "@/lib/types/database";

export default async function SubjectFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const viewer = await getDashboardViewer();
  if (!viewer) return null;

  const { data: subject } = await supabase
    .from("subjects")
    .select(
      "*, offering:offerings(id, title, slug, status), instructor:profiles!subjects_instructor_id_fkey(id, full_name)"
    )
    .eq("id", id)
    .single();

  if (!subject) notFound();

  // Hard scope: instructors can only enter their own subjects. Admins
  // can enter any. RLS would reject writes anyway but this gives a clean
  // 404 instead of a half-rendered page with empty actions.
  if (!viewer.isAdmin && subject.instructor_id !== viewer.userId) {
    notFound();
  }

  const { data: lessonsData } = await supabase
    .from("lessons")
    .select("*")
    .eq("subject_id", id)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true });

  const lessons: Lesson[] = (lessonsData as Lesson[]) || [];
  const lessonIds = lessons.map((l) => l.id);

  // Pull every resource attached to these classes in one shot — the
  // client component will group them by lesson_id for inline display.
  let resources: Resource[] = [];
  if (lessonIds.length > 0) {
    const { data: resourcesData } = await supabase
      .from("resources")
      .select("*")
      .in("lesson_id", lessonIds)
      .order("created_at", { ascending: false });
    resources = (resourcesData as Resource[]) || [];
  }

  return (
    <div>
      <LinkButton
        variant="ghost"
        href="/dashboard/instructor"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to subjects
      </LinkButton>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-medium mb-1">
          {(subject as { offering?: { title?: string } }).offering?.title || "Subject"}
        </p>
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {subject.title}
            </h1>
            {viewer.isAdmin && subject.instructor && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Instructor:{" "}
                <span className="font-medium text-foreground">
                  {(subject.instructor as { full_name?: string }).full_name}
                </span>
              </p>
            )}
            {subject.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                {subject.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <LessonList
        subjectId={id}
        offeringId={subject.offering_id}
        lessons={lessons}
        initialResources={resources}
      />
    </div>
  );
}
