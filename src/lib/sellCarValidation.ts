// 1stCars — shared Sell Car validation + helpers (P1/P2/P4/P5).
// Pure functions so they are unit-testable without Supabase or the DOM.

import { normalizeRegistrationNumber as normalizeReg } from "@/src/lib/vehicleLookup";

export const SELL_CAR_MIN_YEAR = 2000;
export function sellCarMaxYear(now = new Date()): number {
  return now.getFullYear();
}

/** Dynamic model-year options: current year down to 2000 (P2). */
export function buildSellCarYearOptions(now = new Date()): number[] {
  const max = sellCarMaxYear(now);
  const years: number[] = [];
  for (let y = max; y >= SELL_CAR_MIN_YEAR; y--) years.push(y);
  return years;
}

/** Parse a free-typed kilometre input into an integer, or null when invalid. */
export function parseKmDriven(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    const n = Math.trunc(raw);
    return n >= 0 ? n : null;
  }
  const s = String(raw ?? "").replace(/[,\s]/g, "");
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/** Real kilometre validation (P1): required, 0 < km <= 1,000,000. */
export function isValidKmDriven(raw: unknown): boolean {
  const n = parseKmDriven(raw);
  return n !== null && n > 0 && n <= 1000000;
}

export function kmValidationError(raw: unknown): string | null {
  const n = parseKmDriven(raw);
  if (n === null) return "Please enter your car's actual kilometres (digits only).";
  if (n <= 0) return "Kilometres must be greater than 0.";
  if (n > 1000000) return "Kilometres look too high — please check the odometer reading.";
  return null;
}

/** Registration validation reuses the existing RC validator (P1). */
export function validateSellCarReg(raw: string): { ok: boolean; normalized: string } {
  const normalized = normalizeReg(raw);
  const ok = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(normalized);
  return { ok, normalized };
}

/** Optional email: empty is fine, a filled value must look deliverable (P5). */
export function validateOptionalEmail(raw: string): boolean {
  const v = String(raw || "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && !/@buyer\.local$/i.test(v);
}

/** Indian mobile: 10 digits starting 6-9 (mirrors SellCarView, kept in sync). */
export function isValidSellCarMobile(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(String(raw || ""));
}

/** Mask a mobile for UI summaries: 9876543210 -> XXXXXX3210 (P5). */
export function maskMobile(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length < 4) return "XXXX";
  return `XXXXXX${d.slice(-4)}`;
}

/** Mask a registration for UI summaries: GJ01AB1234 -> GJXXXX1234 (P5). */
export function maskReg(raw: string): string {
  const v = String(raw || "").toUpperCase();
  if (v.length < 6) return "XXXX";
  return `${v.slice(0, 2)}XXXX${v.slice(-4)}`;
}

/** 6-digit PIN code; empty allowed only when the caller treats it as optional. */
export function isValidPincode(raw: string): boolean {
  return /^[1-9]\d{5}$/.test(String(raw || "").trim());
}

/** Inspection date must be within tomorrow .. +14 days (P4). */
export function inspectionDateBounds(now = new Date()): { min: string; max: string } {
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const min = new Date(now.getTime() + 86400000);
  const max = new Date(now.getTime() + 14 * 86400000);
  return { min: fmt(min), max: fmt(max) };
}

export function isInspectionDateInWindow(raw: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw || ""))) return false;
  const { min, max } = inspectionDateBounds(now);
  return raw >= min && raw <= max;
}

/** Guard a lookup-provided year into the valid range, else null (P6). */
export function guardLookupYear(raw: unknown, now = new Date()): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n)) return null;
  if (n < SELL_CAR_MIN_YEAR || n > sellCarMaxYear(now)) return null;
  return n;
}

/** Stable fingerprint for duplicate-lead detection (P5, race-aware best effort). */
export function duplicateLeadKey(parts: { mobile: string; brand: string; model: string; reg: string }): string {
  const norm = (s: string) => String(s || "").trim().toLowerCase();
  return [norm(parts.mobile), norm(parts.brand), norm(parts.model), norm(parts.reg)].join("|");
}

/**
 * Thin Mobile-step partial lead (created by handleMobileSubmit in SellCarView):
 * carries only mobile/brand/model/city/plate — never a full inspection record.
 * Marked by its `notes` text; data-shape checks below are the belt to this.
 */
export function isPartialLeadRow(row: unknown): boolean {
  const notes = String((row as Record<string, unknown> | null)?.notes ?? "");
  return notes.startsWith("Partial lead");
}

/**
 * True only for a CONFIRMED COMPLETE inspection record: every field the final
 * submit always persists must be present (inspection slot, odometer, doorstep
 * address) and the row must not be a thin partial lead. Used by the duplicate
 * pre-check so a success screen can never be shown without a real, complete
 * record in the database (P5).
 */
export function isCompleteInspectionRow(row: unknown): boolean {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  if (isPartialLeadRow(r)) return false;
  const hasSlot = Boolean(r.preferred_date) && Boolean(r.preferred_time);
  const km = Number(r.km_driven);
  const hasKm = Number.isFinite(km) && km > 0;
  const hasAddress = typeof r.address === "string" && r.address.trim().length > 0;
  return hasSlot && hasKm && hasAddress;
}
