"use server";

/**
 * Admin Credentials Actions.
 *
 * Lets an admin send password setup / reset emails to enrolled students,
 * scoped by course. For guest enrollments (no auth account yet) this issues
 * an "invite" link that provisions the account on click; for existing users
 * it issues a "recovery" (password reset) link.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/db/auth";
import { sendCredentialsEmail } from "@/lib/email";

export interface StudentCredentialRow {
  /** Stable identifier for this row — enrollment id (works for guests + linked). */
  enrollmentId: string;
  /** auth user id if the enrollment is linked, else null. */
  studentId: string | null;
  name: string;
  email: string;
  /** true if a Supabase auth account already exists for this email. */
  hasAccount: boolean;
  enrollmentStatus: string;
}


export async function getStudentsForOffering(
  offeringId: string
): Promise<{ success: boolean; error?: string; students?: StudentCredentialRow[] }> {
  // Credentials send is a teaching-adjacent admin action — instructors
  // get to use it too (they debug access for their own students most often).
  const auth = await requireRole(["admin", "instructor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();

  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select("id, student_id, applicant_email, status, student_details, created_at")
    .eq("offering_id", offeringId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStudentsForOffering error:", error);
    return { success: false, error: error.message };
  }

  if (!enrollments?.length) return { success: true, students: [] };

  const rows: StudentCredentialRow[] = [];
  const seenEmails = new Set<string>();

  for (const e of enrollments) {
    const email = (e.applicant_email || "").toLowerCase().trim();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);

    // Prefer profile name for linked users; fall back to student_details name.
    let name = "";
    let hasAccount = !!e.student_id;

    if (e.student_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", e.student_id)
        .single();
      name = prof?.full_name || "";
    }

    if (!name) {
      const details = (e.student_details || {}) as {
        full_name?: string;
        name?: string;
        first_name?: string;
        last_name?: string;
      };
      name =
        details.full_name ||
        details.name ||
        [details.first_name, details.last_name].filter(Boolean).join(" ").trim() ||
        "";
    }

    // For guest enrollments, double-check by email — the email may belong to
    // an existing account that just hasn't been linked back to the row yet.
    if (!hasAccount) {
      const { data: profByEmail } = await admin.rpc("get_profile_by_email", {
        lookup_email: email,
      });
      if (profByEmail && profByEmail.length > 0) {
        hasAccount = true;
        if (!name) name = profByEmail[0].full_name || "";
      }
    }

    rows.push({
      enrollmentId: e.id,
      studentId: e.student_id,
      name,
      email,
      hasAccount,
      enrollmentStatus: e.status,
    });
  }

  return { success: true, students: rows };
}

export interface SendCredentialsResult {
  success: boolean;
  error?: string;
  sent: number;
  failed: Array<{ email: string; error: string }>;
}

export async function sendCredentials(
  offeringId: string,
  emails: string[]
): Promise<SendCredentialsResult> {
  // Credentials send is a teaching-adjacent admin action — instructors
  // get to use it too (they debug access for their own students most often).
  const auth = await requireRole(["admin", "instructor"]);
  if (!auth.ok) {
    return { success: false, error: auth.error, sent: 0, failed: [] };
  }

  if (!emails?.length) {
    return { success: false, error: "No students selected.", sent: 0, failed: [] };
  }

  const admin = createAdminClient();

  // Fetch offering title for the email body.
  const { data: offering } = await admin
    .from("offerings")
    .select("title")
    .eq("id", offeringId)
    .single();
  const offeringTitle = offering?.title || undefined;

  // Route through /auth/callback so the PKCE code is exchanged for a
  // session BEFORE the user lands on /reset-password. Sending them
  // straight to /reset-password leaves the form without a session and
  // updateUser({password}) silently fails. Mirrors the pattern used by
  // the user-initiated /forgot-password flow.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.nisaalhuda.org";
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

  const sentOk: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const rawEmail of emails) {
    const email = rawEmail.toLowerCase().trim();
    if (!email) continue;

    try {
      // Does this email already have an auth account?
      const { data: profByEmail } = await admin.rpc("get_profile_by_email", {
        lookup_email: email,
      });
      const hasAccount = !!(profByEmail && profByEmail.length > 0);

      // Pull enrollment-side name for the greeting (best effort).
      let name = "";
      if (hasAccount) {
        name = profByEmail![0].full_name || "";
      }
      if (!name) {
        const { data: enr } = await admin
          .from("enrollments")
          .select("student_details")
          .eq("offering_id", offeringId)
          .eq("applicant_email", email)
          .maybeSingle();
        const d = (enr?.student_details || {}) as {
          full_name?: string;
          name?: string;
          first_name?: string;
          last_name?: string;
        };
        name =
          d.full_name ||
          d.name ||
          [d.first_name, d.last_name].filter(Boolean).join(" ").trim() ||
          "";
      }

      // Generate the appropriate action link. For invites we seed
      // user_metadata.full_name from the enrollment so the `handle_new_user`
      // trigger stops defaulting to the literal string "User".
      const linkType: "recovery" | "invite" = hasAccount ? "recovery" : "invite";
      const linkOptions: { redirectTo: string; data?: Record<string, unknown> } =
        { redirectTo };
      if (!hasAccount && name) {
        linkOptions.data = { full_name: name };
      }
      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: linkType,
          email,
          options: linkOptions,
        });

      if (linkErr || !linkData?.properties?.action_link) {
        failed.push({
          email,
          error: linkErr?.message || "Failed to generate link.",
        });
        continue;
      }

      const actionLink = linkData.properties.action_link;

      // If we just invited a brand-new user, link their new auth id back to
      // the matching enrollment so future logins land on their course, and
      // backfill their profile name (the trigger already ran with whatever
      // user_metadata we seeded above, but we still patch any row that was
      // created before this fix landed — i.e. existing "User User" rows).
      if (!hasAccount && linkData.user?.id) {
        await admin
          .from("enrollments")
          .update({ student_id: linkData.user.id })
          .eq("offering_id", offeringId)
          .eq("applicant_email", email)
          .is("student_id", null);

        if (name) {
          await admin
            .from("profiles")
            .update({ full_name: name })
            .eq("id", linkData.user.id);
        }
      }

      const emailResult = await sendCredentialsEmail(
        email,
        name,
        actionLink,
        !hasAccount,
        offeringTitle
      );
      if (!emailResult.ok) {
        failed.push({ email, error: emailResult.error });
        continue;
      }
      sentOk.push(email);
    } catch (err) {
      console.error("[Credentials] Failed for", rawEmail, err);
      failed.push({
        email,
        error: err instanceof Error ? err.message : "Unknown error.",
      });
    }
  }

  return {
    success: sentOk.length > 0,
    sent: sentOk.length,
    failed,
    error:
      sentOk.length === 0 && failed.length > 0
        ? "All sends failed. See details."
        : undefined,
  };
}
