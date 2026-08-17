import { initGA4 } from "@/src/lib/analytics";
import { initMetaPixel } from "@/src/lib/metaPixel";

// Analytics/tracking consent gate (DPDP/GDPR-aligned).
//
// GA4 and the Meta Pixel are only initialized AFTER the visitor explicitly
// accepts tracking. The choice is persisted in localStorage so returning
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
  if (status === "granted") {
    initAnalyticsAfterConsent();
  }
}

export function isTrackingAllowed(): boolean {
  return getConsentStatus() === "granted";
}

// Initialize GA4 + Meta Pixel now that consent has been granted. Also called
// on app boot: visitors who already granted consent get tracking immediately.
export function initAnalyticsAfterConsent(): void {
  if (!isTrackingAllowed()) return;
  initGA4();
  initMetaPixel();
}
