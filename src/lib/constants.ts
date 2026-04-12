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
  symbol: "Rs.",
  locale: "en-PK",
} as const;

/**
 * Format a price in PKR for display.
 * formatPrice(5000) → "Rs. 5,000"
 * formatPrice(0)    → "Free"
 */
export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `${CURRENCY.symbol} ${amount.toLocaleString(CURRENCY.locale)}`;
}

/**
 * Format price with fee type suffix.
 * formatPriceWithFee(2000, "monthly") → "Rs. 2,000/mo"
 * formatPriceWithFee(5000, "one_time") → "Rs. 5,000"
 */
export function formatPriceWithFee(amount: number, feeType: string): string {
  if (amount === 0) return "Free";
  const base = `${CURRENCY.symbol} ${amount.toLocaleString(CURRENCY.locale)}`;
  return feeType === "monthly" ? `${base}/mo` : base;
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
