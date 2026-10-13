import { describe, it, expect } from "vitest";
import {
  buildSellCarYearOptions, duplicateLeadKey, guardLookupYear,
  inspectionDateBounds, isInspectionDateInWindow, isValidKmDriven,
  isValidPincode, isValidSellCarMobile, kmValidationError, maskMobile,
  maskReg, parseKmDriven, validateOptionalEmail, validateSellCarReg
} from "@/src/lib/sellCarValidation";

describe("sellCarValidation — kilometres (P1)", () => {
  it("accepts a real odometer reading", () => {
    expect(isValidKmDriven("45200")).toBe(true);
    expect(parseKmDriven("45,200")).toBe(45200);
    expect(kmValidationError("45200")).toBeNull();
  });
  it("rejects empty, zero, non-numeric and out-of-range values", () => {
    expect(isValidKmDriven("")).toBe(false);
    expect(isValidKmDriven("0")).toBe(false);
    expect(isValidKmDriven("abc")).toBe(false);
    expect(isValidKmDriven("1000001")).toBe(false);
    expect(kmValidationError("")).toMatch(/actual kilometres/);
    expect(kmValidationError("0")).toMatch(/greater than 0/);
  });
});

describe("sellCarValidation — registration (P1)", () => {
  it("normalizes and validates Indian plates", () => {
    expect(validateSellCarReg("gj 01 ab 1234")).toEqual({ ok: true, normalized: "GJ01AB1234" });
    expect(validateSellCarReg("GJ01AB123").ok).toBe(false);
    expect(validateSellCarReg("").ok).toBe(false);
  });
});

describe("sellCarValidation — year options (P2)", () => {
  it("spans current year down to 2000", () => {
    const years = buildSellCarYearOptions(new Date("2026-10-12T00:00:00Z"));
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(2000);
  });
  it("guards lookup years into range", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    expect(guardLookupYear(9999, now)).toBeNull();
    expect(guardLookupYear(1999, now)).toBeNull();
    expect(guardLookupYear(2021, now)).toBe(2021);
  });
});

describe("sellCarValidation — contact + PII masking (P4/P5)", () => {
  it("validates mobiles, optional email and pincode", () => {
    expect(isValidSellCarMobile("9876543210")).toBe(true);
    expect(isValidSellCarMobile("5555555555")).toBe(false);
    expect(validateOptionalEmail("")).toBe(true);
    expect(validateOptionalEmail("buyer@example.com")).toBe(true);
    expect(validateOptionalEmail("not-an-email")).toBe(false);
    expect(validateOptionalEmail("98765@buyer.local")).toBe(false);
    expect(isValidPincode("394540")).toBe(true);
    expect(isValidPincode("039454")).toBe(false);
  });
  it("masks mobile and reg in UI summaries", () => {
    expect(maskMobile("9876543210")).toBe("XXXXXX3210");
    expect(maskReg("GJ01AB1234")).toBe("GJXXXX1234");
  });
  it("keeps inspection dates inside tomorrow..+14 days", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    const { min, max } = inspectionDateBounds(now);
    expect(min).toBe("2026-10-13");
    expect(max).toBe("2026-10-26");
    expect(isInspectionDateInWindow("2026-10-13", now)).toBe(true);
    expect(isInspectionDateInWindow("2026-10-12", now)).toBe(false);
    expect(isInspectionDateInWindow("2026-10-27", now)).toBe(false);
  });
  it("builds a stable duplicate-lead key", () => {
    expect(duplicateLeadKey({ mobile: "9876543210", brand: "Tata", model: "Nexon", reg: "gj01ab1234" }))
      .toBe(duplicateLeadKey({ mobile: " 9876543210 ", brand: "tata", model: "NEXON", reg: "GJ01AB1234" }));
  });
});
