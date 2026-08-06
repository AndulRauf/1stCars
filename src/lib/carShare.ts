// Shared helpers that turn a car into a rich "car card" share for WhatsApp:
// a formatted text block (image link + title + price + specs + deep link) plus
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
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const carShareLink = (car: ShareableCar) => `${window.location.origin}/cars/${car.id}`;

export const carPrimaryImage = (car: ShareableCar): string => {
  const isReal = (u?: string) => !!u && (u.startsWith("http") || u.startsWith("/") || u.startsWith("data:"));
  const imgs = Array.isArray(car.images) ? car.images : [];
  const first = imgs.find((u) => typeof u === "string" && isReal(u));
  return first || (isReal(car.image_url) ? car.image_url! : "");
};

// WhatsApp "car card" text block. Includes the photo link first so WhatsApp
// renders an image preview right inside the chat, then title, price, specs and
// the page deep link (which gets its own card preview).
export const buildCarShareMessage = (car: ShareableCar): string => {
  const image = carPrimaryImage(car);
  const specs = [
    car.fuel || "Petrol",
    car.transmission || "Automatic",
    car.mileage ? `${car.mileage.toLocaleString("en-IN")} km` : null,
    car.location || null,
  ].filter(Boolean).join(" • ");
  const lines = [
    ...(image ? [image] : []),
    ``,
    `🚗 *${car.year} ${car.brand} ${car.model}*`,
    `💰 ${formatINR(car.price)}`,
    `✨ ${specs}`,
    ``,
    `🏅 1stCars Certified Pre-Owned`,
    carShareLink(car),
  ];
  return lines.join("\n");
};

export const buildCarOgTitle = (car: ShareableCar) =>
  `${car.year} ${car.brand} ${car.model} | 1stCars Certified`;

export const buildCarOgDescription = (car: ShareableCar) =>
  `Certified ${car.year} ${car.brand} ${car.model} (${car.fuel || "Petrol"}, ${car.transmission || "Automatic"}${car.mileage ? `, ${car.mileage.toLocaleString("en-IN")} km` : ""}) — ${formatINR(car.price)}. 120-point inspected, transparent history, doorstep delivery.`;

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
  document.title = "1stCars - Premium Used Car Marketplace";
  ogSnapshot = null;
};
