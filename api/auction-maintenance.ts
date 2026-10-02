// 1stCars — server-side auction maintenance (Vercel Cron).
// Moves SCHEDULED auctions to LIVE at starts_at and auto-closes
// LIVE/EXTENDED ones past ends_at via the canonical
// public.auction_run_maintenance() RPC, so auctions never depend on a
// visitor's browser being open. The client-side poller in App.tsx stays as
// a best-effort backup only.
export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  // Optional shared-secret guard: when AUCTION_CRON_SECRET is set, the cron
  // request must carry it as ?secret= or Authorization: Bearer.
  const expected = process.env.AUCTION_CRON_SECRET || "";
  if (expected) {
    const url = new URL(req.url || "/api/auction-maintenance", "https://1stcars.in");
    const provided =
      String(url.searchParams.get("secret") || "") ||
      String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    if (provided !== expected) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    res.status(500).json({ ok: false, error: "Supabase env vars missing" });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/auction_run_maintenance`, {
      method: "POST",
      headers: {
        apikey: serviceKey || anonKey,
        Authorization: `Bearer ${serviceKey || anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      res.status(502).json({ ok: false, error: `RPC failed: ${response.status} ${text.slice(0, 200)}` });
      return;
    }
    const data = await response.json().catch(() => ({}));
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      started: Number((data as any)?.started || 0),
      closed: Number((data as any)?.closed || 0),
      at: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
