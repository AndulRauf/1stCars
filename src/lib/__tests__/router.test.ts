import { describe, it, expect } from "vitest";
import { slugify, unslugify, normalizeLabel, resolveCanonicalName, parseCurrentUrl } from "@/src/lib/router";
import { FAMOUS_BRANDS } from "@/src/data/cars";

describe("router brand slug round-trip", () => {
  it("slugifies and unslugifies simple names", () => {
    expect(slugify("Porsche")).toBe("porsche");
    expect(unslugify("porsche")).toBe("Porsche");
  });

  it("normalizeLabel treats case, spaces, and hyphens as equivalent", () => {
    expect(normalizeLabel("BMW")).toBe(normalizeLabel("bmw"));
    expect(normalizeLabel("Mercedes-Benz")).toBe(normalizeLabel("Mercedes Benz"));
    expect(normalizeLabel("MG")).toBe(normalizeLabel("mg"));
    expect(normalizeLabel("Maruti Suzuki")).toBe(normalizeLabel("maruti-suzuki"));
  });

  it("resolveCanonicalName maps slug-derived labels back to the catalog spelling", () => {
    expect(resolveCanonicalName("Bmw", FAMOUS_BRANDS)).toBe("BMW");
    expect(resolveCanonicalName("Mercedes Benz", FAMOUS_BRANDS)).toBe("Mercedes-Benz");
    expect(resolveCanonicalName("Mg", FAMOUS_BRANDS)).toBe("MG");
    expect(resolveCanonicalName("BMW", FAMOUS_BRANDS)).toBe("BMW");
    expect(resolveCanonicalName("Porsche", FAMOUS_BRANDS)).toBe("Porsche");
  });

  it("every famous brand slug round-trips back to its canonical name", () => {
    for (const brand of FAMOUS_BRANDS) {
      expect(resolveCanonicalName(unslugify(slugify(brand)), FAMOUS_BRANDS)).toBe(brand);
    }
  });

  it("unknown labels pass through unchanged", () => {
    expect(resolveCanonicalName("Not a Brand", FAMOUS_BRANDS)).toBe("Not a Brand");
    expect(resolveCanonicalName(undefined, FAMOUS_BRANDS)).toBeUndefined();
  });
});

describe("parseCurrentUrl unknown route fallback", () => {
  const stubWindow = (pathname: string, search = "") => {
    const original = (globalThis as any).window;
    (globalThis as any).window = {
      location: { pathname, search, href: `${pathname}${search}`, origin: "http://localhost" },
    };
    return () => {
      (globalThis as any).window = original;
    };
  };

  it("maps unrecognized top-level URLs to the homepage with `unknown`, and case-insensitively", () => {
    for (const bogus of ["/totally-bogus", "/garbage/foo", "/nope", "/404-not-real"]) {
      const restore = stubWindow(bogus);
      const route = parseCurrentUrl();
      restore();
      expect(route.view).toBe("home");
      expect(route.unknown).toBe(true);
    }
    const restore = stubWindow("/TOTALLY-BOGUS");
    expect(parseCurrentUrl().unknown).toBe(true);
    restore();
  });

  it("does not flag known routes as unknown", () => {
    const cases: Array<[string, string]> = [
      ["/", "home"],
      ["/home", "home"],
      ["/buy-cars", "buy_cars"],
      ["/buy/bmw", "buy_cars"],
      ["/faq", "faq"],
      ["/about-us", "about"],
      ["/sell-car", "sell_car"],
      ["/cars/abc-123", "car_details"],
      ["/page/faqs", "custom_page"],
      ["/certification", "firstmark_certification"],
      ["/careers", "careers"],
      ["/admin", "role_dashboards"],
      ["/404", "error_404"],
    ];
    for (const [path, view] of cases) {
      const restore = stubWindow(path);
      const route = parseCurrentUrl();
      restore();
      expect(route.view, path).toBe(view);
      expect(route.unknown, path).toBeUndefined();
    }
  });

  it("returns no phantom brand for the plain catalog paths", () => {
    // Regression: "/buy-cars" used to be parsed as a /buy/ segment, so stripping
    // the prefix left "-cars" -> unslugify -> " Cars", an impossible brand that
    // emptied the grid on every direct load / refresh.
    for (const path of ["/buy-cars", "/buy", "/buy-cars/", "/buy/"]) {
      const restore = stubWindow(path);
      const route = parseCurrentUrl();
      restore();
      expect(route.view, path).toBe("buy_cars");
      expect(route.brand, path).toBeUndefined();
      expect(route.model, path).toBeUndefined();
    }
  });

  it("keeps brand/model from deep /buy/ segment routes and query params", () => {
    const r1Restore = stubWindow("/buy/bmw");
    const r1 = parseCurrentUrl();
    r1Restore();
    expect(r1.view).toBe("buy_cars");
    expect(resolveCanonicalName(r1.brand, FAMOUS_BRANDS)).toBe("BMW");

    const r2Restore = stubWindow("/buy/bmw/3-series");
    const r2 = parseCurrentUrl();
    r2Restore();
    expect(r2.model).toBe("3 Series");

    const r3Restore = stubWindow("/buy-cars", "?brand=BMW&search=porsche");
    const r3 = parseCurrentUrl();
    r3Restore();
    expect(r3.brand).toBe("BMW");
    expect(r3.search).toBe("porsche");
  });
});