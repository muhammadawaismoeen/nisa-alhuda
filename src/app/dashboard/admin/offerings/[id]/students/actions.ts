"use server";

/**
 * Per-offering manual enrollment actions.
 *
 * The global admin Enrollments page already has a "Manual Enroll" dialog, but
 * it only accepts users who already have a profile. This action handles both
 * cases from the course roster page, in one step:
 *
 *   1. Email belongs to an existing user → create an approved enrollment
 *      linked to that user's `student_id`.
 *   2. Email is new → create a guest enrollment (`student_id = NULL`) with
 *      the provided name stashed into `student_details.full_name`. The admin
 *      can then use the Credentials page (or tick the invite checkbox here)
 *      to send a welcome link.
 *
 * Optional `sendInvite` flag triggers the same admin-invite flow used by the
 * Credentials page — a Supabase magic link routed through `/auth/callback`
 * that lands on `/reset-password`.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendCredentialsEmail, sendEnrollmentApprovedEmail } from "@/lib/email";

interface EnrollResult {
  success: boolean;
  error?: string;
  /** True if we created a brand-new guest enrollment (no auth account yet). */
  isGuest?: boolean;
  /** True if a welcome/credentials email went out. */
  emailSent?: boolean;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Not authorized." };
  }
  return { ok: true as const, user };
}

export async function enrollByEmail(
  offeringId: string,
  rawEmail: string,
  fullName: string,
  sendInvite: boolean
): Promise<EnrollResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const email = (rawEmail || "").toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email." };
  }

  const admin = createAdminClient();

  // Fetch offering for price + title + fee type (used by the approval email).
  const { data: offering, error: offErr } = await admin
    .from("offerings")
    .select("id, title, price, fee_type")
    .eq("id", offeringId)
    .single();
  if (offErr || !offering) {
    return { success: false, error: "Offering not found." };
  }

  // Resolve whether this email already has an auth account. Using the same
  // RPC the Credentials flow relies on so behavior stays consistent.
  const { data: profByEmail } = await admin.rpc("get_profile_by_email", {
    lookup_email: email,
  });
  const existing = profByEmail && profByEmail.length > 0 ? profByEmail[0] : null;
  const studentId: string | null = existing?.id || null;
  const resolvedName =
    (fullName || "").trim() || existing?.full_name || "";

  // Reject if this email is already on the roster for this offering (the
  // `(applicant_email, offering_id)` unique index would catch it, but the
  // admin gets a friendlier message this way).
  const { data: dupe } = await admin
    .from("enrollments")
    .select("id, status")
    .eq("offering_id", offeringId)
    .eq("applicant_email", email)
    .maybeSingle();
  if (dupe) {
    return {
      success: false,
      error: `${email} already has an enrollment on this offering (status: ${dupe.status}).`,
    };
  }

  // Build the minimum viable student_details payload so the roster table can
  // show a name immediately. first_name/last_name are inferred from the
  // single "full name" admin input — better than leaving the card blank.
  const parts = resolvedName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");

  const insertPayload = {
    student_id: studentId,
    offering_id: offeringId,
    applicant_email: email,
    status: "approved" as const,
    payment_amount: offering.price,
    payment_method: "manual",
    payment_currency: "PKR",
    payment_receipt_url: null,
    student_details: resolvedName
      ? {
          first_name: firstName,
          last_name: lastName,
          full_name: resolvedName,
          phone: "",
          city: "",
          age: "",
          education_level: "",
          referral_source: "admin_manual",
          message: "",
        }
      : null,
    reviewed_by: auth.user.id,
    reviewed_at: new Date().toISOString(),
  };

  const { error: insErr } = await admin
    .from("enrollments")
    .insert(insertPayload);
  if (insErr) {
    console.error("[enrollByEmail] insert error:", insErr);
    return { success: false, error: insErr.message };
  }

  let emailSent = false;

  if (sendInvite) {
    // Route through /auth/callback so the PKCE code exchanges BEFORE landing
    // on /reset-password. Mirrors the Credentials flow.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.nisaalhuda.org";
    const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

    const linkType: "recovery" | "invite" = studentId ? "recovery" : "invite";
    const linkOptions: {
      redirectTo: string;
      data?: Record<string, unknown>;
    } = { redirectTo };
    if (!studentId && resolvedName) {
      // Seed user_metadata so the new-user trigger doesn't default to "User".
      linkOptions.data = { full_name: resolvedName };
    }

    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: linkType,
        email,
        options: linkOptions,
      });

    if (!linkErr && linkData?.properties?.action_link) {
      // Brand-new auth user: link them back to the enrollment row + backfill
      // profile name (covers races where the trigger already ran).
      if (!studentId && linkData.user?.id) {
        await admin
          .from("enrollments")
          .update({ student_id: linkData.user.id })
          .eq("offering_id", offeringId)
          .eq("applicant_email", email);
        if (resolvedName) {
          await admin
            .from("profiles")
            .update({ full_name: resolvedName })
            .eq("id", linkData.user.id);
        }
      }

      const res = await sendCredentialsEmail(
        email,
        resolvedName,
        linkData.properties.action_link,
        !studentId,
        offering.title
      );
      emailSent = res.ok;
    }
  } else if (studentId) {
    // Existing user, no invite requested — still send the standard
    // enrollment-approved email so they know they have access.
    sendEnrollmentApprovedEmail(
      email,
      resolvedName,
      offering.title,
      offeringId
    ).catch(() => {});
    emailSent = true;
  }

  return { success: true, isGuest: !studentId, emailSent };
}
