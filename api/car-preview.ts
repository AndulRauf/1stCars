// 1stCars — car preview shim (canonical handler lives at api/car-preview/[id].ts).
// vercel.json rewrites bot UA hits on /cars/:id to /api/car-preview/:id.
// This extensionless file exists ONLY so direct GETs to /api/car-preview (no id)
// don't 404: it renders a generic site preview. All real car OG HTML (photo +
// title + price, Supabase 1200x630 render variant) comes from [id].ts.
const ORIGIN = "https://1stcars.in";
const escapeHtml = (t: string): string => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export default async function handler(req: any, res: any) {
  const title = "1stCars | Certified Premium Pre-Owned Cars";
  const desc = "120-point inspected, single-owner, accident-free vehicles in Surat with doorstep delivery.";
  const image = `${ORIGIN}/og-image.jpg?v=5`;
  const pageUrl = `${ORIGIN}/buy-cars`;
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(desc)}" /><link rel="canonical" href="${escapeHtml(pageUrl)}" /><meta property="og:type" content="website" /><meta property="og:url" content="${escapeHtml(pageUrl)}" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(desc)}" /><meta property="og:image" content="${escapeHtml(image)}" /><meta property="og:image:secure_url" content="${escapeHtml(image)}" /><meta property="og:image:type" content="image/jpeg" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="1stCars — Certified Premium Pre-Owned Cars" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(title)}" /><meta name="twitter:description" content="${escapeHtml(desc)}" /><meta name="twitter:image" content="${escapeHtml(image)}" /><meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" /></head><body><main style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:32px 16px;"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(desc)}</p><p><a href="${escapeHtml(pageUrl)}">Browse certified cars on 1stCars</a></p><p>Call us: <a href="tel:+918866377722">+91 8866377722</a></p></main><script>window.location.replace(${JSON.stringify(pageUrl)});</script></body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
}
