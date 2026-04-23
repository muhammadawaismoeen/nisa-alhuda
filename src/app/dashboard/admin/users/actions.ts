"use server";

/**
 * Admin Users Actions.
 *
 * Server actions for user management: multi-role assignment and password
 * reset. Kept on the server because:
 *   - Role writes need admin-client privileges to bypass RLS cleanly.
 *   - Password reset uses `admin.auth.admin.generateLink()` which only
 *     works with the service_role key.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendCredentialsEmail } from "@/lib/email";
import type { UserRole } from "@/lib/types/database";

const ALL_ROLES: readonly UserRole[] = [
  "student",
  "instructor",
  "treasurer",
  "admin",
] as const;

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

function isValidRole(r: string): r is UserRole {
  return (ALL_ROLES as readonly string[]).includes(r);
}

export interface UpdateUserRolesResult {
  success: boolean;
  error?: string;
}

/**
 * Replace a user's roles. `primaryRole` must be one of `roles` (it drives
 * which dashboard the user lands on after login). The DB trigger enforces
 * that primary is always present in roles[] — but we assert here too so
 * the UI gets a clean error instead of a cryptic constraint failure.
 */
export async function updateUserRoles(
  targetUserId: string,
  primaryRole: string,
  roles: string[]
): Promise<UpdateUserRolesResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!targetUserId) return { success: false, error: "Missing user id." };
  if (targetUserId === auth.user.id) {
    return {
      success: false,
      error: "You cannot change your own roles — ask another admin.",
    };
  }

  if (!isValidRole(primaryRole)) {
    return { success: false, error: `Invalid primary role: ${primaryRole}.` };
  }

  // Dedupe + validate the full set.
  const uniqueRoles = Array.from(new Set(roles));
  for (const r of uniqueRoles) {
    if (!isValidRole(r)) {
      return { success: false, error: `Invalid role: ${r}.` };
    }
  }
  if (!uniqueRoles.includes(primaryRole)) {
    uniqueRoles.push(primaryRole);
  }
  if (uniqueRoles.length === 0) {
    return { success: false, error: "At least one role is required." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: primaryRole, roles: uniqueRoles })
    .eq("id", targetUserId);

  if (error) {
    console.error("[updateUserRoles] DB error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export interface ResetUserPasswordResult {
  success: boolean;
  error?: string;
  /** True if we sent a fresh-account "invite" link; false if it was a password recovery. */
  isInvite?: boolean;
}

/**
 * Issue a password reset (or account-setup invite for guests) to any
 * registered user by id. The user receives a branded email with a single
 * magic link that lands on /reset-password.
 */
export async function resetUserPassword(
  targetUserId: string
): Promise<ResetUserPasswordResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!targetUserId) return { success: false, error: "Missing user id." };

  const admin = createAdminClient();

  // Look up the user's email + display name.
  const { data: authUser, error: authErr } =
    await admin.auth.admin.getUserById(targetUserId);
  if (authErr || !authUser?.user?.email) {
    return {
      success: false,
      error: authErr?.message || "User has no email on file.",
    };
  }
  const email = authUser.user.email;

  const { data: prof } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", targetUserId)
    .single();
  const name = prof?.full_name || "";

  // Admin-initiated resets always send a `recovery` link because the account
  // already exists (invites are for never-logged-in guests, covered by the
  // Credentials feature).
  // Route through /auth/callback so the PKCE code is exchanged for a
  // session BEFORE the user lands on /reset-password — otherwise the form
  // can't actually call updateUser({password}). This mirrors the
  // user-initiated /forgot-password flow.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.nisaalhuda.org";
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

  if (linkErr || !linkData?.properties?.action_link) {
    return {
      success: false,
      error: linkErr?.message || "Failed to generate reset link.",
    };
  }

  const emailResult = await sendCredentialsEmail(
    email,
    name,
    linkData.properties.action_link,
    false,
    undefined
  );
  if (!emailResult.ok) {
    return { success: false, error: emailResult.error };
  }

  return { success: true, isInvite: false };
}
