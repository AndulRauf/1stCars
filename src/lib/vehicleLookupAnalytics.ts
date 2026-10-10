// 1stCars — non-PII analytics for registration lookup.
// Reuses existing GA4/Meta architecture: consent-gated, no reg/mobile/name.
function canTrack(): boolean {
  try { return localStorage.getItem("1stcars_analytics_consent") === "granted"; } catch { return false; }
}
function ga(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined" || !canTrack()) return;
    (window as any).gtag?.("event", event, { ...(params || {}) });
    if ((window as any).fbq) { try { (window as any).fbq("trackCustom", event, { ...(params || {}) }); } catch {} }
  } catch {}
}
export function trackRegistrationLookupStarted() { ga("registration_lookup_started"); }
export function trackVehicleApiSuccess(p: { completeness?: string }) { ga("vehicle_api_lookup_success", { completeness: p.completeness || "partial" }); }
export function trackVehicleApiFailed(reason: string) { ga("vehicle_api_lookup_failed", { fail_reason: reason }); }
export function trackManualFallbackUsed(from: string) { ga("manual_fallback_used", { from }); }
export function trackVehicleDetailsVerified(source: string, corrected: boolean) { ga("vehicle_details_verified", { source, corrected }); }
