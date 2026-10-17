// 1stCars — dynamic Open Graph preview for car pages.
// Serves crawlable HTML (WhatsApp / Facebook / Twitter) with the car's
// photo + title, then redirects human browsers to the SPA car detail page.
export default async function handler(req: any, res: any) {
  const carId: string = String(req.query.id || req.query.carId || "").replace(/[^a-zA-Z0-9-]/g, "");
  const origin = `https://1stcars.in`;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
  let originalImage = "";
  // Declared og:image:type for the emitted image. It must describe the REAL
  // bytes WhatsApp will download — a mismatched claim (e.g. image/jpeg on
  // WebP bytes) makes the crawler discard the preview entirely.
  let imageType = "";
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

  // ⚡ FAST PATH: human browsers never need the DB lookup. vercel.json already
  // routes humans straight to the SPA (bot-only rewrite), but if a human ever
  // lands here directly (old cache, header mismatch), 302 instantly WITHOUT
  // waiting for Supabase — no HTML shell, no meta-refresh hop.
  const ua: string = String(req.headers?.["user-agent"] || req.headers?.["User-Agent"] || "");
  const isBotUa = /whatsapp|facebookexternalhit|facebookcatalog|twitterbot|x-twitter|linkedinbot|slackbot|telegrambot|discordbot|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|pinterest|embedly|quora|outbrain|vkshare|weibo|line|skype|viber/i.test(ua);
  if (carId && !isBotUa) {
    const passthroughEarly = new URLSearchParams();
    if (oauthError) passthroughEarly.set("error", oauthError);
    if (oauthCode) passthroughEarly.set("code", oauthCode);
    if (oauthState) passthroughEarly.set("state", oauthState);
    if (openBooking) passthroughEarly.set("open_booking", "1");
    const qs = passthroughEarly.toString();
    const target = `/cars/${encodeURIComponent(carId)}${qs ? `?${qs}` : ""}`;
    res.setHeader("Location", target);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "User-Agent");
    res.status(302).end();
    return;
  }

  // Resolve SEO slugs ("2021-hyundai-creta-petrol-surat-a1b2c3d4") to the real
  // row: the share link only carries the 8-char UUID prefix as its tail.
  const tailMatch = /(?:^|-)([0-9a-fA-F]{8})$/.exec(carId);
  const shortTail = tailMatch ? tailMatch[1].toLowerCase() : "";
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(carId);
  const isShortSlug = !isUuid && /^[0-9a-fA-F]{8}$/.test(shortTail);

  if (carId) {
    try {
      // Narrow columns only (NOT select=*): the full row carries multi-KB
      // JSONB payloads + 120-point reports that only slow the preview fetch.
      const cols = "id,brand,model,year,price,title,fuel,transmission,city,image_url,images,status,payload";
      const query = isUuid
        ? `select=${cols}&id=eq.${encodeURIComponent(carId)}&limit=1`
        : isShortSlug
          ? `select=${cols}&id=ilike.${encodeURIComponent(shortTail)}%&limit=5`
          : `select=${cols}&id=eq.${encodeURIComponent(carId)}&limit=1`;
      const response = await fetch(
        `${supabaseUrl}/rest/v1/cars?${query}`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (response.ok) {
        const cars: any[] = await response.json();
        const car = Array.isArray(cars)
          ? (isShortSlug
              ? cars.find((c: any) => String(c?.id || "").replace(/-/g, "").toLowerCase().startsWith(shortTail)) || cars[0]
              : cars[0])
          : null;
        carMissing = !car;
        if (car) {
          carFound = true;
          const carName = `${car.year || ""} ${car.brand || ""} ${car.model || ""}`.trim() || car.title || "Certified Vehicle";
          title = `${carName} | 1stCars Certified Pre-Owned`;
          const priceText = car.price ? ` ₹${Number(car.price).toLocaleString("en-IN")}` : "";
          description = `${carName}${priceText}. 1stCars Certified. 120-point inspected, transparent history, doorstep delivery across Gujarat.`;
          // Deep link straight to the SPA detail route (NOT /buy-cars?carId=):
          // one less client-side navigation = instant open from WhatsApp.
          redirect = `/cars/${encodeURIComponent(carId)}`;

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
            originalImage = candidate;
            imageType = /\.png(\?|#|$)/i.test(candidate)
              ? "image/png"
              : /\.webp(\?|#|$)/i.test(candidate)
                ? "image/webp"
                : /\.jpe?g(\?|#|$)/i.test(candidate)
                  ? "image/jpeg"
                  : /\/object\/public\//i.test(candidate)
                    ? ""
                    : "";
          } else if (rawImageUrl.startsWith("/")) {
            image = `${origin}${rawImageUrl}`;
            imageType = /\.png(\?|#|$)/i.test(rawImageUrl)
              ? "image/png"
              : "image/jpeg";
          } else {
            // Generic site fallback (og-image.jpg is a real JPEG).
            imageType = "image/jpeg";
          }
          // Sharp Status/chat previews need an EXACT 1200x630 JPEG: serving a
          // multi-MB portrait phone photo with 1200x630 dimension tags makes
          // WhatsApp crop + downscale it into a blurry thumbnail.
          //
          // WhatsApp only renders JPEG/PNG og:images reliably. Supabase's
          // imgproxy stack auto-negotiates WebP off headers/UA and can return
          // WebP BYTES for the render endpoint even when the tag claims
          // image/jpeg — a mismatch that makes the crawler drop the photo
          // entirely. And ?format=jpg 404s for extensionless WebP originals.
          // So: use the render variant ONLY when the stored original is
          // really a .jpg (guaranteed JPEG bytes back); otherwise keep the
          // original bytes with an HONEST type tag.
          if (originalImage) {
            const im = /^https:\/\/([^/]+\.supabase\.co)\/storage\/v1\/object\/public\/([^?#]+)/.exec(originalImage);
            if (im) {
              if (/\.(jpe?g)(\?|#|$)/i.test(originalImage) || /\.(jpe?g)$/i.test(im[2])) {
                image = `https://${im[1]}/storage/v1/render/image/public/${im[2]}?width=1200&height=630&resize=cover&quality=80`;
                imageType = "image/jpeg";
              } else if (/\.png(\?|#|$)/i.test(originalImage) || /\.png$/i.test(im[2])) {
                image = originalImage;
                imageType = "image/png";
              } else {
                // WebP / extensionless original: serve bytes as-is with an
                // honest tag (or none) — never claim image/jpeg falsely.
                image = originalImage;
                imageType = /\.webp(\?|#|$)/i.test(originalImage) ? "image/webp" : "";
              }
            } else if (/^https?:\/\//i.test(originalImage)) {
              // Non-Supabase absolute URL (e.g. Unsplash): force the CDN to
              // return real JPEG bytes so WhatsApp always gets image/jpeg.
              try {
                const u = new URL(originalImage);
                if (/images\.unsplash\.com$/i.test(u.hostname)) {
                  u.searchParams.set("fm", "jpg");
                  u.searchParams.set("fit", "crop");
                  u.searchParams.set("w", "1200");
                  u.searchParams.set("h", "630");
                  u.searchParams.set("q", "80");
                  image = u.toString();
                  imageType = "image/jpeg";
                }
              } catch { /* keep candidate + inferred type */ }
            }
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

  // Human redirect target as an ABSOLUTE URL. The previous build used an
  // inline-only `<script>location.replace("/buy-cars?...")</script>`, but the
  // site's global Content-Security-Policy (`script-src 'self'`, no
  // 'unsafe-inline') blocks inline scripts — so taps on shared WhatsApp links
  // got stuck on the "Redirecting to 1stCars…" page forever. A
  // `<meta http-equiv="refresh">` redirect is NOT governed by `script-src`,
  // so it works even when inline JS is blocked or disabled. The JS redirect
  // is kept as a progressive enhancement; the meta refresh + plain link are
  // the reliable path.
  const redirectAbs = redirect.startsWith("http")
    ? redirect
    : `${origin}${redirect.startsWith("/") ? redirect : `/${redirect}`}`;
  const redirectAttr = escapeHtml(redirectAbs);
  const imageAttr = escapeHtml(image);
  // Single og:image only: listing BOTH the 1200x630 render variant AND the
  // multi-MB original made WhatsApp fetch the wrong one (or give up and show
  // no photo). The render variant is the primary; if it ever 404s the
  // crawler falls back to the page with no image rather than a broken card.
  const imageAlt = escapeHtml(carFound ? title : "1stCars certified pre-owned cars");
  // imageType always describes the REAL bytes of `image` (tracked alongside
  // every assignment above). Unknown/extensionless originals emit NO type tag
  // at all — the crawler sniffs the bytes — instead of a false image/jpeg
  // claim that gets the preview discarded.
  const imageTypeTag = imageType
    ? `\n    <meta property="og:image:type" content="${imageType}" />`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${robotsMeta}
    <link rel="canonical" href="${canonicalHref}" />
    <meta http-equiv="refresh" content="0;url=${redirectAttr}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalHref}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageAttr}" />
    <meta property="og:image:secure_url" content="${imageAttr}" />${imageTypeTag}
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalHref}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageAttr}" />
    <meta name="twitter:image:alt" content="${imageAlt}" />
    ${carJsonLd}
    <script>try{location.replace(${JSON.stringify(redirectAbs)});}catch(e){location.href=${JSON.stringify(redirectAbs)};}</script>
  </head>
  <body>
    <main style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:48px 20px;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 8px;">Opening your car on 1stCars…</h1>
      <p style="font-size:14px;color:#555;margin:0 0 20px;">If you are not redirected automatically, tap the button below.</p>
      <p><a href="${redirectAttr}" style="display:inline-block;background:#135D38;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:999px;">View Car on 1stCars</a></p>
    </main>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Vary on UA: the same /cars/:id URL serves OG HTML to bots and a 302 to
  // humans (see fast path above) — the CDN must never mix the two.
  res.setHeader("Vary", "User-Agent, Origin");
  // OAuth callbacks must never be cached — a stale CDN copy would drop the
  // auth code. Crawler previews keep the short public cache as before.
  // Missing cars are never cached so a newly published id becomes live fast.
  res.setHeader("Cache-Control", isMissing || hasOAuthParams ? "no-store" : "public, max-age=600, s-maxage=3600");
  res.status(isMissing ? 404 : 200).send(html);
}
