"use server";

/**
 * Admin Enrollment Server Actions.
 * Uses service_role to handle manual enrollment (needs auth.users email lookup).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function manualEnroll(
  studentId: string,
  offeringId: string,
  price: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Verify caller is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { success: false, error: "Not authorized." };

  // Get student's email from auth.users
  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(studentId);
  if (authError || !authUser?.user?.email) {
    return { success: false, error: "Could not find student email." };
  }

  // Insert enrollment with applicant_email
  const { error } = await admin.from("enrollments").insert({
    student_id: studentId,
    offering_id: offeringId,
    applicant_email: authUser.user.email.toLowerCase(),
    status: "approved",
    payment_receipt_url: null,
    payment_amount: price,
    payment_method: "manual",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Manual enrollment error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeEnrollment(
  studentId: string,
  offeringId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify caller is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { success: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("offering_id", offeringId);

  if (error) {
    console.error("Remove enrollment error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
