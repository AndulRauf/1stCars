// Meta Pixel helpers for 1stCars.
//
// The Pixel is initialized once from VITE_META_PIXEL_ID (falls back to the
// long-standing production Pixel ID so existing campaigns keep working). It is
// loaded lazily by the React app (initMetaPixel) instead of an inline head
// script, which lets the ID stay configurable and avoids duplicate scripts.

declare global {
  interface Window {
    fbq?: any;
  }
}

// Fallback Pixel ID (the one currently active in production). Override it with
// the VITE_META_PIXEL_ID env var when a different Pixel is needed.
const FALLBACK_PIXEL_ID = "1356689399876779";

export function getMetaPixelId(): string {
  const fromEnv = ((import.meta.env?.VITE_META_PIXEL_ID as string) || "").trim();
  if (/^\d{10,20}$/.test(fromEnv)) return fromEnv;
  if (fromEnv) {
    console.warn("[Meta] VITE_META_PIXEL_ID is invalid — falling back to the production Pixel ID.", fromEnv);
  }
  return FALLBACK_PIXEL_ID;
}

let metaPixelInitialized = false;

// Inject the fbevents.js loader exactly once, init the Pixel, and fire the
// initial PageView. Uses Meta's official stub pattern so calls made before the
// script loads are queued and replayed. Safe to call repeatedly.
export function initMetaPixel(): void {
  if (typeof window === "undefined" || metaPixelInitialized) return;
  const pixelId = getMetaPixelId();
  if (!pixelId) return;

  metaPixelInitialized = true;

  // Pixel already loaded elsewhere — only init the ID (never a second script).
  if (typeof window.fbq === "function" && window.fbq.loaded) {
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
    console.log(`[Meta] Pixel already loaded — initialized: ${pixelId}`);
    return;
  }

  if (!document.getElementById("fb-pixel-script")) {
    const script = document.createElement("script");
    script.id = "fb-pixel-script";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  // Meta's official stub: queue calls until fbevents.js replaces window.fbq.
  window.fbq = window.fbq || function (...args: any[]) {
    if (window.fbq.callMethod) window.fbq.callMethod.apply(window.fbq, args);
    else (window.fbq.queue = window.fbq.queue || []).push(args);
  };
  window.fbq.push = window.fbq.push || window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = "2.0";
  window.fbq.queue = window.fbq.queue || [];

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  console.log(`[Meta] Pixel initialized: ${pixelId}`);
}

// Fire PageView for SPA route changes (initial PageView is fired by initMetaPixel).
let lastMetaPageViewUrl = "";

// Opt-out mirror of the GA4 consent key (avoiding a circular import).
function trackingOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("1stcars_analytics_consent") === "denied";
  } catch {
    return false;
  }
}

export function trackMetaPageView(): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (trackingOptedOut()) return;
  const fullUrl = window.location.pathname + window.location.search;
  if (fullUrl === lastMetaPageViewUrl) return;
  lastMetaPageViewUrl = fullUrl;
  try {
    window.fbq("track", "PageView");
  } catch (e) {
    console.warn("Meta Pixel PageView failed:", e);
  }
}

// ---------------------------------------------------------------------------
// Payload sanitizer — the single defense layer between any caller and the
// Meta Pixel. Meta rejects events whose `currency` is not a valid 3-letter
// ISO 4217 code (1stCars ALWAYS transacts in "INR") and whose `value` is not
// a plain number. Car data (prices) can arrive from Supabase, the Admin CMS
// localStorage snapshot, or APIs, so nothing dynamic is trusted: currency is
// forced to "INR" and value is coerced to a finite number (a formatted string
// like "₹5,00,000" becomes 500000; an unparseable value is dropped).
// ---------------------------------------------------------------------------

function coerceNumericValue(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sanitizeMetaPayload(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") return data;
  const next: Record<string, unknown> = { ...data };
  const hasCurrency = "currency" in next;
  const hasValue = "value" in next;

  if (hasValue) {
    const numeric = coerceNumericValue(next.value);
    if (numeric === null) {
      // A non-numeric value can never reach Meta; drop it (and its orphaned
      // currency) rather than send a string like "₹5,00,000".
      delete next.value;
      if (hasCurrency) delete next.currency;
    } else {
      next.value = numeric;
    }
  }

  // Any event that carries (or carried) a value/currency must always declare
  // the valid INR code — never undefined, null, "", "₹", "Rs", "$" or others.
  if (hasCurrency || "value" in next) next.currency = "INR";

  return next;
}

export function trackMetaEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (trackingOptedOut()) return;
  try {
    window.fbq("track", event, sanitizeMetaPayload(data));
    // @ts-ignore
    if (import.meta.env?.DEV) console.log(`[Meta] ${event} fired`, data ?? "");
  } catch (e) {
    console.warn("Meta Pixel event failed:", e);
  }
}

export function trackMetaCustomEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (trackingOptedOut()) return;
  try {
    window.fbq("trackCustom", event, sanitizeMetaPayload(data));
    // @ts-ignore
    if (import.meta.env?.DEV) console.log(`[Meta] custom event fired: ${event}`, data ?? "");
  } catch (e) {
    console.warn("Meta Pixel custom event failed:", e);
  }
}