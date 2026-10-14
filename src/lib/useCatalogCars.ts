import * as React from "react";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { flattenCarRow } from "@/src/lib/carPersistence";
import { Car } from "@/src/types";

// Cache key for the DB catalog so the merged list paints instantly on next
// visit (and stays in sync across browser tabs via the window "storage" event).
const DB_CACHE_KEY = "1stcars_db_cars_cache";

// ⚡ Single-car fast path: keyed by lowercase id / 8-char short id. Lets a
// WhatsApp deep link paint ONE car instantly without downloading + parsing
// the whole inventory (multi-MB JSONB payloads) first.
const SINGLE_CAR_CACHE_PREFIX = "1stcars_car_cache_";
const SINGLE_CAR_TTL_MS = 10 * 60 * 1000; // 10 min — fresh enough, instant enough.

const readSingleCarCache = (key: string): any | null => {
  if (typeof window === "undefined" || !key) return null;
  try {
    const raw = sessionStorage.getItem(`${SINGLE_CAR_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - Number(parsed.savedAt || 0) > SINGLE_CAR_TTL_MS) return null;
    return parsed.row || null;
  } catch {
    return null;
  }
};

const writeSingleCarCache = (key: string, row: any) => {
  if (typeof window === "undefined" || !key || !row) return;
  try {
    sessionStorage.setItem(
      `${SINGLE_CAR_CACHE_PREFIX}${key}`,
      JSON.stringify({ savedAt: Date.now(), row })
    );
  } catch {
    // storage full / private mode — ignore, the network fetch still works.
  }
};

// Narrow columns for the fast path — everything the detail hero needs, none
// of the heavyweight report/finance/admin columns. Keeps the cold-open fetch
// to a few KB instead of the whole catalog.
export const SINGLE_CAR_COLUMNS =
  "id,brand,model,variant,year,price,km_driven,fuel,transmission,owner_count,city,color,overall_score,status,created_at,image_url,images,payload";

// Fetch exactly ONE car row by full UUID or 8-char short-id prefix (SEO slugs
// like "2021-hyundai-creta-sx-petrol-surat-a1b2c3d4" only carry the prefix).
// Falls back to a prefix match inside the warm localStorage catalog so even a
// same-device revisit resolves with zero network.
export async function fetchSingleCarRow(slugOrId: string): Promise<any | null> {
  const raw = String(slugOrId || "").trim();
  if (!raw) return null;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
  const tail = (raw.split("-").pop() || "").toLowerCase();
  const cacheKeys = [raw.toLowerCase()];
  if (!isUuid && /^[0-9a-f]{8}$/.test(tail)) cacheKeys.push(tail);

  for (const key of cacheKeys) {
    const hit = readSingleCarCache(key);
    if (hit) return hit;
  }

  // Warm catalog fallback (same-device revisit, zero network).
  try {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(DB_CACHE_KEY);
      if (cached) {
        const rows = JSON.parse(cached);
        if (Array.isArray(rows)) {
          const found = isUuid
            ? rows.find((r: any) => String(r?.id || "").toLowerCase() === raw.toLowerCase())
            : rows.find((r: any) =>
                String(r?.id || "").replace(/-/g, "").toLowerCase().startsWith(tail)
              );
          if (found) {
            for (const key of cacheKeys) writeSingleCarCache(key, found);
            return found;
          }
        }
      }
    }
  } catch {
    // corrupted cache — fall through to network
  }

  if (!isRealSupabase) {
    // Mock DB has no ilike operator — read via the client and match locally.
    try {
      const { data } = await supabase.from("cars").select().limit(200);
      const rows = Array.isArray(data) ? data : [];
      const found = isUuid
        ? rows.find((r: any) => String(r?.id || "").toLowerCase() === raw.toLowerCase())
        : rows.find((r: any) =>
            String(r?.id || "").replace(/-/g, "").toLowerCase().startsWith(tail)
          );
      if (found) {
        for (const key of cacheKeys) writeSingleCarCache(key, found);
        return found;
      }
    } catch {
      // ignore — caller shows the catalog loader / not-available state
    }
    return null;
  }

  try {
    const query = isUuid
      ? supabase.from("cars").select(SINGLE_CAR_COLUMNS).eq("id", raw).maybeSingle()
      : supabase.from("cars").select(SINGLE_CAR_COLUMNS).ilike("id", `${tail}%`).limit(5);
    const { data } = await query;
    const row = Array.isArray(data)
      ? data.find((r: any) =>
          String(r?.id || "").replace(/-/g, "").toLowerCase().startsWith(tail)
        ) || data[0] || null
      : data || null;
    if (row) {
      for (const key of cacheKeys) writeSingleCarCache(key, row);
      return row;
    }
  } catch {
    // network/RLS failure — caller falls back to the full catalog path
  }
  return null;
}

const isRealUrl = (value?: string | null) =>
  !!value &&
  value !== "🚙" &&
  value !== "⭐" &&
  (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));

// Normalize a raw Supabase "cars" row into the frontend Car shape, filling in
// defaults for every field the UI relies on (emi, mileage, owners, images, ...).
export function normalizeDbCar(row: any): Car {
  // Real-mode rows store the rich record (images, price_breakup, inspection,
  // ...) in a JSONB "payload" column; flatten it under the row so every field
  // the UI expects is available no matter which mode produced the row.
  // flattenCarRow keeps physical columns authoritative EXCEPT for photos,
  // which live only in payload — a NULL physical image_url/images column must
  // not shadow them (that erased all car card photos).
  const data = flattenCarRow(row);
  const price = Number(data.price) || 0;
  const kmDriven = Number(data.km_driven ?? data.mileage) || 0;
  const imageUrl = isRealUrl(data.image_url) ? data.image_url : undefined;
  const images = Array.isArray(data.images)
    ? data.images.filter(isRealUrl)
    : imageUrl
      ? [imageUrl]
      : [];

  return {
    id: data.id || `db-car-${Math.random().toString(36).substr(2, 9)}`,
    brand: data.brand || "Unknown",
    model: data.model || data.title || "Vehicle",
    year: Number(data.year) || new Date().getFullYear(),
    price,
    emi: Number(data.emi) || Math.round(price / 60),
    location: data.city || data.location || "Surat",
    fuel: data.fuel || "Petrol",
    transmission: data.transmission || "Automatic",
    mileage: kmDriven || Number(data.mileage) || 0,
    bodyType: data.bodyType || "Sedan",
    certified: data.certified !== false && data.is_certified !== false,
    imageBg: "bg-emerald-950/10",
    imageUrl,
    image_url: data.image_url || undefined,
    images,
    featured: data.featured !== false,
    specifications: Array.isArray(data.specifications) ? data.specifications : [],
    features: Array.isArray(data.features) ? data.features : undefined,
    inspectionSummary: data.inspectionSummary || undefined,
    owners: Number(data.owners ?? data.owner_count) || 1,
    km_driven: kmDriven,
    status: data.status || "available",
    cities: Array.isArray(data.cities) ? data.cities : undefined,
    variant: data.variant || undefined,
    color: data.color || undefined,
    regCity: data.regCity || data.city || undefined,
    regYear: data.regYear ? Number(data.regYear) : undefined,
    rtoCode: data.rtoCode || data.reg_number || undefined,
    price_breakup: Array.isArray(data.price_breakup) ? data.price_breakup : undefined,
    created_at: data.created_at
  } as Car;
}

// Only list cars that are actually on sale. Hidden/sold/ended records never
// surface on the public site, no matter what was deleted or edited.
function isListable(car: any) {
  return !car.status || car.status === "available";
}

// Newly uploaded cars sell first: newest publish date (created_at) always leads
// the catalog, on every screen and every reload. Rows without a timestamp sink
// to the bottom instead of breaking the order.
function newestFirst(a: Car, b: Car): number {
  const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
  const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return tb - ta;
}

const toListableCars = (data: any[]) => {
  const listable = data.filter(isListable).map(normalizeDbCar);
  return listable.sort(newestFirst);
};

export interface CatalogState {
  cars: Car[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCatalogCars(): CatalogState {
  // The Supabase "cars" table is the single source of truth for the live
  // inventory. We never fall back to the bundled static demo list, so deleting
  // or publishing cars in the Admin CMS is reflected 1:1 on the public site.
  const [cars, setCars] = React.useState<Car[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(DB_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached)) return toListableCars(cached);
      }
    } catch (e) {
      // ignore corrupted cache
    }
    return [];
  });
  // loading must be truthful from the very first render: when the DB cache is
  // empty (fresh visit, cleared storage, just after a redeploy) the catalog is
  // still being fetched, so callers must show a placeholder instead of the
  // "empty inventory" state. A warm cache means real data is already painted.
  const [loading, setLoading] = React.useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = localStorage.getItem(DB_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        // A warm cache only proves we can paint instantly when it actually
        // holds listable inventory. An empty (or all-hidden) cache must NOT
        // skip the loading state — otherwise BuyCarsView would flash its
        // "No Matching Inventory" card on refresh BEFORE the refetch resolves.
        if (Array.isArray(cached) && cached.filter(isListable).length > 0) return false;
      }
    } catch (e) {
      // corrupted cache — treat as cold
    }
    return true;
  });
  const [error, setError] = React.useState<string | null>(null);

  // Monotonic sequence so overlapping refreshes can never let a stale response
  // overwrite a newer one (the last REQUESTED wins, not the last arrived).
  const seqRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    // Mock mode (localhost without real Supabase creds): the Supabase client
    // is the in-memory mock — seed demo inventory through it so cards,
    // Test-Drive and WhatsApp all work end-to-end (screenshot showed
    // "Could Not Load Inventory / Failed to fetch" otherwise).
    if (!isRealSupabase) {
      try {
        // Mock mode (localhost without real Supabase creds): the SupabaseMockClient
        // already ships demo inventory in its default "cars" table, so a plain
        // read returns cars and cards / Test-Drive / WhatsApp all work end-to-end
        // (this used to surface as "Could Not Load Inventory / Failed to fetch").
        const { data, error: queryError } = await supabase
          .from("cars")
          .select()
          .order("created_at", { ascending: false });
        if (seq !== seqRef.current) return;
        setLoading(false);
        if (queryError) {
          setError(queryError.message || "Failed to load the vehicle catalog.");
          return;
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(DB_CACHE_KEY, JSON.stringify(data));
        }
        setError(null);
        setCars(toListableCars(data));
      } catch (e: any) {
        if (seq !== seqRef.current) return;
        setLoading(false);
        setError(e?.message || "Failed to load the vehicle catalog.");
      }
      return;
    }
    try {
      const { data, error: queryError } = await supabase
        .from("cars")
        .select()
        .order("created_at", { ascending: false });
      if (seq !== seqRef.current) return;
      setLoading(false);
      if (queryError) {
        setError(queryError.message || "Failed to load the vehicle catalog.");
        return;
      }
      if (Array.isArray(data)) {
        if (typeof window !== "undefined") {
          localStorage.setItem(DB_CACHE_KEY, JSON.stringify(data));
        }
        setError(null);
        setCars(toListableCars(data));
      }
    } catch (e: any) {
      if (seq !== seqRef.current) return;
      setLoading(false);
      setError(e?.message || "Failed to load the vehicle catalog.");
    }
  }, []);

  React.useEffect(() => {
    refresh();

    // Admin CMS dispatches this after every create/update/delete, so the
    // public catalog refreshes instantly.
    const handleSettingsUpdated = () => refresh();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DB_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCars(toListableCars(parsed));
        } catch (err) {
          // ignore
        }
      }
    };

    window.addEventListener("1stcars_settings_updated", handleSettingsUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      seqRef.current++;
      window.removeEventListener("1stcars_settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  return { cars, loading, error, refresh };
}
