import { describe, it, expect } from "vitest";
import {
  firstOfMonth,
  formatCycleMonth,
  cyclesBetween,
  monthlyAmountForEnrollment,
  FIRST_BILLABLE_CYCLE,
  CYCLE_START_DAY,
} from "@/lib/monthly-payments";

// ─── firstOfMonth ──────────────────────────────────────────────────

describe("firstOfMonth()", () => {
  it("on the 27th returns that date", () => {
    expect(firstOfMonth(new Date("2026-05-27T00:00:00Z"))).toBe("2026-05-27");
  });

  it("after the 27th returns the same month's 27th", () => {
    expect(firstOfMonth(new Date("2026-06-10T00:00:00Z"))).toBe("2026-05-27");
  });

  it("before the 27th returns the PREVIOUS month's 27th", () => {
    expect(firstOfMonth(new Date("2026-06-26T00:00:00Z"))).toBe("2026-05-27");
  });

  it("handles December→January year rollover", () => {
    expect(firstOfMonth(new Date("2026-01-10T00:00:00Z"))).toBe("2025-12-27");
  });

  it("on Jan 27 returns Jan 27 of same year", () => {
    expect(firstOfMonth(new Date("2026-01-27T00:00:00Z"))).toBe("2026-01-27");
  });
});

// ─── formatCycleMonth ──────────────────────────────────────────────

describe("formatCycleMonth()", () => {
  it("Apr-27 cycle shows as May 2026", () => {
    expect(formatCycleMonth("2026-04-27")).toBe("May 2026");
  });

  it("May-27 cycle shows as June 2026", () => {
    expect(formatCycleMonth("2026-05-27")).toBe("June 2026");
  });

  it("Dec-27 cycle rolls over to January of next year", () => {
    expect(formatCycleMonth("2026-12-27")).toBe("January 2027");
  });

  it("Nov-27 cycle shows as December", () => {
    expect(formatCycleMonth("2026-11-27")).toBe("December 2026");
  });
});

// ─── cyclesBetween ─────────────────────────────────────────────────

describe("cyclesBetween()", () => {
  it("returns empty array if enrollment is in the future", () => {
    const future = new Date("2099-01-01T00:00:00Z").toISOString();
    expect(cyclesBetween(future)).toHaveLength(0);
  });

  it("starts from FIRST_BILLABLE_CYCLE even for old enrollments", () => {
    const oldEnrollment = "2020-01-01T00:00:00Z";
    const asOf = new Date("2026-06-01T00:00:00Z");
    const cycles = cyclesBetween(oldEnrollment, asOf);
    expect(cycles[0]).toBe(FIRST_BILLABLE_CYCLE);
  });

  it("returns correct count for 2-month span", () => {
    const enrolled = "2026-05-27T00:00:00Z";
    const asOf = new Date("2026-07-01T00:00:00Z");
    const cycles = cyclesBetween(enrolled, asOf);
    expect(cycles).toEqual(["2026-05-27", "2026-06-27"]);
  });

  it("enrollment before 27th of month means first cycle is on the 27th", () => {
    // Enrolled May 10 → first cycle is May 27
    const enrolled = "2026-05-10T00:00:00Z";
    const asOf = new Date("2026-06-01T00:00:00Z");
    const cycles = cyclesBetween(enrolled, asOf);
    expect(cycles[0]).toBe("2026-05-27");
  });
});

// ─── monthlyAmountForEnrollment ────────────────────────────────────

const baseOffering = {
  price: 3000,
  price_inr: 1500,
  price_usd: 35,
};

describe("monthlyAmountForEnrollment()", () => {
  it("PKR student pays full PKR price", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "PKR",
      fa_approved_amount: null,
    });
    expect(result).toEqual({ amount: 3000, currency: "PKR" });
  });

  it("INR student pays INR price when set", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "INR",
      fa_approved_amount: null,
    });
    expect(result).toEqual({ amount: 1500, currency: "INR" });
  });

  it("USD student pays USD price when set", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "USD",
      fa_approved_amount: null,
    });
    expect(result).toEqual({ amount: 35, currency: "USD" });
  });

  it("FA overrides full price — PKR partial waiver", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "PKR",
      fa_approved_amount: 1000,
    });
    expect(result).toEqual({ amount: 1000, currency: "PKR" });
  });

  it("FA = 0 means full waiver (amount is 0)", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "PKR",
      fa_approved_amount: 0,
    });
    expect(result).toEqual({ amount: 0, currency: "PKR" });
  });

  it("USD student with FA pays reduced USD amount", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "USD",
      fa_approved_amount: 15,
    });
    expect(result).toEqual({ amount: 15, currency: "USD" });
  });

  it("falls back to PKR price when INR price is null", () => {
    const noInr = { ...baseOffering, price_inr: null };
    const result = monthlyAmountForEnrollment(noInr, {
      payment_currency: "INR",
      fa_approved_amount: null,
    });
    expect(result).toEqual({ amount: 3000, currency: "PKR" });
  });

  it("currency string is case-insensitive", () => {
    const result = monthlyAmountForEnrollment(baseOffering, {
      payment_currency: "usd",
      fa_approved_amount: null,
    });
    expect(result).toEqual({ amount: 35, currency: "USD" });
  });
});

// ─── Constants ─────────────────────────────────────────────────────

describe("CYCLE_START_DAY", () => {
  it("is 27", () => expect(CYCLE_START_DAY).toBe(27));
});

describe("FIRST_BILLABLE_CYCLE", () => {
  it("is 2026-05-27", () => expect(FIRST_BILLABLE_CYCLE).toBe("2026-05-27"));
});
