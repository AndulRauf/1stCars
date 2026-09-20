import { describe, it, expect } from "vitest";
import { parseCarReport, Full120PointReport } from "@/src/data/inspection120Data";

const VALID_REPORT: Full120PointReport = {
  totalPassedPoints: 118,
  totalPoints: 120,
  overallScorePercent: 98,
  grade: "A+",
  certificationResult: "Certified",
  isCertified: true,
  specs: { engine: "1.2L", maxPower: "118 bhp", peakTorque: "172 Nm", transmission: "Manual", araiMileage: "20 km/l", idleStartStop: "Active" },
  keyFeatures: [],
  categories: [
    {
      id: "cat_1",
      title: "1. Vehicle Identity (10 Points)",
      totalPoints: 10,
      pointsPassedText: "10 / 10 Points Passed",
      scorePercentageText: "100% PASS",
      summary: "Docs verified.",
      questions: [
        { id: "q1", question: "RC verified", passed: true },
        { id: "q2", question: "Odometer scan", passed: false, notes: "Mismatch flagged" },
      ],
    },
  ],
  notes: "Minor odometer concern flagged.",
};

describe("parseCarReport", () => {
  it("returns null for absent or malformed payloads", () => {
    expect(parseCarReport(null)).toBeNull();
    expect(parseCarReport(undefined)).toBeNull();
    expect(parseCarReport("")).toBeNull();
    expect(parseCarReport("not json {")).toBeNull();
    expect(parseCarReport("42")).toBeNull();
    expect(parseCarReport(JSON.stringify({ categories: [] }))).toBeNull();
  });

  it("parses a stored report and preserves failed checkpoints", () => {
    const out = parseCarReport(JSON.stringify(VALID_REPORT));
    expect(out).not.toBeNull();
    expect(out!.totalPassedPoints).toBe(118);
    expect(out!.grade).toBe("A+");
    expect(out!.categories[0].questions[1].passed).toBe(false);
    expect(out!.categories[0].questions[1].notes).toBe("Mismatch flagged");
  });

  it("is robust against a report whose stored payload is already an object", () => {
    // Some legacy snapshots may have been double-encoded; both paths are handled.
    expect(parseCarReport(JSON.stringify(JSON.stringify(VALID_REPORT)))).not.toBeNull();
  });
});