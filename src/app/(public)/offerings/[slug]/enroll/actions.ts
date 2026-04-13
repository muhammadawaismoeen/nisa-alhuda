"use server";

/**
 * Server Actions for the enrollment flow.
 *
 * Uses service_role (admin client) to:
 *   - Check if an email exists in auth.users (via SQL function)
 *   - Submit guest enrollments (bypass RLS)
 *   - Upload payment receipts for guests
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StudentDetails } from "@/lib/types/database";

// ─── Check Email ─────────────────────────────────────────

export interface CheckEmailResult {
  exists: boolean;
  firstName?: string;
}

export async function checkEmail(email: string): Promise<CheckEmailResult> {
  const admin = createAdminClient();

  // Efficient lookup via SQL function (joins auth.users + profiles)
  const { data, error } = await admin.rpc("get_profile_by_email", {
    lookup_email: email.toLowerCase().trim(),
  });

  if (error || !data || data.length === 0) {
    return { exists: false };
  }

  const firstName = (data[0].full_name || "").split(" ")[0];
  return { exists: true, firstName };
}

// ─── Check Existing Enrollment ───────────────────────────

export async function checkExistingEnrollment(
  email: string,
  offeringId: string
): Promise<{ exists: boolean; status?: string }> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("enrollments")
    .select("id, status")
    .eq("applicant_email", email.toLowerCase().trim())
    .eq("offering_id", offeringId)
    .single();

  if (!data) return { exists: false };
  return { exists: true, status: data.status };
}

// ─── Submit Guest Enrollment ─────────────────────────────

export interface SubmitEnrollmentInput {
  offeringId: string;
  email: string;
  details: StudentDetails;
  paymentAmount: number;
  /** Currency the student is paying in: 'PKR' | 'INR' | 'USD'. Defaults to PKR. */
  paymentCurrency?: "PKR" | "INR" | "USD";
  /** Base64-encoded file data for receipt (null for free offerings) */
  receiptBase64: string | null;
  receiptFileName: string | null;
  senderName: string | null;
  /** Previously uploaded receipt path — used on retry to skip re-upload */
  existingReceiptPath?: string | null;
  // Financial Assistance fields
  faRequested?: boolean;
  faReason?: string | null;
  faIncomeRange?: string | null;
  faOfferedAmount?: number | null;
}

export interface SubmitEnrollmentResult {
  success: boolean;
  error?: string;
  /** Returned on insert failure so client can retry without re-uploading */
  uploadedReceiptPath?: string;
}

export async function submitGuestEnrollment(
  input: SubmitEnrollmentInput
): Promise<SubmitEnrollmentResult> {
  const admin = createAdminClient();
  const email = input.email.toLowerCase().trim();

  // 1. Check for duplicate enrollment
  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("applicant_email", email)
    .eq("offering_id", input.offeringId)
    .single();

  if (existing) {
    return {
      success: false,
      error: "You have already applied for this offering. Please check your email for updates.",
    };
  }

  // 2. Check if email belongs to an existing user (auto-link)
  const { data: profileData } = await admin.rpc("get_profile_by_email", {
    lookup_email: email,
  });
  const existingUserId =
    profileData && profileData.length > 0 ? profileData[0].user_id : null;

  // 3. Upload receipt if provided (paid offering) — or reuse existing path on retry
  let receiptPath: string | null = input.existingReceiptPath || null;
  if (!receiptPath && input.receiptBase64 && input.receiptFileName) {
    const fileExt = input.receiptFileName.split(".").pop() || "jpg";
    const folder = existingUserId || "guest";
    receiptPath = `${folder}/${input.offeringId}-${Date.now()}.${fileExt}`;

    // Decode base64 to buffer
    const base64Data =
      input.receiptBase64.split(",").pop() || input.receiptBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const { error: uploadError } = await admin.storage
      .from("payment-receipts")
      .upload(receiptPath, buffer, {
        contentType: getMimeType(fileExt),
        upsert: false,
      });

    if (uploadError) {
      console.error("Receipt upload error:", uploadError);
      return {
        success: false,
        error: "Failed to upload payment receipt. Please try again.",
      };
    }
  }

  // 4. Insert enrollment
  const { error: insertError } = await admin.from("enrollments").insert({
    student_id: existingUserId,
    offering_id: input.offeringId,
    applicant_email: email,
    status: "pending",
    payment_receipt_url: receiptPath,
    payment_amount: input.paymentAmount,
    payment_currency: input.paymentCurrency || "PKR",
    payment_method: input.faRequested ? "financial_assistance" : receiptPath ? "bank_transfer" : "free",
    student_details: {
      ...input.details,
      sender_name: input.senderName || undefined,
    },
    // Financial Assistance fields
    fa_requested: input.faRequested || false,
    fa_reason: input.faReason || null,
    fa_income_range: input.faIncomeRange || null,
    fa_offered_amount: input.faOfferedAmount ?? null,
  });

  if (insertError) {
    console.error("Enrollment insert error:", insertError);
    // Keep the uploaded receipt — return path so client can retry without re-uploading
    return {
      success: false,
      error: "Failed to submit enrollment. Please try again.",
      uploadedReceiptPath: receiptPath || undefined,
    };
  }

  // 5. If existing user, update profile phone if empty
  if (existingUserId && input.details.phone) {
    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", existingUserId)
      .single();

    if (profile && !profile.phone) {
      await admin
        .from("profiles")
        .update({ phone: input.details.phone })
        .eq("id", existingUserId);
    }
  }

  return { success: true };
}

// ─── Submit Logged-In Enrollment ─────────────────────────

export async function submitLoggedInEnrollment(
  input: SubmitEnrollmentInput
): Promise<SubmitEnrollmentResult> {
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in for express enrollment.",
    };
  }

  const admin = createAdminClient();
  const email = user.email?.toLowerCase() || input.email.toLowerCase().trim();

  // Check for duplicate
  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("applicant_email", email)
    .eq("offering_id", input.offeringId)
    .single();

  if (existing) {
    return {
      success: false,
      error: "You have already applied for this offering.",
    };
  }

  // Upload receipt if provided — or reuse existing path on retry
  let receiptPath: string | null = input.existingReceiptPath || null;
  if (!receiptPath && input.receiptBase64 && input.receiptFileName) {
    const fileExt = input.receiptFileName.split(".").pop() || "jpg";
    receiptPath = `${user.id}/${input.offeringId}-${Date.now()}.${fileExt}`;

    const base64Data =
      input.receiptBase64.split(",").pop() || input.receiptBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const { error: uploadError } = await admin.storage
      .from("payment-receipts")
      .upload(receiptPath, buffer, {
        contentType: getMimeType(fileExt),
        upsert: false,
      });

    if (uploadError) {
      console.error("Receipt upload error:", uploadError);
      return {
        success: false,
        error: "Failed to upload payment receipt.",
      };
    }
  }

  // Insert enrollment with student_id
  const { error: insertError } = await admin.from("enrollments").insert({
    student_id: user.id,
    offering_id: input.offeringId,
    applicant_email: email,
    status: "pending",
    payment_receipt_url: receiptPath,
    payment_amount: input.paymentAmount,
    payment_currency: input.paymentCurrency || "PKR",
    payment_method: input.faRequested ? "financial_assistance" : receiptPath ? "bank_transfer" : "free",
    student_details: {
      ...input.details,
      sender_name: input.senderName || undefined,
    },
    // Financial Assistance fields
    fa_requested: input.faRequested || false,
    fa_reason: input.faReason || null,
    fa_income_range: input.faIncomeRange || null,
    fa_offered_amount: input.faOfferedAmount ?? null,
  });

  if (insertError) {
    console.error("Enrollment insert error:", insertError);
    return {
      success: false,
      error: "Failed to submit enrollment. Please try again.",
      uploadedReceiptPath: receiptPath || undefined,
    };
  }

  // Update profile phone if empty
  if (input.details.phone) {
    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (profile && !profile.phone) {
      await admin
        .from("profiles")
        .update({ phone: input.details.phone })
        .eq("id", user.id);
    }
  }

  return { success: true };
}

// ─── Helpers ─────────────────────────────────────────────

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
