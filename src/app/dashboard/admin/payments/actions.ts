"use server";

/**
 * Admin Payment / Enrollment Approval Server Actions.
 *
 * The headline action is `approveEnrollmentWithCredentials` — used by both
 * the Payment Ledger and the Enrollments page Approve buttons. It:
 *
 *   1. Ensures the applicant has a Supabase auth account (creates one if
 *      it's a guest enrollment, otherwise updates the existing user).
 *   2. Sets the auth password to a single shared default
 *      (APPROVAL_DEFAULT_PASSWORD) so the sister can log in immediately.
 *   3. Links the enrollment row's student_id back to the auth user (for
 *      historical guest enrollments) and backfills profile.full_name.
 *   4. Flips the enrollment to status='approved'.
 *   5. Sends the sister a branded credentials email with her email +
 *      password + login link.
 *
 * Why service_role: we need admin.auth.admin.{listUsers,createUser,
 * updateUserById} to mutate auth.users, which the user's session can't
 * do directly through RLS.
 *
 * Auth: caller must be `admin` or `treasurer` (treasurer can approve
 * payments but not modify enrollments any other way — same access scope
 * as /dashboard/admin/payments).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendApprovalCredentialsEmail } from "@/lib/email";

/**
 * Awais (2026-05-13): every approved sister gets this exact password.
 * Single shared value keeps the onboarding email simple — sisters can
 * change it themselves once logged in.
 *
 * Kept unexported because in a "use server" module every export must be
 * an async function — exporting a const literal trips a Next.js build
 * error. Other "use server" callers go through
 * `provisionCredentialsForEnrollment` and never need the raw value.
 */
const APPROVAL_DEFAULT_PASSWORD = "nisaalhud@student#2026";

type AuthRole = "admin" | "treasurer";

async function requireAuth(
  allowed: AuthRole[]
): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !allowed.includes(profile.role as AuthRole)) {
    return { ok: false, error: "Not authorized." };
  }
  return { ok: true, userId: user.id };
}

/**
 * Page through admin.auth.admin.listUsers looking for an existing user
 * whose email matches `email` (case-insensitive). Returns undefined if
 * not found. We page because Supabase caps perPage at 1000.
 */
async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ id: string; email: string } | undefined> {
  const needle = email.toLowerCase().trim();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find(
      (u) => (u.email || "").toLowerCase() === needle
    );
    if (match) return { id: match.id, email: match.email || needle };
    if (data.users.length < 1000) return undefined;
    page += 1;
  }
}

interface ProvisionResult {
  success: boolean;
  error?: string;
  /** "created" → new auth user provisioned; "updated" → existing user reset. */
  mode?: "created" | "updated";
  /** True if the credentials email was successfully sent. */
  emailSent?: boolean;
}

/**
 * The shared provisioning engine. Does NOT touch enrollment.status —
 * callers are responsible for flipping the status (or not) according to
 * their own bookkeeping. Returns details the caller can surface to the
 * admin (mode, email delivery state).
 *
 * Pre-conditions: caller already verified auth.
 */
async function provisionCredentialsCore(
  admin: ReturnType<typeof createAdminClient>,
  enrollmentId: string
): Promise<ProvisionResult> {
  // Fetch the enrollment with the offering title we'll quote in the email.
  const { data: enrollment, error: fetchErr } = await admin
    .from("enrollments")
    .select(
      "id, status, student_id, applicant_email, offering_id, student_details, offerings(title)"
    )
    .eq("id", enrollmentId)
    .single();
  if (fetchErr || !enrollment) {
    return {
      success: false,
      error: fetchErr?.message || "Enrollment not found.",
    };
  }

  const offering = enrollment.offerings as unknown as { title: string } | null;
  const offeringTitle = offering?.title || "your course";

  // Recipient email: prefer the applicant_email recorded on the row,
  // fall back to the auth.users email for linked enrollments.
  let recipientEmail = (enrollment.applicant_email || "").toLowerCase().trim();
  if (!recipientEmail && enrollment.student_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(
      enrollment.student_id
    );
    recipientEmail = (authUser?.user?.email || "").toLowerCase().trim();
  }
  if (!recipientEmail) {
    return {
      success: false,
      error: "Enrollment has no email address — cannot send credentials.",
    };
  }

  // Best-effort name for the email greeting + profile backfill.
  let studentName = "";
  if (enrollment.student_id) {
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", enrollment.student_id)
      .single();
    studentName = prof?.full_name || "";
  }
  if (!studentName) {
    const d = (enrollment.student_details || {}) as {
      full_name?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
    };
    studentName =
      d.full_name ||
      d.name ||
      [d.first_name, d.last_name].filter(Boolean).join(" ").trim() ||
      "";
  }

  // ── Provision (or reset) the auth account ──
  let authUserId = enrollment.student_id || "";
  let mode: "created" | "updated" = "updated";

  if (!authUserId) {
    // Guest enrollment — may or may not already have an auth user under
    // this email (the sister might have signed up elsewhere on the site
    // before paying).
    const existing = await findAuthUserByEmail(admin, recipientEmail);
    if (existing) {
      authUserId = existing.id;
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: recipientEmail,
          password: APPROVAL_DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: studentName ? { full_name: studentName } : undefined,
        });
      if (createErr || !created?.user) {
        return {
          success: false,
          error: `Could not create account: ${createErr?.message || "unknown"}`,
        };
      }
      authUserId = created.user.id;
      mode = "created";
    }
  }

  // Reset password + confirm email for existing accounts. (Created
  // accounts above already received the password at construction time;
  // re-running for an existing user is the recovery path Awais asked
  // for so every approved sister gets the same shared password.)
  if (mode === "updated") {
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      authUserId,
      { password: APPROVAL_DEFAULT_PASSWORD, email_confirm: true }
    );
    if (updateErr) {
      return {
        success: false,
        error: `Could not set password: ${updateErr.message}`,
      };
    }
  }

  // ── Link the enrollment row to the auth user (guest enrollments) ──
  if (!enrollment.student_id) {
    const { error: linkErr } = await admin
      .from("enrollments")
      .update({ student_id: authUserId })
      .eq("id", enrollmentId);
    if (linkErr) console.warn("[Approve] Could not link student_id:", linkErr);
  }

  // ── Backfill profile.full_name if the row exists but is blank ──
  // handle_new_user trigger seeds a row on user creation, so by the time
  // we get here a profile should exist. Best-effort — don't fail
  // approval if this update bumps.
  if (studentName) {
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", authUserId)
      .maybeSingle();
    if (prof && !prof.full_name) {
      await admin
        .from("profiles")
        .update({ full_name: studentName })
        .eq("id", authUserId);
    }
  }

  // ── Send the credentials email ──
  const emailRes = await sendApprovalCredentialsEmail(
    recipientEmail,
    studentName,
    recipientEmail,
    APPROVAL_DEFAULT_PASSWORD,
    offeringTitle,
    enrollment.offering_id
  );

  return {
    success: true,
    mode,
    emailSent: emailRes.ok,
    error: emailRes.ok
      ? undefined
      : `Credentials set, but email failed: ${emailRes.error}`,
  };
}

/**
 * Full approval flow: provision credentials AND flip the enrollment to
 * `status='approved'`. Used by both the Payment-Ledger and Enrollments-
 * page Approve buttons.
 */
export async function approveEnrollmentWithCredentials(
  enrollmentId: string
): Promise<ProvisionResult> {
  const auth = await requireAuth(["admin", "treasurer"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();

  const provision = await provisionCredentialsCore(admin, enrollmentId);
  if (!provision.success) return provision;

  // Flip enrollment to approved AFTER credentials are set, so a failure
  // during provisioning leaves the enrollment pending (admin can retry).
  const { error: statusErr } = await admin
    .from("enrollments")
    .update({
      status: "approved",
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);
  if (statusErr) {
    return {
      success: false,
      error: `Credentials set but status update failed: ${statusErr.message}`,
    };
  }

  return provision;
}

/**
 * Provision-only sibling of approveEnrollmentWithCredentials —
 * ensure auth account + reset password + link student_id + email
 * credentials, WITHOUT flipping enrollment.status. Used by approval
 * paths (FA full-waiver, manual enrollment) that need to do their own
 * status bookkeeping but still want every approved sister to receive
 * her login credentials.
 */
export async function provisionCredentialsForEnrollment(
  enrollmentId: string
): Promise<ProvisionResult> {
  const auth = await requireAuth(["admin", "treasurer"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  return provisionCredentialsCore(admin, enrollmentId);
}

/**
 * Reject path mirror of approveEnrollmentWithCredentials — keeps the
 * client component free of direct DB writes (and of /api/email pings)
 * so both buttons go through one consistent service-role channel.
 */
export async function rejectEnrollment(
  enrollmentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAuth(["admin", "treasurer"]);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!reason?.trim()) {
    return { success: false, error: "Please provide a rejection reason." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("enrollments")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);
  if (error) return { success: false, error: error.message };

  return { success: true };
}
