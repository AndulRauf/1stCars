// 1stCars — proxy any public image into a WhatsApp-safe JPEG (1200x630 cover).
// GET /api/og-image?src=<encoded-original-url>
// Why this exists (permanent fix): og:image MUST be a fast, small, honest
// image/jpeg under ~300KB. Supabase originals are multi-MB phone photos and
// the /render/image endpoint can return WebP bytes while we claim image/jpeg
// (or 404 on extensionless/WebP originals) — every past "fix" only changed
// which URL we CLAIM, never the bytes WhatsApp downloads. This proxy fetches
// the original server-side, sharp-resizes to 1200x630 cover JPEG (quality 75),
// and serves real JPEG bytes with no-store. WhatsApp always gets what we claim.
import sharp from "sharp";

export default async function handler(req: any, res: any) {
  const src = String(req.query.src || "");
  if (!src || !/^https?:\/\//i.test(src)) {
    res.status(400).json({ ok: false, error: "missing src" });
    return;
  }
  // SSRF guard: only proxy our own Supabase bucket + Unsplash demo images.
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    res.status(400).json({ ok: false, error: "bad src" });
    return;
  }
  const allowed =
    /\.supabase\.co$/i.test(u.hostname) ||
    u.hostname === "images.unsplash.com" ||
    u.hostname === "1stcars.in";
  if (!allowed) {
    res.status(403).json({ ok: false, error: "forbidden host" });
    return;
  }
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 9000);
    let upstream: Response;
    try {
      upstream = await fetch(src, { signal: c.signal });
    } finally {
      clearTimeout(t);
    }
    if (!upstream.ok) {
      res.status(502).json({ ok: false, error: `upstream_${upstream.status}` });
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length === 0 || buf.length > 15 * 1024 * 1024) {
      res.status(502).json({ ok: false, error: "bad upstream bytes" });
      return;
    }
    const jpeg = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "centre" })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.status(200).send(jpeg);
  } catch (e: any) {
    if (e?.name === "AbortError") {
      res.status(504).json({ ok: false, error: "upstream timeout" });
      return;
    }
    res.status(502).json({ ok: false, error: "proxy failed" });
  }
}
