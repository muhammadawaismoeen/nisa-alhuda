/**
 * Centralised enrollment query functions.
 *
 * Extracts the most-repeated Supabase queries from Server Actions into
 * typed, single-responsibility functions. Callers get consistent error
 * handling and field selection without duplicating the query shape.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enrollment, Offering } from "@/lib/types/database";

export type EnrollmentWithOffering = Enrollment & {
  offerings: Pick<
    Offering,
    "id" | "title" | "fee_type" | "price" | "price_inr" | "price_usd"
  > | null;
};

const ENROLLMENT_WITH_OFFERING_SELECT =
  "id, status, student_id, applicant_email, offering_id, student_details, " +
  "payment_currency, payment_method, payment_amount, payment_receipt_url, " +
  "fa_approved_amount, fa_requested, fa_reviewed_at, fa_decision_note, " +
  "rejection_reason, reviewed_by, reviewed_at, created_at, updated_at, " +
  "offerings(id, title, fee_type, price, price_inr, price_usd)";

/** Fetch a single enrollment joined with its offering. Returns null if not found. */
export async function getEnrollmentWithOffering(
  enrollmentId: string
): Promise<EnrollmentWithOffering | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enrollments")
    .select(ENROLLMENT_WITH_OFFERING_SELECT)
    .eq("id", enrollmentId)
    .single<EnrollmentWithOffering>();

  if (error || !data) return null;
  return data;
}

/** Fetch a lightweight enrollment row (no join). Returns null if not found. */
export async function getEnrollmentById(enrollmentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enrollments")
    .select(
      "id, status, student_id, applicant_email, offering_id, payment_receipt_url, " +
        "payment_currency, payment_method, fa_approved_amount, fa_requested, fa_reviewed_at"
    )
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as Pick<
    Enrollment,
    | "id"
    | "status"
    | "student_id"
    | "applicant_email"
    | "offering_id"
    | "payment_receipt_url"
    | "payment_currency"
    | "payment_method"
    | "fa_approved_amount"
    | "fa_requested"
    | "fa_reviewed_at"
  >;
}

/** Flip an enrollment to approved. Extra fields (e.g. fa_approved_amount) can be passed. */
export async function approveEnrollment(
  enrollmentId: string,
  reviewedBy: string,
  extra: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("enrollments")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", enrollmentId);

  return error ? { success: false, error: error.message } : { success: true };
}

/** Flip an enrollment to rejected with a reason. */
export async function rejectEnrollment(
  enrollmentId: string,
  reviewedBy: string,
  reason: string,
  extra: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("enrollments")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", enrollmentId);

  return error ? { success: false, error: error.message } : { success: true };
}
