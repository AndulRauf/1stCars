import { describe, expect, it } from "vitest";
import { buildCarShareFullMessage, carShareLink, carSlug, toShareImageUrl } from "@/src/lib/carShare";

describe("carShare — WhatsApp preview image URLs", () => {
  it("routes .jpg Supabase originals through the JPEG proxy", () => {
    const out = toShareImageUrl(
      "https://xyz.supabase.co/storage/v1/object/public/car-images/cars/abc.jpg"
    );
    expect(out).toContain("/api/og-image?src=");
    expect(out).toContain(encodeURIComponent("https://xyz.supabase.co"));
  });

  it("routes WebP/extensionless Supabase originals through the JPEG proxy too", () => {
    const webp =
      "https://xyz.supabase.co/storage/v1/object/public/car-images/cars/photo.webp";
    expect(toShareImageUrl(webp)).toContain("/api/og-image?src=");
    const extless =
      "https://xyz.supabase.co/storage/v1/object/public/car-images/cars/abc123";
    expect(toShareImageUrl(extless)).toContain("/api/og-image?src=");
  });

  it("forces Unsplash demo photos to real JPEG bytes (fm=jpg 1200x630)", () => {
    const out = toShareImageUrl(
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"
    );
    expect(out).toContain("fm=jpg");
    expect(out).toContain("w=1200");
    expect(out).toContain("h=630");
  });

  it("share message carries the deep link exactly once (no word-twice duplication)", () => {
    const car: any = {
      id: "11111111-2222-3333-4444-555555555555",
      brand: "Hyundai",
      model: "Creta",
      year: 2021,
      price: 950000,
      fuel: "Petrol",
      transmission: "Automatic",
      mileage: 40000,
      location: "Surat",
    };
    const slug = carSlug(car);
    expect(slug).toMatch(/-11111111$/);
    const link = carShareLink(car);
    expect(link).toBe(`https://1stcars.in/cars/${slug}`);
    const full = buildCarShareFullMessage(car);
    const occurrences = full.split(link).length - 1;
    expect(occurrences).toBe(1);
  });
});
