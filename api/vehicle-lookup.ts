// 1stCars — server-side vehicle registration lookup (Vercel Serverless).
// POST /api/vehicle-lookup { regNumber }
// APIExpress RC Verify: POST {base}/v1/rc/verify { rc_number } Bearer APIEXPRESS_API_KEY.
// Same-origin contract preserved: frontend only ever calls POST /api/vehicle-lookup.
// Env (server-only, NEVER VITE_-prefixed): APIEXPRESS_API_KEY (preferred) or
// legacy VEHICLE_API_KEY, optional VEHICLE_API_BASE_URL / APIEXPRESS_BASE_URL
// (defaults to https://api.apiexpress.in).
// Missing creds -> { status: "provider_not_configured" } so UI uses manual flow.
//
// Schema note (2026-10-18): the only verified APIExpress sample is
// { status, owner_name (masked), vehicle ("Honda City VX"), fuel, insurance_valid, state }.
// Full field names for manufacturing year / registration date / RTO are NOT
// publicly documented, so mapping below is defensive: only explicit fields are
// mapped, unknown stays null (manual entry), year is NEVER derived from dates,
// and owner/chassis/engine/insurance identifiers are always dropped.

export type LookupStatus = "success" | "not_found" | "incomplete" | "provider_not_configured" | "provider_error" | "rate_limited";

export function normalizeRegistrationNumber(raw: string): string {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const REG_PATTERN = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/;

export function isValidRegistrationNumber(n: string): boolean {
  return REG_PATTERN.test(n);
}

// Provider adapter (isolated). APIExpress RC Verify:
//   POST {base}/v1/rc/verify  { rc_number: "GJ01AB1234" }
//   Authorization: Bearer <APIEXPRESS_API_KEY>
// Only allow-listed mechanical fields pass through — owner PII
// (owner_name), chassis/engine numbers and insurance data are dropped here.
// Year is only mapped from an explicit year-like field; it is NEVER guessed
// from registration dates. Unknown fields stay null for manual entry.
export const APIEXPRESS_DEFAULT_BASE_URL = "https://api.apiexpress.in";
export const APIEXPRESS_RC_VERIFY_PATH = "/v1/rc/verify";

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function explicitYearOf(d: Record<string, any>): number | null {
  const raw = d.year ?? d.manufacturing_year ?? d.manufacture_year ?? d.mfg_year
    ?? d.model_year ?? d.yom ?? d.vehicle_year;
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string" && /^\d{4}$/.test(raw.trim())) return Number(raw.trim());
  return null;
}

/** Split "Honda City VX" -> { brand: "Honda", model: "City VX" } (best effort). */
export function splitVehicleLabel(label: string | undefined): { brand?: string; model?: string } {
  if (!label) return {};
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { brand: parts[0] };
  return { brand: parts[0], model: parts.slice(1).join(" ") };
}

export interface ProviderVehicle {
  found: boolean;
  unsuccessful?: boolean;
  brand?: string;
  model?: string;
  variant?: string;
  fuel?: string;
  year?: number | null;
  registrationDate?: string | null;
  vehicleClass?: string | null;
  rtoName?: string | null;
}

export function mapApiExpressPayload(payload: any): ProviderVehicle {
  const d = (payload?.data ?? payload?.result ?? payload?.vehicle_details ?? payload ?? {}) as Record<string, any>;
  const status = String(payload?.status ?? d.status ?? "").toLowerCase();
  if (status && !["success", "ok", "valid", "found", "verified"].includes(status)) {
    return { found: false, unsuccessful: true };
  }
  const vehicleLabel = firstString(d.vehicle, d.vehicle_name, d.make_model, d.model_display);
  const explicitBrand = firstString(d.make, d.brand, d.manufacturer, d.oem);
  const explicitModel = firstString(d.model, d.variant_model);
  const split = splitVehicleLabel(vehicleLabel);
  const brand = explicitBrand || split.brand;
  const model = explicitModel || split.model;
  const fuel = firstString(d.fuel, d.fuel_type, d.fuelType);
  const registrationDate = firstString(
    d.registration_date, d.registrationDate, d.reg_date, d.regDate, d.rc_registration_date
  );
  const vehicleClass = firstString(d.vehicle_class, d.vehicleClass, d.class, d.veh_class);
  const rtoName = firstString(d.rto, d.rto_name, d.rtoName, d.rto_location, d.state, d.registration_state);
  if (!brand && !model && !fuel && !registrationDate && !vehicleClass && !rtoName && explicitYearOf(d) === null) {
    return { found: false };
  }
  return {
    found: true,
    brand,
    model,
    variant: firstString(d.variant, d.version, d.trim),
    fuel,
    year: explicitYearOf(d),
    registrationDate: registrationDate ?? null,
    vehicleClass: vehicleClass ?? null,
    rtoName: rtoName ?? null,
  };
}

export function resolveProviderConfig(env: NodeJS.ProcessEnv = process.env): { base: string; key: string } {
  const key = env.APIEXPRESS_API_KEY || env.VEHICLE_API_KEY || "";
  const base = env.APIEXPRESS_BASE_URL || env.VEHICLE_API_BASE_URL || APIEXPRESS_DEFAULT_BASE_URL;
  return { base, key };
}

// Provider adapter (isolated): see APIExpress fetchFromProvider above.
async function fetchFromProvider(reg: string, base: string, key: string, ms: number): Promise<any | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}${APIEXPRESS_RC_VERIFY_PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rc_number: reg }),
      signal: c.signal
    });
    if (r.status === 404) return { found: false };
    if (r.status === 429) throw Object.assign(new Error("rate_limited"), { code: 429 });
    if (!r.ok) {
      // Capture provider body snippet for Vercel logs (never leaks the key).
      // Defensive: unit-test mocks may not implement .text().
      let snippet = "";
      try { snippet = String(await (r as any).text?.() ?? "").slice(0, 300); } catch { snippet = ""; }
      const err: any = new Error(`provider_${r.status}${snippet ? `: ${snippet}` : ""}`);
      err.code = r.status;
      throw err;
    }
    const j: any = await r.json().catch(() => ({}));
    return mapApiExpressPayload(j);
  } finally { clearTimeout(t); }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, status: "provider_error", error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const reg = normalizeRegistrationNumber(body.regNumber || body.reg_number || "");
    if (!isValidRegistrationNumber(reg)) {
      res.status(400).json({ ok: false, status: "invalid_format", error: "Enter a valid registration number, e.g. GJ 01 AB 1234." });
      return;
    }
    const { base, key } = resolveProviderConfig(process.env);
    if (!key) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ ok: true, status: "provider_not_configured", regNormalized: reg, source: "none", completeness: "partial" });
      return;
    }
    let p: any = null;
    try {
      p = await fetchFromProvider(reg, base, key, 9000);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        res.status(200).json({ ok: true, status: "timeout", regNormalized: reg, source: "none", completeness: "partial" });
        return;
      }
      if (e?.code === 429 || /429|rate/i.test(e?.message || "")) {
        res.status(200).json({ ok: true, status: "rate_limited", regNormalized: reg, source: "none", completeness: "partial" });
        return;
      }
      console.error("[vehicle-lookup] provider error:", e?.message || e);
      // Surface numeric provider HTTP status (401 = bad key, 402 = no credits,
      // 403 = forbidden, 5xx = provider down) without leaking key/body.
      const m = /provider_(\d{3})/.exec(String(e?.message || ""));
      const providerStatus = typeof e?.code === "number" ? e.code : m ? Number(m[1]) : undefined;
      res.status(200).json({ ok: true, status: "provider_error", regNormalized: reg, source: "none", completeness: "partial", ...(providerStatus ? { providerStatus } : {}) });
      return;
    }
    if (!p || p.found === false) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ ok: true, status: "not_found", regNormalized: reg, source: "none", completeness: "partial" });
      return;
    }
    const hasCore = Boolean(p.brand && p.model);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      status: hasCore ? "success" : "incomplete",
      regNormalized: reg,
      brand: p.brand, model: p.model, variant: p.variant, fuel: p.fuel,
      year: p.year ?? null, registrationDate: p.registrationDate ?? null,
      rtoCode: reg.length >= 4 ? reg.slice(0, 4) : null, rtoName: p.rtoName ?? null,
      vehicleClass: p.vehicleClass ?? null,
      completeness: p.brand && p.model && p.fuel && p.year ? "complete" : "partial",
      source: "api"
    });
  } catch (e: any) {
    console.error("[vehicle-lookup] handler error:", e?.message || e);
    res.status(200).json({ ok: true, status: "provider_error", source: "none", completeness: "partial" });
  }
}
