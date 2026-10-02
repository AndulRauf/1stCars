// 1stCars — dynamic Open Graph preview for car pages.
// Serves crawlable HTML (WhatsApp / Facebook / Twitter) with the car's
// photo + title, then redirects human browsers to the SPA car detail page.
export default async function handler(req: any, res: any) {
  const carId: string = String(req.query.id || "").replace(/[^a-zA-Z0-9-]/g, "");
  const origin = `https://1stcars.in`;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

  const escapeHtml = (text: any): string =>
    String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  let title = "1stCars | Certified Premium Used Cars";
  let description = "1stCars, the premier marketplace for certified pre-owned vehicles. 120-point inspected, single owned, zero tampered odometers.";
  let image = `${origin}/og-image.jpg?v=5`;
  let redirect = "/";
  let carFound = false;
  let carJsonLd = "";
  let carMissing = false;

  // OAuth callback guard (defense-in-depth): if this endpoint is ever reached
  // with Supabase PKCE params (code/state/error) or the booking re-open flag,
  // they must NEVER be swallowed by the crawler redirect — forward them so the
  // SPA can finish the Google sign-in. Normally vercel.json routes these to
  // the SPA before they reach here, but this protects direct hits too.
  const oauthCode = String(req.query.code || "");
  const oauthState = String(req.query.state || "");
  const oauthError = String(req.query.error || "");
  const openBooking = req.query.open_booking === "1";
  const hasOAuthParams = !!(oauthCode || oauthState || oauthError || openBooking);

  if (carId) {
    try {
      // select=* keeps this resilient to schema drift: photos live in the
      // JSONB `payload` column (see buildCarRecord), while some live databases
      // ALSO carry physical image_url/images columns that stay NULL. Reading
      // the whole row lets us resolve the best photo from either location.
      const response = await fetch(
        `${supabaseUrl}/rest/v1/cars?select=*&id=eq.${carId}&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (response.ok) {
        const cars: any[] = await response.json();
        const car = cars && cars[0];
        carMissing = !car;
        if (car) {
          carFound = true;
          const carName = `${car.year || ""} ${car.brand || ""} ${car.model || ""}`.trim() || car.title || "Certified Vehicle";
          title = `${carName} | 1stCars Certified Pre-Owned`;
          const priceText = car.price ? ` ₹${Number(car.price).toLocaleString("en-IN")}` : "";
          description = `${carName}${priceText}. 1stCars Certified. 120-point inspected, transparent history, doorstep delivery across Gujarat.`;
          redirect = `/buy-cars?carId=${encodeURIComponent(carId)}`;

          // Resolve the photo exactly like flattenCarRow does on the client:
          // the row's copies win only when they actually hold usable values,
          // otherwise the payload copies (where buildCarRecord stores photos).
          const payloadRecord = (car && typeof car === "object" && car.payload) || {};
          const rowImages = Array.isArray(car.images) ? car.images : null;
          const payloadImages = Array.isArray(payloadRecord.images) ? payloadRecord.images : null;
          const images: any[] = (rowImages && rowImages.length > 0 ? rowImages : payloadImages) || [];
          const pickUrl = (v: any) =>
            typeof v === "string" && v !== "🚙" && v !== "⭐" ? v : "";
          const rawImageUrl = pickUrl(car.image_url) || pickUrl(payloadRecord.image_url);
          const candidate =
            images.find((u: any) => typeof u === "string" && u.startsWith("http")) ||
            (rawImageUrl.startsWith("http") ? rawImageUrl : null);
          if (candidate) {
            image = candidate;
          } else if (rawImageUrl.startsWith("/")) {
            image = `${origin}${rawImageUrl}`;
          }

          // Structured data for rich results on real car pages only.
          try {
            const carLd: any = {
              "@context": "https://schema.org",
              "@type": "Car",
              name: carName,
              brand: car.brand || undefined,
              model: car.model || undefined,
              vehicleModelDate: car.year ? String(car.year) : undefined,
              url: `${origin}/cars/${carId}`,
              image,
              offers: car.price
                ? {
                    "@type": "Offer",
                    price: Number(car.price),
                    priceCurrency: "INR",
                    availability: "https://schema.org/InStock",
                    url: `${origin}/cars/${carId}`
                  }
                : undefined
            };
            carJsonLd = `<script type="application/ld+json">${JSON.stringify(carLd).replace(/</g, "\\u003c")}</script>`;
          } catch {
            carJsonLd = "";
          }
        } else {
          // Unknown car id at the HTTP layer: signal a real 404 + noindex so
          // search engines drop bogus /cars/:id URLs instead of indexing them.
          // Only when the DB lookup actually succeeded (env present) — if the
          // lookup itself failed we keep the generic 200 preview as before.
          if (carMissing) {
            title = "Car not found | 1stCars";
            description = "This vehicle is no longer available. Browse certified pre-owned cars on 1stCars.";
            redirect = "/buy-cars";
          }
        }
      }
    } catch (e) {
      // Fall back to the generic preview if the fetch fails.
    }
  }

  // Forward any OAuth/booking query params that reached here (defense-in-depth)
  // so a direct hit never drops the Supabase PKCE code or the booking re-open
  // flag. The SPA then finishes the exchange and/or re-opens the modal.
  const passthrough = new URLSearchParams();
  if (oauthError) passthrough.set("error", oauthError);
  if (oauthCode) passthrough.set("code", oauthCode);
  if (oauthState) passthrough.set("state", oauthState);
  if (openBooking) passthrough.set("open_booking", "1");
  const passthroughStr = passthrough.toString();
  if (passthroughStr) {
    redirect += (redirect.includes("?") ? "&" : "?") + passthroughStr;
  }

  const isMissing = carMissing && !carFound;
  const robotsMeta = !isMissing
    ? `<meta name="robots" content="index, follow" />`
    : `<meta name="robots" content="noindex, follow" />`;
  const canonicalHref = !isMissing
    ? `${origin}/cars/${escapeHtml(carId)}`
    : `${origin}/buy-cars`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${robotsMeta}
    <link rel="canonical" href="${canonicalHref}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalHref}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalHref}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${image}" />
    ${carJsonLd}
    <script>location.replace("${redirect}");</script>
  </head>
  <body>
    <p>Redirecting to 1stCars…</p>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // OAuth callbacks must never be cached — a stale CDN copy would drop the
  // auth code. Crawler previews keep the short public cache as before.
  // Missing cars are never cached so a newly published id becomes live fast.
  res.setHeader("Cache-Control", isMissing || hasOAuthParams ? "no-store" : "public, max-age=600, s-maxage=3600");
  res.status(isMissing ? 404 : 200).send(html);
}
