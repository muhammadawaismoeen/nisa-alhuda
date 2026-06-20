/**
 * Centralised auth helpers for Server Actions.
 *
 * Before this file, every actions.ts file had its own copy of the same
 * "get user → check profile role → return ok/error" pattern — five
 * implementations across five files, each with slightly different field
 * names. Any change (e.g. adding a suspension check) had to be applied
 * in five places, and often wasn't.
 *
 * Now there's one place. Change it once, it applies everywhere.
 */
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export type AuthOk = { ok: true; userId: string; email: string | undefined };
export type AuthFail = { ok: false; error: string };
export type AuthResult = AuthOk | AuthFail;

export type RoleAuthOk = { ok: true; userId: string; role: UserRole };
export type RoleAuthResult = RoleAuthOk | AuthFail;

/**
 * Verify the caller is authenticated (any role).
 * Returns userId + email so ownership checks can use the email without
 * a second DB round-trip.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  return { ok: true, userId: user.id, email: user.email };
}

/**
 * Verify the caller is authenticated AND holds one of the `allowed` roles.
 * Checks the primary `role` column — enough for all current RLS policies.
 *
 * Usage:
 *   const auth = await requireRole(["admin", "treasurer"]);
 *   if (!auth.ok) return { success: false, error: auth.error };
 *   // auth.userId, auth.role are now available
 */
export async function requireRole(
  allowed: UserRole[]
): Promise<RoleAuthResult> {
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

  if (!profile || !allowed.includes(profile.role as UserRole)) {
    return { ok: false, error: "Not authorized." };
  }

  return { ok: true, userId: user.id, role: profile.role as UserRole };
}
