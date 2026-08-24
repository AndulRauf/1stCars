// Single source of truth for the instant car valuation estimate.
//
// The estimate is a transparent heuristic (brand class anchor + age/km
// depreciation) meant to give sellers an instant ballpark figure before the
// on-site 120-point inspection. It is deliberately conservative and is NOT a
// buy-back commitment.

const BRAND_ANCHORS: Record<string, number> = {
  porsche: 9000000,
  ferrari: 9000000,
  lamborghini: 9000000,
  bentley: 9000000,
  rolls: 9000000,
  mercedes: 3500000,
  "mercedes-benz": 3500000,
  bmw: 3500000,
  audi: 3500000,
  jaguar: 3500000,
  lexus: 3500000,
  volvo: 2200000,
  land: 2200000,
  tesla: 2500000
};

export function estimateCarValue(brand: string, year: number, kmDriven: number): number {
  const brandKey = String(brand || "").toLowerCase().trim();
  const baseValue = BRAND_ANCHORS[brandKey] || 1800000;

  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - (Number(year) || currentYear));
  const ageDepreciation = Math.max(0.1, 1 - age * 0.08);
  const mileageDepreciation = Math.max(0.2, 1 - (Number(kmDriven) || 0) * 0.000005);

  const value = Math.round(baseValue * ageDepreciation * mileageDepreciation);
  return Math.max(50000, value);
}
