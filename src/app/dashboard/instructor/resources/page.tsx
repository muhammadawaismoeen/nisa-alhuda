/**
 * Resource Manager — upload and manage session notes and resources.
 * Server component that fetches subjects/lessons and passes to client uploader.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ResourceUploader } from "./resource-uploader";
import type { Subject, Lesson, Resource } from "@/lib/types/database";

export default async function ResourceManagerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch instructor's subjects
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, title, slug, offering_id")
    .eq("instructor_id", user.id)
    .order("sort_order", { ascending: true });

  if (!subjects || subjects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Resources</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upload and manage session notes and materials.
        </p>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              No subjects assigned yet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjectIds = subjects.map((s) => s.id);

  // Fetch lessons for these subjects
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, subject_id, sort_order")
    .in("subject_id", subjectIds)
    .order("sort_order", { ascending: true });

  // Fetch existing resources
  const lessonIds = (lessons || []).map((l: any) => l.id);
  let resources: Resource[] = [];

  if (lessonIds.length > 0) {
    const { data: res } = await supabase
      .from("resources")
      .select("*")
      .in("lesson_id", lessonIds)
      .order("created_at", { ascending: false });

    resources = (res as Resource[]) || [];
  }

  // Group lessons by subject
  const lessonsBySubject: Record<string, Pick<Lesson, "id" | "title" | "subject_id" | "sort_order">[]> = {};
  (lessons || []).forEach((l: any) => {
    if (!lessonsBySubject[l.subject_id]) lessonsBySubject[l.subject_id] = [];
    lessonsBySubject[l.subject_id].push(l);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload and manage session notes and materials for your lessons.
        </p>
      </div>

      <ResourceUploader
        subjects={subjects as Pick<Subject, "id" | "title">[]}
        lessonsBySubject={lessonsBySubject}
        initialResources={resources}
      />
    </div>
  );
}
