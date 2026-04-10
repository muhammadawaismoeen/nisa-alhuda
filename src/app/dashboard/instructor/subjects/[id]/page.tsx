/**
 * Subject Lessons Page — instructor manages lessons for a specific subject.
 * Shows all lessons with options to add, edit, and delete.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { ArrowLeft, Video, Plus } from "lucide-react";
import { LessonList } from "./lesson-list";
import type { Subject, Lesson } from "@/lib/types/database";

export default async function SubjectLessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify instructor owns this subject
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subject } = await supabase
    .from("subjects")
    .select("*, offering:offerings(id, title, slug, status)")
    .eq("id", id)
    .single();

  if (!subject) notFound();

  // Check access: instructor must own this subject or be admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (subject.instructor_id !== user?.id && profile?.role !== "admin") {
    notFound();
  }

  // Fetch lessons for this subject
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("subject_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div>
      {/* Header */}
      <LinkButton
        variant="ghost"
        href="/dashboard/instructor"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to My Subjects
      </LinkButton>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {(subject as any).offering?.title}
          </p>
          <h1 className="text-2xl font-bold">{subject.title}</h1>
          {subject.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {subject.description}
            </p>
          )}
        </div>
      </div>

      {/* Lessons */}
      <LessonList
        subjectId={id}
        offeringId={subject.offering_id}
        lessons={(lessons as Lesson[]) || []}
      />
    </div>
  );
}
