/**
 * Enrollment Management — admin view with manual enroll/remove capabilities.
 * Shows all enrollments (including guest) with email, student details, and actions.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusKey } from "@/components/ui/status-badge";
import { formatPaidAmount } from "@/lib/constants";
import { ClipboardList, Mail, HeartHandshake, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EnrollmentActions } from "./enrollment-actions";
import { ManualEnrollment } from "./manual-enrollment";
import { FaActions } from "./fa-actions";
import type { StudentDetails } from "@/lib/types/database";

/**
 * Returns the offering's full fee in the same currency the student enrolled
 * with. Mirrors the routing used by `monthlyAmountForEnrollment` for non-FA
 * enrollments: USD → price_usd, INR → price_inr, else PKR. Falls back to the
 * PKR price when the requested column is null.
 */
function originalFeeInCurrency(
  offering: {
    price?: number | null;
    price_inr?: number | null;
    price_usd?: number | null;
  } | null,
  currency: string | null | undefined
): number {
  if (!offering) return 0;
  const c = (currency || "PKR").toUpperCase();
  if (c === "USD" && offering.price_usd != null) return offering.price_usd;
  if (c === "INR" && offering.price_inr != null) return offering.price_inr;
  return offering.price || 0;
}

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

  if (profile?.role !== "admin" && profile?.role !== "instructor") {
    return (
      <div className="text-center py-20">
        <p className="text-destructive font-medium">Access denied.</p>
      </div>
    );
  }
  const role = profile.role as "admin" | "instructor";
  const hideFinance = role === "instructor";

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
      <PageHeader
        icon={GraduationCap}
        title="Enrollments"
        subtitle="Manage enrollments. Manually add or remove students."
        actions={
          <>
            {!hideFinance && pendingFaCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-700 dark:text-amber-400"
              >
                <HeartHandshake className="h-3 w-3 mr-1" />
                {pendingFaCount} FA pending
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-primary text-primary">
                {pendingCount} pending
              </Badge>
            )}
            {!hideFinance && (
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
            )}
          </>
        }
      />

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
          {/* Hidden from instructors — FA decisions involve setting an */}
          {/* approved-amount, which is a financial action reserved for admin. */}
          {!hideFinance && pendingFaEnrollments.length > 0 && (
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
                              <StatusBadge status="fa-pending" />
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
                              {/* Original fee rendered in student's enrolled
                                  currency — uses the offering's matching price
                                  column (price / price_inr / price_usd) */}
                              <span>
                                Original:{" "}
                                {formatPaidAmount(
                                  originalFeeInCurrency(
                                    enrollment.offering,
                                    enrollment.payment_currency
                                  ),
                                  enrollment.payment_currency || "PKR"
                                )}
                              </span>
                              <span className="text-amber-700 dark:text-amber-400 font-medium">
                                Offered:{" "}
                                {enrollment.fa_offered_amount != null
                                  ? formatPaidAmount(
                                      enrollment.fa_offered_amount,
                                      enrollment.payment_currency || "PKR"
                                    )
                                  : "—"}
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
                              originalPrice={originalFeeInCurrency(
                                enrollment.offering,
                                enrollment.payment_currency
                              )}
                              paymentCurrency={
                                (enrollment.payment_currency || "PKR") as
                                  | "PKR"
                                  | "INR"
                                  | "USD"
                              }
                              applicantName={applicantName}
                            />
                            <EnrollmentActions
                              enrollmentId={enrollment.id}
                              status={enrollment.status}
                              receiptPath={enrollment.payment_receipt_url}
                              mode="delete-only"
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
                              <StatusBadge status={enrollment.status as StatusKey} />
                              {!hideFinance && isFaApproved && (
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
                              {!hideFinance && enrollment.payment_amount > 0 && (
                                <span>
                                  {formatPaidAmount(
                                    enrollment.payment_amount,
                                    enrollment.payment_currency
                                  )}
                                </span>
                              )}
                              {!hideFinance &&
                                enrollment.payment_amount === 0 &&
                                enrollment.payment_method === "manual_approval" && (
                                  <span className="text-muted-foreground font-medium">
                                    Manual
                                  </span>
                                )}
                              {!hideFinance &&
                                enrollment.payment_amount === 0 &&
                                enrollment.payment_method !== "manual_approval" && (
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
                              hideFinance={hideFinance}
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
