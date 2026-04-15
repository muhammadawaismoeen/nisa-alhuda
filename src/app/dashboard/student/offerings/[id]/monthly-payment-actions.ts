"use server";

/**
 * Monthly payment server actions for enrolled students.
 * Students upload a receipt per calendar month; admins/treasurers approve.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstOfMonth, monthlyAmountForEnrollment } from "@/lib/monthly-payments";
import type { Enrollment, Offering } from "@/lib/types/database";

export interface SubmitMonthlyPaymentInput {
  enrollmentId: string;
  /** Target cycle — defaults to current month if omitted. */
  cycleMonth?: string;
  /** Base64-encoded receipt file. */
  receiptBase64: string;
  receiptFileName: string;
}

export interface SubmitMonthlyPaymentResult {
  success: boolean;
  error?: string;
  monthlyPaymentId?: string;
}

export async function submitMonthlyPayment(
  input: SubmitMonthlyPaymentInput
): Promise<SubmitMonthlyPaymentResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated." };

  // Pull the enrollment + offering so we can verify ownership, compute the
  // amount, and ensure it's a monthly-fee offering.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      "id, student_id, offering_id, status, payment_currency, offering:offerings!enrollments_offering_id_fkey(id, price, price_inr, price_usd, fee_type, title)"
    )
    .eq("id", input.enrollmentId)
    .single<
      Enrollment & {
        offering: Pick<
          Offering,
          "id" | "price" | "price_inr" | "price_usd" | "fee_type" | "title"
        >;
      }
    >();

  if (!enrollment || enrollment.student_id !== user.id) {
    return { success: false, error: "Enrollment not found." };
  }
  if (enrollment.status !== "approved") {
    return {
      success: false,
      error: "Only approved enrollments can submit monthly payments.",
    };
  }
  if (enrollment.offering.fee_type !== "monthly") {
    return {
      success: false,
      error: "This offering is not a monthly subscription.",
    };
  }

  const cycleMonth = input.cycleMonth || firstOfMonth();
  const { amount, currency } = monthlyAmountForEnrollment(
    enrollment.offering,
    enrollment
  );

  const admin = createAdminClient();

  // Upload the receipt — reuse the payment-receipts bucket, namespace by
  // user + enrollment + cycle so it's easy to trace.
  const fileExt = input.receiptFileName.split(".").pop() || "jpg";
  const receiptPath = `${user.id}/monthly/${enrollment.id}-${cycleMonth}-${Date.now()}.${fileExt}`;

  const base64Data =
    input.receiptBase64.split(",").pop() || input.receiptBase64;
  const buffer = Buffer.from(base64Data, "base64");

  const { error: uploadError } = await admin.storage
    .from("payment-receipts")
    .upload(receiptPath, buffer, {
      contentType: mimeFor(fileExt),
      upsert: false,
    });

  if (uploadError) {
    console.error("Monthly receipt upload error:", uploadError);
    return {
      success: false,
      error: "Failed to upload receipt. Please try again.",
    };
  }

  // Upsert the monthly_payments row — if the student is replacing an older
  // pending receipt for the same cycle we want to keep a single row rather
  // than stacking up duplicates.
  const { data: existing } = await admin
    .from("monthly_payments")
    .select("id, status")
    .eq("enrollment_id", enrollment.id)
    .eq("cycle_month", cycleMonth)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "pending") {
      return {
        success: false,
        error:
          existing.status === "approved"
            ? "This cycle is already approved."
            : "This cycle was rejected — please contact admin before re-submitting.",
      };
    }

    const { error: updateError } = await admin
      .from("monthly_payments")
      .update({
        receipt_url: receiptPath,
        amount,
        currency,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Monthly payment update error:", updateError);
      return { success: false, error: "Failed to update receipt." };
    }

    return { success: true, monthlyPaymentId: existing.id };
  }

  const { data: inserted, error: insertError } = await admin
    .from("monthly_payments")
    .insert({
      enrollment_id: enrollment.id,
      student_id: user.id,
      offering_id: enrollment.offering_id,
      cycle_month: cycleMonth,
      amount,
      currency,
      payment_method: "bank_transfer",
      receipt_url: receiptPath,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Monthly payment insert error:", insertError);
    return { success: false, error: "Failed to record monthly payment." };
  }

  return { success: true, monthlyPaymentId: inserted?.id };
}

function mimeFor(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
