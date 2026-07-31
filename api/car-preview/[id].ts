// 1stCars — dynamic Open Graph preview for car pages.
// Serves crawlable HTML (WhatsApp / Facebook / Twitter) with the car's
// photo + title, then redirects human browsers to the SPA car detail page.
export default async function handler(req: any, res: any) {
  const carId: string = String(req.query.id || "").replace(/[^a-zA-Z0-9-]/g, "");
  const origin = `https://1st-cars-git-main-raufshaikh88-5167s-projects.vercel.app`;

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
  let description = "1stCars — the premier marketplace for certified pre-owned vehicles. 120-point inspected, single owned, zero tampered odometers.";
  let image = `${origin}/og-image.jpg?v=2`;
  let redirect = "/";

  if (carId) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/cars?select=id,title,brand,model,year,price,city,image_url,images&id=eq.${carId}&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (response.ok) {
        const cars: any[] = await response.json();
        const car = cars && cars[0];
        if (car) {
          const carName = `${car.year || ""} ${car.brand || ""} ${car.model || ""}`.trim() || car.title || "Certified Vehicle";
          title = `${carName} | 1stCars Certified Pre-Owned`;
          const priceText = car.price ? ` ₹${Number(car.price).toLocaleString("en-IN")}` : "";
          description = `${carName}${priceText} — 1stCars Certified. 120-point inspected, transparent history, doorstep delivery across Gujarat.`;
          redirect = `/buy-cars?carId=${encodeURIComponent(carId)}`;

          const images: any[] = Array.isArray(car.images) ? car.images : [];
          const candidate =
            images.find((u: any) => typeof u === "string" && u.startsWith("http")) ||
            (typeof car.image_url === "string" && car.image_url.startsWith("http") ? car.image_url : null);
          if (candidate) {
            image = candidate;
          } else if (typeof car.image_url === "string" && car.image_url.startsWith("/")) {
            image = `${origin}${car.image_url}`;
          }
        }
      }
    } catch (e) {
      // Fall back to the generic preview if the fetch fails.
    }
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${origin}/cars/${escapeHtml(carId)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${origin}/cars/${escapeHtml(carId)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${origin}/cars/${escapeHtml(carId)}" />
    <meta property="twitter:title" content="${escapeHtml(title)}" />
    <meta property="twitter:description" content="${escapeHtml(description)}" />
    <meta property="twitter:image" content="${image}" />
    <script>location.replace("${redirect}");</script>
  </head>
  <body>
    <p>Redirecting to 1stCars…</p>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
  res.status(200).send(html);
}
