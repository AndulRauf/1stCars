declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export function trackMetaEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", event, data);
  } catch (e) {
    console.warn("Meta Pixel event failed:", e);
  }
}

export function trackMetaCustomEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("trackCustom", event, data);
  } catch (e) {
    console.warn("Meta Pixel custom event failed:", e);
  }
}
