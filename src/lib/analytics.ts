// GA4 (Google Analytics 4) tracking helpers for 1stCars.
//
// SPA-friendly: page views are fired manually on route changes (with
// send_page_view: false on config) so we never emit duplicate page_view events.
// UTM campaign parameters are captured on arrival and persisted (first-touch in
// localStorage, latest-touch in sessionStorage) so they survive SPA navigation.
// No PII (name / email / phone / address / vehicle reg) is ever sent to GA4.

const GA4_STORAGE_FIRST = "1stcars_utm_first_touch";
const GA4_STORAGE_LATEST = "1stcars_utm_latest";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let ga4Initialized = false;

function readSettingsGa4Id(): string {
  try {
    const raw = localStorage.getItem("1stcars_cms_website_settings");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    const id = parsed?.googleAnalyticsId;
    return typeof id === "string" && id.trim() ? id.trim() : "";
  } catch {
    return "";
  }
}

// Resolve the GA4 Measurement ID. Priority:
//   1. VITE_GA4_MEASUREMENT_ID env var (recommended for production builds)
//   2. The CMS "googleAnalyticsId" website setting (editable in AdminCMS without code)
export function getGa4MeasurementId(): string {
  const envId = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string) || "";
  if (envId) return envId;
  return readSettingsGa4Id();
}

// Inject the gtag.js loader exactly once and configure GA4. Reuses an existing
// window.gtag if one is already present (no duplicate initialization).
export function initGA4(): void {
  if (typeof window === "undefined" || ga4Initialized) return;
  const id = getGa4MeasurementId();
  if (!id) return;

  ga4Initialized = true;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function (...args: unknown[]) {
      (window.dataLayer as unknown[]).push(args);
    };
  }

  if (!document.getElementById("gtag-js")) {
    const script = document.createElement("script");
    script.id = "gtag-js";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  // send_page_view: false → we fire page_view ourselves per SPA route so the
  // initial load and every pushState navigation produce exactly one page_view.
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });
}

// Generic GA4 event emitter. No-op when gtag has not loaded.
export function trackGA4(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", event, params);
  } catch (e) {
    console.warn("GA4 event failed:", e);
  }
}

// ---------------------------------------------------------------------------
// UTM capture & persistence
// ---------------------------------------------------------------------------

function readUtmFromUrl(): UtmParams {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

function readStorage(key: string, storage: Storage): UtmParams {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

// Capture UTMs from the current URL. Latest-touch always overwrites session
// storage; first-touch is only written once (persistent across sessions).
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  const utm = readUtmFromUrl();
  if (Object.keys(utm).length === 0) return;
  try {
    sessionStorage.setItem(GA4_STORAGE_LATEST, JSON.stringify(utm));
  } catch {
    /* ignore quota/security errors */
  }
  try {
    if (!localStorage.getItem(GA4_STORAGE_FIRST)) {
      localStorage.setItem(GA4_STORAGE_FIRST, JSON.stringify(utm));
    }
  } catch {
    /* ignore quota/security errors */
  }
}

// Campaign params for event reporting. First-touch identifies the campaign that
// originally brought the user (best for lead attribution); latest-touch reflects
// the page the user is currently on. We prefer first-touch.
export function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  const first = readStorage(GA4_STORAGE_FIRST, localStorage);
  if (Object.keys(first).length) return first;
  return readStorage(GA4_STORAGE_LATEST, sessionStorage);
}

// ---------------------------------------------------------------------------
// Page view (SPA-safe, no duplicates)
// ---------------------------------------------------------------------------

let lastTrackedFullUrl = "";

// Call this on every route change. Emits exactly one page_view per distinct URL
// (path + search) so back/forward and pushState navigation never double-fire.
export function trackPageView(): void {
  if (typeof window === "undefined") return;
  initGA4();
  const fullUrl = window.location.pathname + window.location.search;
  if (fullUrl === lastTrackedFullUrl) return;
  lastTrackedFullUrl = fullUrl;
  const utm = getUtmParams();
  trackGA4("page_view", {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
    ...utm
  });
}

// ---------------------------------------------------------------------------
// Seller funnel events
// ---------------------------------------------------------------------------

// Event 1 — reached the Sell Car page.
export function trackViewSellCar(): void {
  const utm = getUtmParams();
  trackGA4("view_sell_car", {
    page_location: window.location.href,
    page_path: window.location.pathname,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_content: utm.utm_content || undefined
  });
}

// Event 2 — user starts interacting with the seller form. Fires only once per
// session/user journey (guarded by sessionStorage so reloads don't reset it).
export function trackSellerFormStart(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem("1stcars_seller_form_started")) return;
    sessionStorage.setItem("1stcars_seller_form_started", "1");
  } catch {
    /* ignore */
  }
  const utm = getUtmParams();
  trackGA4("seller_form_start", {
    page_location: window.location.href,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_content: utm.utm_content || undefined
  });
}

// Event 3 — MOST IMPORTANT: successful seller form submission (conversion).
// No PII is included — only non-PII campaign/funnel info.
export function trackSellerLeadSubmit(): void {
  const utm = getUtmParams();
  trackGA4("seller_lead_submit", {
    lead_type: "seller",
    page_location: window.location.href,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_content: utm.utm_content || undefined
  });
}