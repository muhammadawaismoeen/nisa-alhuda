/**
 * Auth helpers — small utilities used across the dashboard to determine
 * who's looking at a page and what they should be allowed to see.
 *
 * The instructor screens (`/dashboard/instructor/*`) are now shared between
 * instructors (scoped to their own subjects) and admins (unrestricted view
 * of every instructor's subjects). RLS already permits admins on every
 * relevant table; this helper just toggles the application-layer
 * `instructor_id` filter so admins don't get accidentally narrowed.
 */
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export interface DashboardViewer {
  userId: string;
  fullName: string;
  role: UserRole;
  isAdmin: boolean;
  /**
   * The instructor_id to filter dashboard queries by. `null` means
   * "don't filter" — used for admins viewing all instructors' data.
   */
  instructorScope: string | null;
}

/**
 * Resolves the current logged-in user + the scope they should see in
 * instructor-style screens. Returns null if no user is logged in (caller
 * should redirect to /login or render nothing).
 */
export async function getDashboardViewer(): Promise<DashboardViewer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single<{ full_name: string; role: UserRole }>();

  const role = profile?.role ?? "student";
  const isAdmin = role === "admin";

  return {
    userId: user.id,
    fullName: profile?.full_name ?? "",
    role,
    isAdmin,
    // Admins see every instructor's data; instructors only their own.
    instructorScope: isAdmin ? null : user.id,
  };
}
