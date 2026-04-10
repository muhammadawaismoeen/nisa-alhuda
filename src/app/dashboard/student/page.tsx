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
} from "lucide-react";
import type { Offering } from "@/lib/types/database";

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Learning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access your enrolled programs, courses, and workshops.
        </p>
      </div>

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

                  <div className="pt-3 border-t">
                    <LinkButton
                      className="w-full press"
                      href={`/dashboard/student/offerings/${offering.id}`}
                    >
                      Continue Learning
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
