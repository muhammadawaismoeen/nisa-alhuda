/**
 * Admin Enrollments Page — review and approve/reject student enrollments.
 * Server Component that fetches all enrollments with student & offering details.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/constants";
import { ClipboardList } from "lucide-react";
import { EnrollmentActions } from "./enrollment-actions";

const statusConfig = {
  pending: { label: "Pending", variant: "outline" as const },
  approved: { label: "Approved", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

export default async function AdminEnrollmentsPage() {
  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <p className="text-destructive font-medium">Access denied.</p>
      </div>
    );
  }

  // Fetch all enrollments with student and offering details
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("*, student:profiles!enrollments_student_id_fkey(*), offering:offerings(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching enrollments:", error);
  }

  const pendingCount =
    enrollments?.filter((e) => e.status === "pending").length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Enrollments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage student enrollments.
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="border-primary text-primary">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No enrollments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment: any) => {
            const config =
              statusConfig[enrollment.status as keyof typeof statusConfig];
            return (
              <Card
                key={enrollment.id}
                className={
                  enrollment.status === "pending" ? "border-primary/30" : ""
                }
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Student & Offering Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {enrollment.student_details?.full_name ||
                            enrollment.student?.full_name ||
                            "Unknown Student"}
                        </h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {enrollment.offering?.title || "Unknown Offering"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>
                          Amount: {formatPrice(enrollment.payment_amount)}
                        </span>
                        {enrollment.student_details?.phone && (
                          <span>Phone: {enrollment.student_details.phone}</span>
                        )}
                        {enrollment.student_details?.city && (
                          <span>City: {enrollment.student_details.city}</span>
                        )}
                        <span>
                          Submitted:{" "}
                          {new Date(enrollment.created_at).toLocaleDateString(
                            "en-PK",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <EnrollmentActions
                        enrollmentId={enrollment.id}
                        status={enrollment.status}
                        receiptPath={enrollment.payment_receipt_url}
                      />
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {enrollment.status === "rejected" &&
                    enrollment.rejection_reason && (
                      <div className="mt-3 p-3 rounded-lg bg-destructive/5 text-sm text-destructive">
                        <strong>Reason:</strong> {enrollment.rejection_reason}
                      </div>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
