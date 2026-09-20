import { describe, it, expect } from "vitest";
import { normalizeWebsiteSettings } from "@/src/lib/pageContentDefaults";

describe("normalizeWebsiteSettings — legacy brand/copy self-heal", () => {
  it("swaps the old 'Firstowner Cars' footer brand to the canonical 1stCars wordmark", () => {
    const out = normalizeWebsiteSettings({
      footerText: "© 2026 Firstowner Cars. All rights reserved.",
    });
    expect(out.footerText).toBe("© 2026 1stCars Marketplace. All rights reserved.");
  });

  it("replaces the legacy 'made for you … Verified kilometres' hero/brand copy", () => {
    const legacy = "Rigorous standards, made for you. 120-point inspected & certified cars\nSingle-owner • Accident-free • Verified kilometres";
    const out = normalizeWebsiteSettings({ heroSubtitle: legacy, brandDescription: legacy });
    const canonical = "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles — single-owner, accident-free, verified km.";
    expect(out.heroSubtitle).toBe(canonical);
    expect(out.brandDescription).toBe(canonical);
  });

  it("leaves genuine current copy alone", () => {
    const custom = "1stCars — my custom tagline";
    const out = normalizeWebsiteSettings({ heroSubtitle: custom });
    expect(out.heroSubtitle).toBe(custom);
  });
});