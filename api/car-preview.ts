// 1stCars — car preview for crawlers (FIX-3).
// vercel.json rewrites /cars/:id to this API for plain-HTTP crawlers
// (WhatsApp / Facebook / Google without JS). This file was MISSING,
// so every car share/preview returned 404.
const ORIGIN = "https://www.1stcars.in";
const escapeHtml = (t: string): string => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const formatINR = (n: number) => { try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0); } catch { return `Rs.${n}`; } };
export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const rawId = String(req?.query?.id || "").split("?")[0].split("/")[0];
  const tail = (rawId.split("-").pop() || "").toLowerCase();
  const isShortId = /^[0-9a-f]{8}$/.test(tail);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  let car: any = null;
  if (supabaseUrl && supabaseKey && rawId) {
    try {
      const sel = "select=id,brand,model,year,price,fuel,transmission,mileage,km_driven,city,location,image_url,images,variant,status";
      const q = isUuid ? `id=eq.${encodeURIComponent(rawId)}` : isShortId ? `id=like.${tail}%` : `id=eq.${encodeURIComponent(rawId)}`;
      const r = await fetch(`${supabaseUrl}/rest/v1/cars?${q}&${sel}&limit=5`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
      if (r.ok) {
        const rows: any[] = await r.json();
        if (Array.isArray(rows) && rows.length > 0) {
          car = isShortId && !isUuid ? rows.find((x: any) => String(x?.id || "").replace(/-/g, "").toLowerCase().startsWith(tail)) || rows[0] : rows[0];
        }
      }
    } catch { /* generic preview fallback below */ }
  }
  const title = car ? `${car.year || ""} ${car.brand || ""} ${car.model || ""} | 1stCars Certified`.trim() : "1stCars | Certified Premium Pre-Owned Cars";
  const price = car ? formatINR(Number(car.price) || 0) : "";
  const km = car ? Number(car.km_driven ?? car.mileage) || 0 : 0;
  const desc = car ? `Certified ${car.year || ""} ${car.brand || ""} ${car.model || ""} (${car.fuel || "Petrol"}, ${car.transmission || "Automatic"}${km ? `, ${km.toLocaleString("en-IN")} km` : ""}). ${price}. 120-point inspected in Surat — book a test drive.`.trim() : "120-point inspected, single-owner, accident-free vehicles in Surat with doorstep delivery.";
  const rawImg = Array.isArray(car?.images) && car.images[0] ? car.images[0] : car?.image_url || `${ORIGIN}/og-image.jpg?v=5`;
  const image = String(rawImg || "").startsWith("http") ? rawImg : `${ORIGIN}${String(rawImg || "").startsWith("/") ? "" : "/"}${rawImg}`;
  const pageUrl = `${ORIGIN}/cars/${encodeURIComponent(rawId)}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(desc)}" /><link rel="canonical" href="${escapeHtml(pageUrl)}" /><meta property="og:type" content="website" /><meta property="og:url" content="${escapeHtml(pageUrl)}" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(desc)}" /><meta property="og:image" content="${escapeHtml(image)}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(title)}" /><meta name="twitter:description" content="${escapeHtml(desc)}" /><meta name="twitter:image" content="${escapeHtml(image)}" /><meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" /></head><body><main style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:32px 16px;"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(desc)}</p><p><a href="${escapeHtml(pageUrl)}">View this car and book a test drive on 1stCars</a></p><p>Call us: <a href="tel:+918866377722">+91 8866377722</a></p></main><script>window.location.replace(${JSON.stringify(pageUrl)});</script></body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
}
