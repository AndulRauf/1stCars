import { initGA4, updateConsent } from "@/src/lib/analytics";
import { initMetaPixel } from "@/src/lib/metaPixel";

// Analytics/tracking consent (DPDP-aligned, opt-in model).
//
// Tracking stays OFF until the visitor explicitly accepts via the on-page
// banner ("Accept"). No GA4 / Meta Pixel request is fired for undecided or
// denied visitors — including the very first page load. The choice is
// persisted in localStorage so returning visitors keep their decision
// without re-asking.

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

// Opt-in model: tracking only for visitors who explicitly granted it.
// Undecided (fresh) visitors and denied visitors are never tracked.
export function isTrackingAllowed(): boolean {
  return getConsentStatus() === "granted";
}

// Initialize GA4 + Meta Pixel. Called on app boot (no-ops unless the visitor
// previously granted consent) and again after an explicit grant. Visitors
// who are undecided or opted out are skipped.
export function initAnalyticsAfterConsent(): void {
  if (!isTrackingAllowed()) return;
  initGA4();
  initMetaPixel();
}
