/**
 * Next.js Proxy (formerly "middleware") — runs on EVERY request before it
 * hits a page. We use it to refresh the Supabase auth session, protect
 * routes, and forward the current pathname to server components via a
 * custom `x-pathname` header so they can implement path-aware logic
 * (e.g. the admin layout needs to know if a treasurer is on the payments
 * page vs. some other admin page).
 *
 * Renamed from `middleware.ts` in Next.js 16 — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 */
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
