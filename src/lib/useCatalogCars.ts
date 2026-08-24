import * as React from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { Car } from "@/src/types";

// Cache key for the DB catalog so the merged list paints instantly on next
// visit (and stays in sync across browser tabs via the window "storage" event).
const DB_CACHE_KEY = "1stcars_db_cars_cache";

const isRealUrl = (value?: string | null) =>
  !!value &&
  value !== "🚙" &&
  value !== "⭐" &&
  (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));

// Normalize a raw Supabase "cars" row into the frontend Car shape, filling in
// defaults for every field the UI relies on (emi, mileage, owners, images, ...).
function normalizeDbCar(row: any): Car {
  // Real-mode rows store the rich record (images, price_breakup, inspection,
  // ...) in a JSONB "payload" column; merge it under the row so every field the
  // UI expects is available no matter which mode produced the row.
  const data = { ...(row.payload || {}), ...row };
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
        if (Array.isArray(cached)) return cached.filter(isListable).map(normalizeDbCar);
      }
    } catch (e) {
      // ignore corrupted cache
    }
    return [];
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Monotonic sequence so overlapping refreshes can never let a stale response
  // overwrite a newer one (the last REQUESTED wins, not the last arrived).
  const seqRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase.from("cars").select();
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
        setCars(data.filter(isListable).map(normalizeDbCar));
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
          if (Array.isArray(parsed)) setCars(parsed.filter(isListable).map(normalizeDbCar));
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
