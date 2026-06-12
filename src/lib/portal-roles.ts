/**
 * Portal-role helpers — small predicates the admin UI uses to decide
 * who sees what. Centralises the "instructor sees admin screens but
 * not billing" rule from spec so JSX call sites stay readable.
 *
 * NOTE: these are purely UI-layer hints. RLS in migration 028 +
 * server-action role checks are the source of truth for what a user
 * can actually do. Never rely on these flags alone to gate a write.
 */
import type { UserRole } from "@/lib/types/database";

export type AdminPortalRole = "admin" | "instructor" | "treasurer";

/**
 * True when the viewer should be treated as "admin-equivalent" for
 * page access — admin or instructor. Treasurers are NOT included
 * here because they only get the payment ledger; they have their
 * own narrower scope handled in the admin layout.
 */
export function isAdminOrInstructor(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "instructor";
}

/**
 * True when financial UI must be hidden from this viewer. Currently
 * only instructors qualify — they share the admin screens but the
 * spec says "hide all financial fields" from them.
 *
 * Treasurers are NOT hidden because their entire scope IS finance.
 */
export function shouldHideFinance(
  role: UserRole | null | undefined
): boolean {
  return role === "instructor";
}

/**
 * True when this viewer is allowed into a billing/payment-bearing
 * route (the Payment Ledger and Billing Grid). Used by route guards.
 */
export function canAccessBilling(
  role: UserRole | null | undefined
): boolean {
  return role === "admin" || role === "treasurer";
}
