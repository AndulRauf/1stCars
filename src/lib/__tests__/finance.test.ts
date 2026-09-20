import { describe, it, expect } from "vitest";
import { calculateEmi, calculateListingEmi, LISTING_EMI_APR_PERCENT, LISTING_EMI_TERM_MONTHS, LISTING_EMI_DOWN_PAYMENT_RATIO } from "@/src/lib/finance";

describe("calculateEmi — standard amortising-loan formula", () => {
  it("computes the textbook EMI for a known case", () => {
    // ₹1,00,000 at 10% annual over 12 months → ≈ ₹8,792 / month
    expect(calculateEmi(100000, 10, 12)).toBeCloseTo(8792);
  });

  it("falls back to a flat split when the interest rate is zero", () => {
    expect(calculateEmi(120000, 0, 12)).toBe(10000);
  });

  it("guards against invalid inputs", () => {
    expect(calculateEmi(-5000, 5.49, 60)).toBe(0);
    expect(calculateEmi(100000, 5.49, 0)).toBe(0);
    expect(calculateEmi(0, 5.49, 60)).toBe(0);
  });
});

describe("calculateListingEmi — site-wide listing assumption", () => {
  it("is exactly the 20%-down / 5.49% / 60-month case of calculateEmi", () => {
    const price = 241000;
    const principal = price * (1 - LISTING_EMI_DOWN_PAYMENT_RATIO);
    expect(calculateListingEmi(price)).toBe(
      calculateEmi(principal, LISTING_EMI_APR_PERCENT, LISTING_EMI_TERM_MONTHS)
    );
  });

  it("computes a sane monthly figure for a mid-price used car", () => {
    const emi = calculateListingEmi(241000); // ₹2.41L car
    expect(emi).toBeGreaterThan(0);
    // Lower than the naive zero-interest price/60 split (₹4,016), since only
    // 80% is financed — and within a plausible EMI band for a 5-year loan.
    expect(emi).toBeLessThan(Math.round(241000 / 60));
    expect(emi).toBeGreaterThan(Math.round(241000 / 72));
  });

  it("guards against non-positive prices", () => {
    expect(calculateListingEmi(0)).toBe(0);
    expect(calculateListingEmi(-100)).toBe(0);
  });
});