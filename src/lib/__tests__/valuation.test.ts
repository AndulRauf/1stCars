import { describe, it, expect } from "vitest";
import { estimateCarValue } from "../valuation";

describe("estimateCarValue", () => {
  it("returns a deterministic, sane number for a typical car", () => {
    const v = estimateCarValue("Mercedes", 2021, 40000);
    expect(v).toBeGreaterThan(50000);
    expect(v).toBeLessThan(3500000);
    expect(estimateCarValue("Mercedes", 2021, 40000)).toBe(v);
  });

  it("penalizes older age and higher mileage", () => {
    const newer = estimateCarValue("BMW", 2022, 10000);
    const older = estimateCarValue("BMW", 2016, 90000);
    expect(older).toBeLessThan(newer);
  });

  it("never falls below the floor", () => {
    expect(estimateCarValue("Tata", 2005, 999999)).toBeGreaterThanOrEqual(50000);
  });

  it("is more generous for luxury anchors than default brands", () => {
    const lux = estimateCarValue("Porsche", 2020, 30000);
    const mass = estimateCarValue("Maruti Suzuki", 2020, 30000);
    expect(lux).toBeGreaterThan(mass);
  });

  it("handles garbage input without crashing", () => {
    expect(estimateCarValue("", 0, NaN)).toBeGreaterThanOrEqual(50000);
    expect(estimateCarValue(undefined as any, null as any, null as any)).toBeGreaterThanOrEqual(50000);
  });
});
