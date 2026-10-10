// 1stCars — frontend vehicle-lookup utility (no secrets here).
// Normalizes + validates Indian reg numbers, calls POST /api/vehicle-lookup
// with AbortController timeout. Never sends PII beyond the reg number.

export function normalizeRegistrationNumber(raw: string): string {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const REG_PATTERN = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/;

export function validateRegistrationNumber(raw: string): { ok: boolean; normalized: string } {
  const normalized = normalizeRegistrationNumber(raw);
  return { ok: REG_PATTERN.test(normalized), normalized };
}

export type VehicleLookupOutcome =
  | "success" | "not_found" | "incomplete" | "timeout" | "provider_error" | "rate_limited" | "provider_not_configured" | "invalid_format";

export interface VehicleDetails {
  outcome: VehicleLookupOutcome;
  regNormalized: string;
  brand?: string; model?: string; variant?: string; fuel?: string;
  year?: number | null; registrationDate?: string | null;
  rtoCode?: string | null; rtoName?: string | null; vehicleClass?: string | null;
  completeness?: "complete" | "partial";
}

export async function fetchVehicleDetails(regNumber: string, timeoutMs = 10000): Promise<VehicleDetails> {
  const { ok, normalized } = validateRegistrationNumber(regNumber);
  if (!ok) return { outcome: "invalid_format", regNormalized: normalized };
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch("/api/vehicle-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNumber: normalized }),
      signal: c.signal
    });
    const json: any = await res.json().catch(() => ({}));
    const status = String(json?.status || "provider_error") as VehicleLookupOutcome;
    return {
      outcome: status, regNormalized: json?.regNormalized || normalized,
      brand: json?.brand, model: json?.model, variant: json?.variant, fuel: json?.fuel,
      year: json?.year ?? null, registrationDate: json?.registrationDate ?? null,
      rtoCode: json?.rtoCode ?? null, rtoName: json?.rtoName ?? null,
      vehicleClass: json?.vehicleClass ?? null, completeness: json?.completeness || "partial"
    };
  } catch (e: any) {
    if (e?.name === "AbortError") return { outcome: "timeout", regNormalized: normalized };
    return { outcome: "provider_error", regNormalized: normalized };
  } finally { clearTimeout(t); }
}
