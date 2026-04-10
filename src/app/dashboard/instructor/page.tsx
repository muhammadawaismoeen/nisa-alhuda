/**
 * Instructor Dashboard — shows assigned subjects across all offerings.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { BookOpen, ArrowRight, Video } from "lucide-react";

export default async function InstructorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch subjects assigned to this instructor, with offering info
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("*, offering:offerings(id, title, slug, status, type)")
    .eq("instructor_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching subjects:", error);
  }

  // Count lessons per subject
  const subjectIds = subjects?.map((s) => s.id) || [];
  let lessonCounts: Record<string, number> = {};

  if (subjectIds.length > 0) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("subject_id")
      .in("subject_id", subjectIds);

    if (lessons) {
      lessonCounts = lessons.reduce(
        (acc, l) => {
          if (l.subject_id) {
            acc[l.subject_id] = (acc[l.subject_id] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const statusConfig = {
    draft: { label: "Draft", variant: "outline" as const },
    published: { label: "Published", variant: "default" as const },
    archived: { label: "Archived", variant: "secondary" as const },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Subjects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage lessons for your assigned subjects.
        </p>
      </div>

      {!subjects || subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No subjects assigned yet
            </p>
            <p className="text-sm text-muted-foreground">
              You&apos;ll see your subjects here once an admin assigns them to
              you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((subject: any) => {
            const offering = subject.offering;
            const offeringStatus =
              statusConfig[offering?.status as keyof typeof statusConfig] ||
              statusConfig.draft;
            const count = lessonCounts[subject.id] || 0;

            return (
              <Card key={subject.id} className="hover-lift">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant={offeringStatus.variant}>
                      {offeringStatus.label}
                    </Badge>
                  </div>

                  <h3 className="font-heading font-semibold text-lg mb-1">
                    {subject.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {offering?.title}
                  </p>

                  {subject.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {subject.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Video className="h-4 w-4" />
                      <span>
                        {count} {count === 1 ? "lesson" : "lessons"}
                      </span>
                    </div>
                    <LinkButton
                      size="sm"
                      href={`/dashboard/instructor/subjects/${subject.id}`}
                    >
                      Manage Lessons
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
