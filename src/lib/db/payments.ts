/**
 * Centralised monthly payment query functions.
 *
 * Wraps the most-repeated monthly_payments queries so callers get typed
 * results and consistent error handling without duplicating the select shape.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { firstOfMonth } from "@/lib/monthly-payments";

export type MonthlyPaymentStatus = "owed" | "pending" | "approved" | "rejected";

export type MonthlyPaymentRow = {
  id: string;
  enrollment_id: string;
  student_id: string;
  offering_id: string;
  cycle_month: string;
  amount: number;
  currency: "PKR" | "INR" | "USD";
  payment_method: string | null;
  receipt_url: string | null;
  status: MonthlyPaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

const PAYMENT_SELECT =
  "id, enrollment_id, student_id, offering_id, cycle_month, amount, currency, " +
  "payment_method, receipt_url, status, reviewed_by, reviewed_at, " +
  "rejection_reason, reminded_at, created_at, updated_at";

/** Fetch all payments for a student (all cycles, all offerings). */
export async function getPaymentsForStudent(
  studentId: string
): Promise<MonthlyPaymentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("monthly_payments")
    .select(PAYMENT_SELECT)
    .eq("student_id", studentId)
    .order("cycle_month", { ascending: false });

  return (data ?? []) as unknown as MonthlyPaymentRow[];
}

/** Fetch the current-cycle payment for a specific enrollment. Returns null if not found. */
export async function getCurrentCyclePayment(
  enrollmentId: string
): Promise<MonthlyPaymentRow | null> {
  const admin = createAdminClient();
  const cycle = firstOfMonth();

  const { data } = await admin
    .from("monthly_payments")
    .select(PAYMENT_SELECT)
    .eq("enrollment_id", enrollmentId)
    .eq("cycle_month", cycle)
    .maybeSingle();

  return (data as MonthlyPaymentRow | null) ?? null;
}

/** Fetch a single payment by ID. Returns null if not found. */
export async function getPaymentById(
  paymentId: string
): Promise<MonthlyPaymentRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("monthly_payments")
    .select(PAYMENT_SELECT)
    .eq("id", paymentId)
    .single<MonthlyPaymentRow>();

  return data ?? null;
}

/** Fetch all owed/pending payments across all students (admin ledger). */
export async function getPendingPayments(): Promise<MonthlyPaymentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("monthly_payments")
    .select(PAYMENT_SELECT)
    .in("status", ["owed", "pending"])
    .order("cycle_month", { ascending: false });

  return (data ?? []) as unknown as MonthlyPaymentRow[];
}

/** Approve a monthly payment. */
export async function approvePayment(
  paymentId: string,
  reviewedBy: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("monthly_payments")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  return error ? { success: false, error: error.message } : { success: true };
}

/** Reject a monthly payment with a reason. */
export async function rejectPayment(
  paymentId: string,
  reviewedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("monthly_payments")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  return error ? { success: false, error: error.message } : { success: true };
}
