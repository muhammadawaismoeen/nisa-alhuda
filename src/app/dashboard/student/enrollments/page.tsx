/**
 * Student Enrollments Page — shows all enrollments with status tracking.
 * Covers pending, approved, and rejected enrollments.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import {
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import type { Offering } from "@/lib/types/database";

const statusConfig = {
  pending: {
    label: "Pending Review",
    variant: "outline" as const,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  approved: {
    label: "Approved",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/20",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/20",
  },
};

export default async function StudentEnrollmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, offering:offerings(*)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Enrollments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track the status of all your enrollments.
        </p>
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No enrollments yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Browse our catalog and enroll in a program or course.
            </p>
            <LinkButton href="/offerings">Browse Catalog</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment: any) => {
            const config =
              statusConfig[enrollment.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;
            const offering = enrollment.offering as Offering;

            return (
              <Card key={enrollment.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Status icon */}
                    <div
                      className={`h-12 w-12 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}
                    >
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {offering?.title}
                        </h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Enrolled on{" "}
                          {new Date(enrollment.created_at).toLocaleDateString(
                            "en-PK",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                        {enrollment.payment_amount > 0 && (
                          <span>
                            Rs.{" "}
                            {Number(enrollment.payment_amount).toLocaleString()}
                          </span>
                        )}
                        {offering?.type && (
                          <Badge variant="outline" className="text-xs">
                            {offering.type === "program"
                              ? "Program"
                              : offering.type === "course"
                                ? "Course"
                                : "Workshop"}
                          </Badge>
                        )}
                      </div>

                      {/* Rejection reason */}
                      {enrollment.status === "rejected" &&
                        enrollment.rejection_reason && (
                          <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-red-700 dark:text-red-300">
                                {enrollment.rejection_reason}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Review info */}
                      {enrollment.reviewed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reviewed on{" "}
                          {new Date(enrollment.reviewed_at).toLocaleDateString(
                            "en-PK",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {enrollment.status === "approved" ? (
                        <LinkButton
                          size="sm"
                          href={`/dashboard/student/offerings/${offering?.id}`}
                        >
                          Continue Learning
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </LinkButton>
                      ) : enrollment.status === "pending" ? (
                        <span className="text-xs text-muted-foreground italic">
                          Under review...
                        </span>
                      ) : (
                        <LinkButton
                          size="sm"
                          variant="outline"
                          href={`/offerings/${offering?.slug}/enroll`}
                        >
                          Re-apply
                        </LinkButton>
                      )}
                    </div>
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
