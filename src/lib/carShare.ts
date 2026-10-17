// Shared helpers that turn a car into a rich "car card" share for WhatsApp:
// a formatted text block (title + price + specs) plus a single deep link, and
// runtime Open Graph meta injection so link previews pick up the car's photo.

export interface ShareableCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  fuel?: string;
  transmission?: string;
  mileage?: number;
  location?: string;
  image_url?: string | null;
  images?: string[];
  variant?: string;
}

// SEO slug for a car: "2021-hyundai-creta-sx-petrol-surat-a1b2c3d4".
// Human-readable keywords (year/brand/model/fuel/city) + short id suffix so
// every URL is unique, stable, and rankable. Old UUID-only links keep working
// (the id is always the last segment).
export const carSlug = (car: ShareableCar): string => {
  const raw = [car.year, car.brand, car.model, car.variant, car.fuel, car.location]
    .filter(Boolean)
    .join(" ");
  const slug = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90)
    .replace(/-+$/, "");
  const shortId = String(car.id || "").replace(/-/g, "").slice(0, 8) || "car";
  return slug ? `${slug}-${shortId}` : shortId;
};

// Extract the raw car id from a slug or a plain UUID. Accepts both
// "/cars/<uuid>" (legacy) and "/cars/<seo-slug>-<shortId>" (new).
// For slugs we can only recover the 8-char prefix; callers match by prefix
// and fall back to full-id lookup for legacy links.
export const carIdFromSlug = (slugOrId: string): string => {
  const s = String(slugOrId || "").trim();
  if (!s) return "";
  // Plain UUID (legacy link) — return as-is.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
  const parts = s.split("-");
  const tail = parts[parts.length - 1] || "";
  // 8-hex-char short id suffix.
  if (/^[0-9a-f]{8}$/i.test(tail)) return tail;
  return s;
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const carShareLink = (car: ShareableCar) => `https://1stcars.in/cars/${carSlug(car)}`;

// Legacy UUID link — kept for backwards compatibility (old shares/redirects).
export const carLegacyLink = (car: ShareableCar) => `https://1stcars.in/cars/${car.id}`;

// WhatsApp / Status link previews only render JPEG or PNG og:images
// reliably. The Supabase render endpoint can return WebP BYTES for
// extensionless/WebP originals while callers still claim image/jpeg, and
// ?format=jpg 404s on extensionless originals — either way WhatsApp drops
// the photo. So this mirrors the server preview logic exactly:
//   - .jpg original  -> exact 1200x630 cover-cropped render variant
//                      (guaranteed real JPEG bytes back)
//   - .png original  -> original bytes (honest image/png)
//   - anything else  -> original bytes untouched (server omits the type tag
//                      and lets the crawler sniff, instead of lying)
// Unsplash demo URLs are forced to fm=jpg so they always come back JPEG.
export const toShareImageUrl = (url: string): string => {
  const raw = url || "";
  const m = /^https:\/\/([^/]+\.supabase\.co)\/storage\/v1\/object\/public\/([^?#]+)/.exec(raw);
  if (m) {
    if (/\.(jpe?g)(\?|#|$)/i.test(raw) || /\.(jpe?g)$/i.test(m[2])) {
      return `https://${m[1]}/storage/v1/render/image/public/${m[2]}?width=1200&height=630&resize=cover&quality=80`;
    }
    return raw;
  }
  try {
    const u = new URL(raw);
    if (/images\.unsplash\.com$/i.test(u.hostname)) {
      u.searchParams.set("fm", "jpg");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", "1200");
      u.searchParams.set("h", "630");
      u.searchParams.set("q", "80");
      return u.toString();
    }
  } catch { /* not absolute — return as-is */ }
  return raw;
};

export const carPrimaryImage = (car: ShareableCar): string => {
  const isReal = (u?: string) => !!u && (u.startsWith("http") || u.startsWith("/") || u.startsWith("data:"));
  const imgs = Array.isArray(car.images) ? car.images : [];
  const first = imgs.find((u) => typeof u === "string" && isReal(u));
  const raw = first || (isReal(car.image_url) ? car.image_url! : "");
  if (!raw) return "";
  // Absolute https URL + exact 1200x630 variant so JS-rendering crawlers
  // (WhatsApp / Facebook) get the same sharp image as the server preview.
  const absolute = raw.startsWith("http") ? raw : `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  return absolute.startsWith("https://") ? toShareImageUrl(absolute) : absolute;
};

// WhatsApp "car card" text block — deliberately contains NO link. The deep
// link is appended once per share path: either as the `url` field of
// navigator.share or as the single link line for wa.me. Passing the same link
// both in `text` and `url` makes WhatsApp show it twice.
export const buildCarShareMessage = (car: ShareableCar): string => {
  const specs = [
    car.fuel || "Petrol",
    car.transmission || "Automatic",
    car.mileage ? `${car.mileage.toLocaleString("en-IN")} km` : null,
    car.location || null,
  ].filter(Boolean).join(" • ");
  return [
    `🚗 *${car.year} ${car.brand} ${car.model}*`,
    `💰 ${formatINR(car.price)}`,
    `✨ ${specs}`,
    ``,
    `🏅 1stCars Certified Pre-Owned`,
  ].join("\n");
};

// Full share text with the single car page deep link appended. Used by the
// wa.me deep-link share (which has no separate URL field) and the clipboard
// fallback. WhatsApp collapses this one URL into its rich preview card (first
// photo via og:image + title + price), so it appears exactly once.
export const buildCarShareFullMessage = (car: ShareableCar): string =>
  `${buildCarShareMessage(car)}\n\n${carShareLink(car)}`;

export const buildCarOgTitle = (car: ShareableCar) =>
  `${car.year} ${car.brand} ${car.model} | 1stCars Certified`;

export const buildCarOgDescription = (car: ShareableCar) =>
  `Certified ${car.year} ${car.brand} ${car.model} (${car.fuel || "Petrol"}, ${car.transmission || "Automatic"}${car.mileage ? `, ${car.mileage.toLocaleString("en-IN")} km` : ""}). ${formatINR(car.price)}. 120-point inspected, transparent history, doorstep delivery.`;

// ---------------------------------------------------------------------------
// Runtime Open Graph injection
//
// The SPA ships static meta tags in index.html, so any crawler that fetches a
// deep link sees the generic homepage card. When a car page renders we patch
// document.head so JS-rendering crawlers (modern WhatsApp / Facebook) show the
// actual car. This is a best-effort companion to the serverless
// api/car-preview function, which serves the same tags to plain-HTTP crawlers.
// ---------------------------------------------------------------------------

interface MetaSnapshot { prop: string; content: string }

let ogSnapshot: MetaSnapshot[] | null = null;

const ensureMeta = (prop: string, content: string) => {
  let el = document.head.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", prop);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const META_PROPS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:url",
] as const;

export const applyCarOgMeta = (car: ShareableCar) => {
  if (typeof document === "undefined") return;
  if (!ogSnapshot) {
    ogSnapshot = META_PROPS.map((prop) => {
      const el = document.head.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      return { prop, content: el?.getAttribute("content") || "" };
    });
  }
  const title = buildCarOgTitle(car);
  const description = buildCarOgDescription(car);
  const image = carPrimaryImage(car);
  const url = carShareLink(car);

  document.title = title;
  ensureMeta("og:title", title);
  ensureMeta("og:description", description);
  ensureMeta("og:url", url);
  ensureMeta("twitter:title", title);
  ensureMeta("twitter:description", description);
  ensureMeta("twitter:url", url);
  if (image) {
    ensureMeta("og:image", image);
    ensureMeta("twitter:image", image);
  }

  let canon = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canon) {
    canon = document.createElement("link");
    canon.setAttribute("rel", "canonical");
    document.head.appendChild(canon);
  }
  canon.setAttribute("href", url);
};

export const resetCarOgMeta = () => {
  if (typeof document === "undefined" || !ogSnapshot) return;
  for (const { prop, content } of ogSnapshot) {
    const el = document.head.querySelector(`meta[property="${prop}"]`);
    if (el) {
      if (content) el.setAttribute("content", content);
      else el.remove();
    }
  }
  // Note: document.title is owned by the router (App.tsx), which re-applies
  // the correct per-view title on every navigation. Do NOT overwrite it here
  // or the freshly-navigated view's title would be clobbered.
  ogSnapshot = null;
};
