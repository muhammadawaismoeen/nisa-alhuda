/**
 * Admin layout guard — ensures only admin users can access /dashboard/admin/* pages.
 *
 * Treasurers are a special case: they need access to /dashboard/admin/payments
 * only, so they can process the payment queue. The page itself does its own
 * role check — this layout just has to not block them.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Admins get full access; treasurers only for /dashboard/admin/payments.
  if (profile?.role === "admin") {
    return <>{children}</>;
  }

  if (profile?.role === "treasurer") {
    // Read the current path from middleware-forwarded headers (x-pathname)
    // with fallback to referrer. If the treasurer is on payments, let them
    // through; otherwise bounce to the payments page (their only admin area).
    const h = await headers();
    const pathname = h.get("x-pathname") || h.get("x-invoke-path") || "";
    if (pathname.startsWith("/dashboard/admin/payments")) {
      return <>{children}</>;
    }
    redirect("/dashboard/admin/payments");
  }

  redirect("/dashboard");
}
