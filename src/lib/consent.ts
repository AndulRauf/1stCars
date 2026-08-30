import { initGA4, updateConsent } from "@/src/lib/analytics";
import { initMetaPixel } from "@/src/lib/metaPixel";

// Analytics/tracking consent (DPDP-aligned, opt-out model).
//
// Tracking starts by default when a visitor lands (so a small business never
// loses its first-visit data), and the on-page banner lets anyone opt out with
// one tap ("Turn Off"). The choice is persisted in localStorage so returning
// visitors keep their decision without re-asking.

const CONSENT_KEY = "1stcars_analytics_consent";

export type ConsentStatus = "granted" | "denied" | "undecided";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "undecided";
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return "undecided";
}

export function setConsentStatus(status: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, status);
  // Mirror the stored choice into Google Consent Mode v2 so gtag.js transmits
  // only while granted (and drops its gcs consent cookie when revoked).
  updateConsent(status === "granted");
  if (status === "granted") {
    initAnalyticsAfterConsent();
  }
}

// Opt-out model: allowed unless explicitly denied. A visitor who never touches
// the banner still gets counted (and only that visitor's future events stop if
// they click "Turn Off").
export function isTrackingAllowed(): boolean {
  return getConsentStatus() !== "denied";
}

// Initialize GA4 + Meta Pixel. Called on app boot (optimistically, no banner
// interaction required) and again after an explicit grant. Visitors who opted
// out are skipped.
export function initAnalyticsAfterConsent(): void {
  if (!isTrackingAllowed()) return;
  initGA4();
  initMetaPixel();
}
