// 1stCars — server-side vehicle registration lookup (Vercel Serverless).
// POST /api/vehicle-lookup { regNumber }
// Provider-independent: swap fetchFromProvider without touching SellCarView.
// Env (server-only, NEVER VITE_-prefixed): VEHICLE_API_BASE_URL, VEHICLE_API_KEY
// Missing creds -> { status: "provider_not_configured" } so UI uses manual flow.

export type LookupStatus = "success" | "not_found" | "incomplete" | "provider_not_configured" | "provider_error" | "rate_limited";

export function normalizeRegistrationNumber(raw: string): string {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const REG_PATTERN = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/;

export function isValidRegistrationNumber(n: string): boolean {
  return REG_PATTERN.test(n);
}

// Provider adapter (isolated). Generic REST: GET {base}/vehicle/{reg} Bearer key.
// Only allow-listed mechanical fields pass through — owner PII is dropped here.
async function fetchFromProvider(reg: string, base: string, key: string, ms: number): Promise<any | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/vehicle/${encodeURIComponent(reg)}`, {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: c.signal
    });
    if (r.status === 404) return { found: false };
    if (r.status === 429) throw Object.assign(new Error("rate_limited"), { code: 429 });
    if (!r.ok) throw new Error(`provider_${r.status}`);
    const j: any = await r.json().catch(() => ({}));
    const d = j?.data ?? j?.vehicle ?? j ?? {};
    return {
      found: true,
      brand: typeof d.make === "string" ? d.make : typeof d.brand === "string" ? d.brand : undefined,
      model: typeof d.model === "string" ? d.model : undefined,
      variant: typeof d.variant === "string" ? d.variant : undefined,
      fuel: typeof d.fuel === "string" ? d.fuel : typeof d.fuelType === "string" ? d.fuelType : undefined,
      year: Number.isFinite(Number(d.year)) ? Number(d.year) : null,
      registrationDate: typeof d.registrationDate === "string" ? d.registrationDate : null,
      vehicleClass: typeof d.vehicleClass === "string" ? d.vehicleClass : null,
      rtoName: typeof d.rto === "string" ? d.rto : null
    };
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
    const base = process.env.VEHICLE_API_BASE_URL || "";
    const key = process.env.VEHICLE_API_KEY || "";
    if (!base || !key) {
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
      res.status(200).json({ ok: true, status: "provider_error", regNormalized: reg, source: "none", completeness: "partial" });
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
