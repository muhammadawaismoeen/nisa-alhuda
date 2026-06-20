"use server";

/**
 * Student Enrollments Server Actions.
 * - uploadFaReceipt: student uploads receipt for partial FA approval.
 *   After upload, the enrollment remains "pending" (admin must still verify the receipt)
 *   but gets the receipt URL + payment_method="bank_transfer" set so it shows up
 *   in the admin pending queue.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/db/auth";

export interface UploadFaReceiptInput {
  enrollmentId: string;
  /** Base64-encoded receipt */
  receiptBase64: string;
  receiptFileName: string;
  senderName: string;
}

export async function uploadFaReceipt(
  input: UploadFaReceiptInput
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();

  // Fetch the enrollment to verify ownership and FA approval status
  const { data: enrollment, error: fetchError } = await admin
    .from("enrollments")
    .select("id, student_id, applicant_email, offering_id, fa_requested, fa_approved_amount, status, student_details")
    .eq("id", input.enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    return { success: false, error: "Enrollment not found." };
  }

  // Must belong to this user (match student_id or applicant_email)
  const belongsToUser =
    enrollment.student_id === auth.userId ||
    enrollment.applicant_email?.toLowerCase() === auth.email?.toLowerCase();
  if (!belongsToUser) {
    return { success: false, error: "Not authorized." };
  }

  // Must be an FA-approved (partial waiver) enrollment still pending
  if (
    !enrollment.fa_requested ||
    enrollment.fa_approved_amount === null ||
    enrollment.fa_approved_amount <= 0 ||
    enrollment.status !== "pending"
  ) {
    return {
      success: false,
      error: "This enrollment is not awaiting FA receipt upload.",
    };
  }

  if (!input.receiptBase64 || !input.receiptFileName) {
    return { success: false, error: "Receipt file is required." };
  }

  const fileExt = input.receiptFileName.split(".").pop() || "jpg";
  const folder = auth.userId;
  const receiptPath = `${folder}/${enrollment.offering_id}-fa-${Date.now()}.${fileExt}`;

  const base64Data = input.receiptBase64.split(",").pop() || input.receiptBase64;
  const buffer = Buffer.from(base64Data, "base64");

  const { error: uploadError } = await admin.storage
    .from("payment-receipts")
    .upload(receiptPath, buffer, {
      contentType: getMimeType(fileExt),
      upsert: false,
    });

  if (uploadError) {
    console.error("FA receipt upload error:", uploadError);
    return { success: false, error: "Failed to upload receipt. Please try again." };
  }

  // Update enrollment: attach receipt, set payment_method.
  // Keep status="pending" so admin can still verify receipt before final approval.
  const existingDetails = (enrollment.student_details || {}) as Record<string, unknown>;
  const { error: updateError } = await admin
    .from("enrollments")
    .update({
      payment_receipt_url: receiptPath,
      payment_method: "bank_transfer",
      student_details: {
        ...existingDetails,
        sender_name: input.senderName || existingDetails.sender_name || null,
      },
    })
    .eq("id", input.enrollmentId);

  if (updateError) {
    console.error("FA receipt update error:", updateError);
    return {
      success: false,
      error: "Uploaded receipt but failed to update enrollment. Contact support.",
    };
  }

  return { success: true };
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
