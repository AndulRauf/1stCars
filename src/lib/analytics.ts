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

// Known placeholder values that must never be treated as a real GA4 ID.
const PLACEHOLDER_GA4_IDS = new Set(["G-1STCARS2026", "G-XXXXXXXXXX", "G-XXXXXXXXXXX"]);

// The real, active 1stCars GA4 Measurement ID (added by the owner). Used as a
// code-level fallback so analytics works out-of-the-box after redeploy, even if
// the VITE_GA4_MEASUREMENT_ID build/env var has not been set yet. It can still
// be overridden by an env var / the AdminCMS website setting when provided.
const PRODUCTION_GA4_ID = "G-2Z1JREBR0R";

// A real GA4 Measurement ID looks like G- followed by exactly 10 alphanumerics
// (e.g. G-ABCDE12345).
const GA4_ID_PATTERN = /^G-[A-Z0-9]{10}$/i;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let ga4Initialized = false;

// Logs analytics debug output only in development builds so production stays clean.
function debugLog(...args: unknown[]): void {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[Analytics]", ...args);
  }
}

export function isValidGa4Id(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (PLACEHOLDER_GA4_IDS.has(trimmed.toUpperCase())) return false;
  return GA4_ID_PATTERN.test(trimmed);
}

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
//   3. The bundled production ID (PRODUCTION_GA4_ID) — so analytics works even
//      before the env var / CMS setting is filled in.
// Only valid IDs are accepted; placeholders such as G-1STCARS2026 are ignored.
export function getGa4MeasurementId(): string {
  const envId = ((import.meta.env?.VITE_GA4_MEASUREMENT_ID as string) || "").trim();
  if (isValidGa4Id(envId)) return envId;
  if (envId) {
    console.warn(
      "[Analytics] VITE_GA4_MEASUREMENT_ID is invalid or a placeholder — ignoring it.",
      envId
    );
  }
  const settingsId = readSettingsGa4Id();
  if (isValidGa4Id(settingsId)) return settingsId;
  if (settingsId) {
    console.warn(
      "[Analytics] AdminCMS googleAnalyticsId is invalid or a placeholder — GA4 disabled.",
      settingsId
    );
  }
  if (isValidGa4Id(PRODUCTION_GA4_ID)) return PRODUCTION_GA4_ID;
  return "";
}

// Consent gate: analytics may only start after the visitor explicitly accepts
// tracking (stored by src/lib/consent.ts). Read directly to avoid a circular
// import between the two modules.
function hasTrackingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("1stcars_analytics_consent") === "granted";
  } catch {
    return false;
  }
}

// Inject the gtag.js loader exactly once and configure GA4. Reuses an existing
// window.gtag if one is already present (no duplicate initialization). Safe to
// call repeatedly — no-ops when no valid Measurement ID is configured OR when
// the visitor has not consented to tracking.
export function initGA4(): void {
  if (typeof window === "undefined" || ga4Initialized) return;
  if (!hasTrackingConsent()) return;
  const id = getGa4MeasurementId();
  if (!id) return;

  ga4Initialized = true;
  debugLog("initialized with Measurement ID", id);
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
    debugLog(`event: ${event}`, params);
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

function readUtmStorage(storage: Storage, key: string): UtmParams {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

// Capture UTMs from the current URL. Latest-touch always overwrites session
// storage; first-touch is only written once (persistent across sessions). UTM
// values are stored as both a compact JSON object and flat first_utm_* /
// latest_utm_* keys so campaign attribution survives SPA navigation.
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  const utm = readUtmFromUrl();
  if (Object.keys(utm).length === 0) return;
  try {
    sessionStorage.setItem(GA4_STORAGE_LATEST, JSON.stringify(utm));
    for (const key of UTM_KEYS) {
      const value = utm[key];
      if (value) sessionStorage.setItem(`latest_${key}`, value);
    }
  } catch {
    /* ignore quota/security errors */
  }
  try {
    if (!localStorage.getItem(GA4_STORAGE_FIRST)) {
      localStorage.setItem(GA4_STORAGE_FIRST, JSON.stringify(utm));
      for (const key of UTM_KEYS) {
        const value = utm[key];
        if (value) localStorage.setItem(`first_${key}`, value);
      }
    }
  } catch {
    /* ignore quota/security errors */
  }
  debugLog("captured UTM", utm);
}

// Campaign params for event reporting. First-touch identifies the campaign that
// originally brought the user (best for lead attribution); latest-touch reflects
// the page the user is currently on. We prefer first-touch.
export function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  const first = readUtmStorage(localStorage, GA4_STORAGE_FIRST);
  if (Object.keys(first).length) return first;
  return readUtmStorage(sessionStorage, GA4_STORAGE_LATEST);
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
    page_path: window.location.pathname,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_content: utm.utm_content || undefined
  });
}

// ---------------------------------------------------------------------------
// Conversation-intent events (click-to-WhatsApp / click-to-call / share).
// These capture a strong buying/selling signal BEFORE a full form is filled —
// e.g. a visitor tapping the floating WhatsApp button — so the owner can see
// engagement even when no lead form is submitted. All are non-PII.
// ---------------------------------------------------------------------------

function utmSpread(): Record<string, string | undefined> {
  const u = getUtmParams();
  return {
    utm_source: u.utm_source || undefined,
    utm_medium: u.utm_medium || undefined,
    utm_campaign: u.utm_campaign || undefined,
    utm_content: u.utm_content || undefined
  };
}

// A visitor tapped the WhatsApp contact button (conversation not captured yet).
export function trackWhatsAppClick(context: string, carName?: string, carPrice?: number): void {
  trackGA4("whatsapp_click", {
    context,
    car_name: carName || undefined,
    value: carPrice && carPrice > 0 ? carPrice : undefined,
    page_location: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...utmSpread()
  });
}

// A visitor tapped the phone / call-back CTA intent.
export function trackCallClick(context: string, carName?: string): void {
  trackGA4("call_click", {
    context,
    car_name: carName || undefined,
    page_location: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...utmSpread()
  });
}

// A visitor shared a car listing (WhatsApp share / copy link / deep-link).
export function trackShareEvent(kind: "whatsapp" | "copy" | "link", context: string, carName?: string): void {
  trackGA4(`share_${kind}`, {
    context,
    car_name: carName || undefined,
    ...utmSpread()
  });
}

// Diagnostics used by the Admin dashboard so the owner can SEE whether GA4 is
// actually wired up — the #1 silent reason a site "gets no leads" is that the
// analytics is misconfigured and the data is simply not being collected.
export interface AnalyticsDiagnostics {
  ga4Id: string;
  ga4Enabled: boolean;
  ga4Reason: string;
}

export function getAnalyticsDiagnostics(): AnalyticsDiagnostics {
  const ga4Id = getGa4MeasurementId();
  const valid = isValidGa4Id(ga4Id);
  let reason: string;
  if (valid) {
    reason = "GA4 is active with a valid Measurement ID.";
  } else {
    reason =
      "GA4 is NOT collecting data. Set VITE_GA4_MEASUREMENT_ID (build env) or the AdminCMS " +
      "'googleAnalyticsId' setting to a real ID — placeholders such as G-1STCARS2026 are ignored.";
  }
  return { ga4Id, ga4Enabled: valid, ga4Reason: reason };
}