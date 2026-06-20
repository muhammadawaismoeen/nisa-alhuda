"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Clears the must_change_password flag on the caller's own profile.
 * Called by PasswordForm immediately after supabase.auth.updateUser() succeeds.
 *
 * Using the user's own session (not service role) — RLS allows each user to
 * update their own profile row, so no elevated privileges are needed here.
 */
export async function clearMustChangePassword(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  return error
    ? { success: false, error: error.message }
    : { success: true };
}
