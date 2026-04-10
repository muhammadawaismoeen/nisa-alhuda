/**
 * Student Dashboard — shows enrolled offerings and their status.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle } from "lucide-react";
import type { EnrollmentWithDetails } from "@/lib/types/database";

const statusConfig = {
  pending: { label: "Pending Review", variant: "outline" as const, icon: Clock },
  approved: { label: "Enrolled", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: Clock },
};

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, offering:offerings(*)")
    .eq("student_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Learning</h1>

      {!enrollments || enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No enrollments yet
            </p>
            <p className="text-sm text-muted-foreground">
              Browse our catalog to find programs and courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map((enrollment: any) => {
            const config = statusConfig[enrollment.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            return (
              <Card key={enrollment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {enrollment.offering?.title}
                    </CardTitle>
                    <Badge variant={config.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {enrollment.offering?.short_description ||
                      enrollment.offering?.description?.slice(0, 120)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Enrolled on{" "}
                    {new Date(enrollment.created_at).toLocaleDateString("en-PK")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
