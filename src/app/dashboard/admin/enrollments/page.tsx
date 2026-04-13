/**
 * Enrollment Management — admin view with manual enroll/remove capabilities.
 * Shows all enrollments (including guest) with email, student details, and actions.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPaidAmount } from "@/lib/constants";
import { ClipboardList, Mail, HeartHandshake } from "lucide-react";
import { EnrollmentActions } from "./enrollment-actions";
import { ManualEnrollment } from "./manual-enrollment";
import { FaActions } from "./fa-actions";
import type { StudentDetails } from "@/lib/types/database";

const statusConfig = {
  pending: { label: "Pending", variant: "outline" as const },
  approved: { label: "Approved", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

export default async function AdminEnrollmentsPage() {
  const supabase = await createClient();

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

  // Fetch all enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "*, student:profiles!enrollments_student_id_fkey(*), offering:offerings!enrollments_offering_id_fkey(*)"
    )
    .order("created_at", { ascending: false });

  // Fetch data for manual enrollment form
  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "student")
    .order("full_name");

  const { data: offerings } = await supabase
    .from("offerings")
    .select("id, title, price, status")
    .in("status", ["published", "draft"])
    .order("title");

  // Split enrollments: Pending FA reviews come first in their own section
  const pendingFaEnrollments = (enrollments || []).filter(
    (e: any) =>
      e.fa_requested &&
      e.fa_approved_amount === null &&
      e.status === "pending"
  );
  const regularEnrollments = (enrollments || []).filter(
    (e: any) => !(e.fa_requested && e.fa_approved_amount === null && e.status === "pending")
  );

  const pendingCount =
    regularEnrollments.filter((e: any) => e.status === "pending").length;
  const pendingFaCount = pendingFaEnrollments.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Enrollments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage enrollments. Manually add or remove students.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {pendingFaCount > 0 && (
            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
              <HeartHandshake className="h-3 w-3 mr-1" />
              {pendingFaCount} FA pending
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline" className="border-primary text-primary">
              {pendingCount} pending
            </Badge>
          )}
          <ManualEnrollment
            students={(students || []).map((s: any) => ({
              id: s.id,
              full_name: s.full_name,
            }))}
            offerings={(offerings || []).map((o: any) => ({
              id: o.id,
              title: o.title,
              price: o.price,
            }))}
            existingEnrollments={(enrollments || []).map((e: any) => ({
              studentId: e.student_id,
              offeringId: e.offering_id,
            }))}
          />
        </div>
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No enrollments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ─── Financial Assistance Pending Section ─── */}
          {pendingFaEnrollments.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <HeartHandshake className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold">
                  Financial Assistance Requests
                </h2>
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                  {pendingFaEnrollments.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {pendingFaEnrollments.map((enrollment: any) => {
                  const details = enrollment.student_details as StudentDetails | null;
                  const applicantName =
                    details?.first_name || details?.last_name
                      ? `${details?.first_name || ""} ${details?.last_name || ""}`.trim()
                      : enrollment.student?.full_name || enrollment.applicant_email || "Unknown";
                  const isGuest = !enrollment.student_id;

                  return (
                    <Card key={enrollment.id} className="border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold truncate">{applicantName}</h3>
                              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                                <HeartHandshake className="h-3 w-3 mr-1" />
                                FA Pending
                              </Badge>
                              {isGuest && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:text-amber-400">
                                  Guest
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {enrollment.offering?.title || "Unknown Offering"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {enrollment.applicant_email}
                              </span>
                              <span>
                                Original: {formatPaidAmount(enrollment.offering?.price || 0, "PKR")}
                              </span>
                              <span className="text-amber-700 dark:text-amber-400 font-medium">
                                Offered: {enrollment.fa_offered_amount}
                              </span>
                              {details?.phone && <span>{details.phone}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <FaActions
                              enrollmentId={enrollment.id}
                              faReason={enrollment.fa_reason}
                              faIncomeRange={enrollment.fa_income_range}
                              faOfferedAmount={enrollment.fa_offered_amount}
                              originalPrice={enrollment.offering?.price || 0}
                              applicantName={applicantName}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Regular Enrollments Section ─── */}
          {regularEnrollments.length > 0 && (
            <section>
              {pendingFaEnrollments.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">All Enrollments</h2>
                </div>
              )}
              <div className="space-y-3">
                {regularEnrollments.map((enrollment: any) => {
                  const config =
                    statusConfig[enrollment.status as keyof typeof statusConfig];
                  const details = enrollment.student_details as StudentDetails | null;
                  const applicantName =
                    details?.first_name || details?.last_name
                      ? `${details?.first_name || ""} ${details?.last_name || ""}`.trim()
                      : enrollment.student?.full_name || enrollment.applicant_email || "Unknown";
                  const isGuest = !enrollment.student_id;
                  const isFaApproved =
                    enrollment.fa_requested &&
                    enrollment.fa_approved_amount !== null;

                  return (
                    <Card
                      key={enrollment.id}
                      className={
                        enrollment.status === "pending" ? "border-primary/30" : ""
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold truncate">
                                {applicantName}
                              </h3>
                              <Badge variant={config.variant}>{config.label}</Badge>
                              {isFaApproved && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:text-amber-400">
                                  <HeartHandshake className="h-2.5 w-2.5 mr-0.5" />
                                  FA {enrollment.fa_approved_amount === 0 ? "Waived" : "Approved"}
                                </Badge>
                              )}
                              {isGuest && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:text-amber-400">
                                  Guest
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {enrollment.offering?.title || "Unknown Offering"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {enrollment.applicant_email}
                              </span>
                              {enrollment.payment_amount > 0 && (
                                <span>
                                  {formatPaidAmount(
                                    enrollment.payment_amount,
                                    enrollment.payment_currency
                                  )}
                                </span>
                              )}
                              {enrollment.payment_amount === 0 && (
                                <span className="text-green-600 font-medium">
                                  {isFaApproved ? "Fully Waived" : "Free"}
                                </span>
                              )}
                              {details?.phone && <span>{details.phone}</span>}
                              <span>
                                {new Date(enrollment.created_at).toLocaleDateString(
                                  "en-PK",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <EnrollmentActions
                              enrollmentId={enrollment.id}
                              status={enrollment.status}
                              receiptPath={enrollment.payment_receipt_url}
                            />
                          </div>
                        </div>

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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
