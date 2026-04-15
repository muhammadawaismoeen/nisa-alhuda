/**
 * Monthly payment helpers — cycle math + amount lookup.
 *
 * Each monthly offering generates one billable cycle per calendar month,
 * keyed by the first day of the month as a `YYYY-MM-DD` string (UTC).
 * Students upload a receipt per cycle; admins/treasurers approve or
 * reject independently.
 */
import type { Enrollment, Offering } from "@/lib/types/database";

/** Returns the first day of the month the given date belongs to, as `YYYY-MM-DD`. */
export function firstOfMonth(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/** Human label for a cycle_month value — "April 2026". */
export function formatCycleMonth(cycleMonth: string): string {
  // Parse as UTC so the label doesn't flip across timezones
  const [y, m] = cycleMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Returns all cycle_month values between enrollment date and current month
 * (inclusive on both ends) so the student can see every cycle they owe.
 */
export function cyclesBetween(
  enrolledAt: string | Date,
  asOf: Date = new Date()
): string[] {
  const start = new Date(enrolledAt);
  const cycles: string[] = [];

  let year = start.getUTCFullYear();
  let month = start.getUTCMonth(); // 0-indexed

  const endYear = asOf.getUTCFullYear();
  const endMonth = asOf.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const mm = String(month + 1).padStart(2, "0");
    cycles.push(`${year}-${mm}-01`);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return cycles;
}

/**
 * Resolves the monthly fee for an enrollment. Uses whatever currency the
 * student paid in originally (PKR / INR / USD) so renewals match the
 * initial payment.
 */
export function monthlyAmountForEnrollment(
  offering: Pick<Offering, "price" | "price_inr" | "price_usd">,
  enrollment: Pick<Enrollment, "payment_currency">
): { amount: number; currency: "PKR" | "INR" | "USD" } {
  const currency = (enrollment.payment_currency || "PKR").toUpperCase() as
    | "PKR"
    | "INR"
    | "USD";

  if (currency === "USD" && offering.price_usd != null) {
    return { amount: offering.price_usd, currency };
  }
  if (currency === "INR" && offering.price_inr != null) {
    return { amount: offering.price_inr, currency };
  }
  return { amount: offering.price, currency: "PKR" };
}

/**
 * Produces a display label for the amount — "Rs. 3,000" / "₹1,500" / "$35".
 */
export function formatMonthlyAmount(amount: number, currency: string): string {
  const c = (currency || "PKR").toUpperCase();
  if (c === "USD") return `$${amount.toLocaleString()}`;
  if (c === "INR") return `₹${amount.toLocaleString()}`;
  return `Rs. ${amount.toLocaleString()}`;
}
