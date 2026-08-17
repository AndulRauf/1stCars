// 1stCars — dynamic sitemap (LOW-18).
// Serves a fresh XML sitemap that merges the static routes with every live
// car detail page, so newly published inventory is crawlable without manual
// edits to public/sitemap.xml. robots.txt points here.
export default async function handler(req: any, res: any) {
  const origin = "https://1stcars.in";
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

  const escapeXml = (text: string): string =>
    String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const today = new Date().toISOString().slice(0, 10);

  const staticPages: Array<[string, string, string]> = [
    ["/", "daily", "1.0"],
    ["/buy-cars", "daily", "0.9"],
    ["/sell-car", "weekly", "0.8"],
    ["/certification", "monthly", "0.7"],
    ["/about-us", "monthly", "0.5"],
    ["/faq", "monthly", "0.4"],
    ["/auctions", "weekly", "0.6"]
  ];

  const urls: string[] = staticPages.map(
    ([loc, freq, prio]) =>
      `  <url>\n    <loc>${origin}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`
  );

  let carCount = 0;
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/cars?select=id,updated_at,status&status=in.(available,listed,ready_for_sale,reserved)&limit=1000`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (response.ok) {
        const cars: any[] = await response.json();
        for (const car of cars) {
          if (!car || !car.id) continue;
          const lastmod = car.updated_at ? String(car.updated_at).slice(0, 10) : today;
          urls.push(
            `  <url>\n    <loc>${origin}/cars/${escapeXml(String(car.id))}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
          );
          carCount += 1;
        }
      }
    } catch (e) {
      // Fall back to the static routes only.
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(xml);
}
