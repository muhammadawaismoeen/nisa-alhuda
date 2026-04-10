/**
 * Payment Ledger — pending manual bank transfer approvals with receipt lightbox.
 * Admin can view receipts in a full-screen lightbox, approve or reject.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/constants";
import { DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { PaymentActions } from "./payment-actions";

export default async function PaymentLedgerPage() {
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

  // Fetch all enrollments sorted: pending first, then by date
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "*, student:profiles!enrollments_student_id_fkey(full_name, phone), offering:offerings!enrollments_offering_id_fkey(title, price)"
    )
    .order("created_at", { ascending: false });

  const pending = (enrollments || []).filter((e) => e.status === "pending");
  const approved = (enrollments || []).filter((e) => e.status === "approved");
  const rejected = (enrollments || []).filter((e) => e.status === "rejected");

  // Revenue stats
  const totalRevenue = approved.reduce(
    (sum, e) => sum + (e.payment_amount || 0),
    0
  );
  const pendingAmount = pending.reduce(
    (sum, e) => sum + (e.payment_amount || 0),
    0
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payment Ledger</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review manual bank transfers and manage payment approvals.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approved.length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                Rs. {totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                Rs. {pendingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Pending Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Pending Approvals
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {pending.length}
            </Badge>
          </h2>

          <div className="space-y-3">
            {pending.map((enrollment: any) => (
              <Card
                key={enrollment.id}
                className="border-amber-200 dark:border-amber-800"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {enrollment.student?.full_name || "Unknown"}
                        </h3>
                        <Badge variant="outline" className="text-amber-600">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.offering?.title}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatPrice(enrollment.payment_amount)}
                        </span>
                        {enrollment.student?.phone && (
                          <span>{enrollment.student.phone}</span>
                        )}
                        <span>
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
                    <PaymentActions
                      enrollmentId={enrollment.id}
                      status={enrollment.status}
                      receiptPath={enrollment.payment_receipt_url}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* All Transactions */}
      <section>
        <h2 className="font-heading font-semibold text-lg mb-4">
          All Transactions ({(enrollments || []).length})
        </h2>

        {!enrollments || enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                No transactions yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">
                    Student
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">
                    Offering
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(enrollments || []).map((enrollment: any) => (
                  <tr key={enrollment.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">
                      {enrollment.student?.full_name || "Unknown"}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {enrollment.offering?.title}
                    </td>
                    <td className="py-3">
                      {formatPrice(enrollment.payment_amount)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(enrollment.created_at).toLocaleDateString(
                        "en-PK",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          enrollment.status === "approved"
                            ? "default"
                            : enrollment.status === "pending"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <PaymentActions
                        enrollmentId={enrollment.id}
                        status={enrollment.status}
                        receiptPath={enrollment.payment_receipt_url}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
