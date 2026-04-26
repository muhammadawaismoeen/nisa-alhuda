/**
 * Application-wide constants.
 * Centralized here so changes propagate everywhere automatically.
 */

export const APP_NAME = "Nisa Al-Huda";
export const APP_TAGLINE = "Women of Guidance";
export const APP_DESCRIPTION =
  "A digital learning ecosystem for the Sisterhood Islamic community. Explore programs, courses, and workshops in Fiqh, Arabic, Hadith, and Qur'an.";

export const CURRENCY = {
  code: "PKR",
  /**
   * Display prefix used everywhere a price is rendered. We use the ISO
   * code "PKR" rather than "Rs." because non-Pakistani sisters reading
   * the marketing copy didn't always recognise "Rs." (and "/mo" felt
   * cryptic) — "PKR 3,000 per month" is unambiguous globally.
   */
  symbol: "PKR",
  locale: "en-PK",
} as const;

/**
 * Format a price in PKR for display.
 * formatPrice(5000) → "PKR 5,000"
 * formatPrice(0)    → "Free"
 */
export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `${CURRENCY.symbol} ${amount.toLocaleString(CURRENCY.locale)}`;
}

/**
 * Format price with fee type suffix.
 * formatPriceWithFee(2000, "monthly")  → "PKR 2,000 per month"
 * formatPriceWithFee(5000, "one_time") → "PKR 5,000"
 */
export function formatPriceWithFee(amount: number, feeType: string): string {
  if (amount === 0) return "Free";
  const base = `${CURRENCY.symbol} ${amount.toLocaleString(CURRENCY.locale)}`;
  return feeType === "monthly" ? `${base} per month` : base;
}

/**
 * Format a paid amount using the currency the student actually paid in.
 * Used on admin dashboards where a single enrollment list mixes PKR / INR / USD payments.
 * formatPaidAmount(15, "USD")    → "USD 15"
 * formatPaidAmount(2000, "INR")  → "INR 2,000"
 * formatPaidAmount(5000, "PKR")  → "PKR 5,000"
 */
export function formatPaidAmount(
  amount: number,
  currency: string | null | undefined
): string {
  if (amount === 0) return "Free";
  const code = (currency || "PKR").toUpperCase();
  if (code === "USD") {
    return `USD ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  if (code === "INR") {
    return `INR ${amount.toLocaleString("en-IN")}`;
  }
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export const ROLES = {
  ADMIN: "admin",
  INSTRUCTOR: "instructor",
  STUDENT: "student",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const OFFERING_TYPES = {
  PROGRAM: "program",
  COURSE: "course",
  WORKSHOP: "workshop",
  CLASS: "class",
} as const;

export type OfferingType = (typeof OFFERING_TYPES)[keyof typeof OFFERING_TYPES];

export const OFFERING_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type OfferingStatus =
  (typeof OFFERING_STATUS)[keyof typeof OFFERING_STATUS];

export const ENROLLMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type EnrollmentStatus =
  (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];
