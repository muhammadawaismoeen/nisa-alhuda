/**
 * Monthly payment helpers — cycle math + amount lookup.
 *
 * Cycle model: each monthly cycle starts on the 27th and runs through the
 * 26th of the following month. Cycles are keyed by their start date as a
 * `YYYY-MM-DD` string (UTC), e.g. `2026-05-27` = "May 2026" cycle covering
 * 27 May → 26 Jun. The first billable cycle for the platform is May 2026;
 * nothing before `FIRST_BILLABLE_CYCLE` generates a row.
 */
import type { Enrollment, Offering } from "@/lib/types/database";

/** Day-of-month that a new cycle begins. */
export const CYCLE_START_DAY = 27;

/**
 * First cycle the system will ever generate. Anything earlier is ignored —
 * pre-launch enrollments simply don't owe retroactive renewals. If you need
 * to shift the launch date, change this constant and backfill existing rows.
 */
export const FIRST_BILLABLE_CYCLE = "2026-05-27";

/**
 * Returns the cycle-start date (27th) of the cycle that contains `date`.
 * If `date` is on/after the 27th of month M, the cycle starts M-27.
 * If `date` is before the 27th of month M, the cycle started (M-1)-27.
 *
 * Name kept for backward-compat with existing callers — despite the name it
 * no longer returns the 1st-of-month; it returns the 27th-based cycle key.
 */
export function firstOfMonth(date = new Date()): string {
  const d = new Date(date);
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth(); // 0-indexed
  if (d.getUTCDate() < CYCLE_START_DAY) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(CYCLE_START_DAY).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Human label for a cycle key.
 *
 * A cycle keyed as YYYY-MM-27 actually runs from MM/27 to (MM+1)/26 —
 * roughly 5 days in the start-month and 26 days in the following month.
 * Sisters naturally think of "the June fee" as the one they pay in late
 * May (for June classes), so we label cycles by the month most of the
 * cycle falls in — i.e. the month AFTER the cycle-start key.
 *
 * Examples:
 *   "2026-04-27" (Apr 27 → May 26) → "May 2026"
 *   "2026-05-27" (May 27 → June 26) → "June 2026"
 *   "2026-12-27" (Dec 27 → Jan 26)  → "January 2027"
 */
export function formatCycleMonth(cycleMonth: string): string {
  const [y, m] = cycleMonth.split("-").map(Number);
  // Add 1 month to the cycle-start month for the display label.
  // m is 1-indexed in the cycle key.
  let labelYear = y;
  let labelMonth = (m || 1) + 1; // → next month (still 1-indexed)
  if (labelMonth > 12) {
    labelMonth = 1;
    labelYear += 1;
  }
  // Parse as UTC so the label doesn't flip across timezones.
  const d = new Date(Date.UTC(labelYear, labelMonth - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Parses a YYYY-MM-DD cycle key into a UTC Date at midnight. */
function parseCycleKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || CYCLE_START_DAY));
}

/**
 * Returns all billable cycle keys between enrollment and today (inclusive).
 * Cycles earlier than `FIRST_BILLABLE_CYCLE` are skipped. If the enrollment
 * is new enough that even its own cycle hasn't started, returns an empty
 * array — student owes nothing yet.
 */
export function cyclesBetween(
  enrolledAt: string | Date,
  asOf: Date = new Date()
): string[] {
  const firstCycleDate = parseCycleKey(FIRST_BILLABLE_CYCLE);
  const enrolledDate = new Date(enrolledAt);
  // Start from whichever is later: platform launch, or the enrollment's own
  // first cycle (27th on/after their enrollment date).
  const enrolledCycleKey = firstOfMonth(
    enrolledDate.getUTCDate() >= CYCLE_START_DAY
      ? enrolledDate
      : // push to next month's 27th if they enrolled before the 27th
        new Date(
          Date.UTC(
            enrolledDate.getUTCFullYear(),
            enrolledDate.getUTCMonth(),
            CYCLE_START_DAY
          )
        )
  );
  const enrolledCycleDate = parseCycleKey(enrolledCycleKey);
  const startDate =
    enrolledCycleDate > firstCycleDate ? enrolledCycleDate : firstCycleDate;

  const currentCycleDate = parseCycleKey(firstOfMonth(asOf));
  if (startDate > currentCycleDate) return [];

  const cycles: string[] = [];
  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth();
  const endYear = currentCycleDate.getUTCFullYear();
  const endMonth = currentCycleDate.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(CYCLE_START_DAY).padStart(2, "0");
    cycles.push(`${year}-${mm}-${dd}`);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return cycles;
}

/**
 * Resolves the monthly fee for an enrollment, honoring Financial Assistance.
 *
 * Resolution order:
 *  1. If the enrollment has an FA-approved reduced amount (`fa_approved_amount`
 *     is not null), that wins. The value is stored as a currency-agnostic
 *     integer — its currency is always whatever `payment_currency` says,
 *     because admins are expected to enter the reduced amount in the same
 *     currency the student originally enrolled with.
 *  2. Otherwise fall back to the offering's full fee in the enrollment's
 *     `payment_currency` (PKR / INR / USD), so renewals match the initial
 *     payment.
 *
 * This covers all six student cases:
 *   PK full → price (PKR)        PK FA  → fa_approved_amount (PKR)
 *   IN full → price_inr (INR)    IN FA  → fa_approved_amount (INR)
 *   INT full → price_usd (USD)   INT FA → fa_approved_amount (USD)
 */
export function monthlyAmountForEnrollment(
  offering: Pick<Offering, "price" | "price_inr" | "price_usd">,
  enrollment: Pick<Enrollment, "payment_currency" | "fa_approved_amount">
): { amount: number; currency: "PKR" | "INR" | "USD" } {
  const currency = (enrollment.payment_currency || "PKR").toUpperCase() as
    | "PKR"
    | "INR"
    | "USD";

  // FA-approved reduced fee overrides the full price. Stored amount is in the
  // same currency as payment_currency (admin entered it in the student's
  // currency when approving the FA request).
  if (enrollment.fa_approved_amount != null) {
    return { amount: enrollment.fa_approved_amount, currency };
  }

  if (currency === "USD" && offering.price_usd != null) {
    return { amount: offering.price_usd, currency };
  }
  if (currency === "INR" && offering.price_inr != null) {
    return { amount: offering.price_inr, currency };
  }
  return { amount: offering.price, currency: "PKR" };
}

/**
 * Produces a display label for the amount — "PKR 3,000" / "₹1,500" / "$35".
 */
export function formatMonthlyAmount(amount: number, currency: string): string {
  const c = (currency || "PKR").toUpperCase();
  if (c === "USD") return `USD ${amount.toLocaleString()}`;
  if (c === "INR") return `INR ${amount.toLocaleString()}`;
  return `PKR ${amount.toLocaleString()}`;
}
