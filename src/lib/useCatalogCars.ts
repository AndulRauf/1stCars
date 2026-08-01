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
  const price = Number(row.price) || 0;
  const kmDriven = Number(row.km_driven ?? row.mileage) || 0;
  const imageUrl = isRealUrl(row.image_url) ? row.image_url : undefined;
  const images = Array.isArray(row.images)
    ? row.images.filter(isRealUrl)
    : imageUrl
      ? [imageUrl]
      : [];

  return {
    id: row.id || `db-car-${Math.random().toString(36).substr(2, 9)}`,
    brand: row.brand || "Unknown",
    model: row.model || row.title || "Vehicle",
    year: Number(row.year) || new Date().getFullYear(),
    price,
    emi: Number(row.emi) || Math.round(price / 60),
    location: row.location || row.city || "Surat",
    fuel: row.fuel || "Petrol",
    transmission: row.transmission || "Automatic",
    mileage: kmDriven || Number(row.mileage) || 0,
    bodyType: row.bodyType || "Sedan",
    certified: row.certified !== false && row.is_certified !== false,
    imageBg: "bg-emerald-950/10",
    imageUrl,
    image_url: row.image_url || undefined,
    images,
    featured: row.featured !== false,
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    features: Array.isArray(row.features) ? row.features : undefined,
    inspectionSummary: row.inspectionSummary || undefined,
    owners: Number(row.owners ?? row.owner_count) || 1,
    km_driven: kmDriven,
    status: row.status || "available",
    cities: Array.isArray(row.cities) ? row.cities : undefined,
    variant: row.variant || undefined,
    color: row.color || undefined,
    regCity: row.regCity || row.city || undefined,
    regYear: row.regYear ? Number(row.regYear) : undefined,
    rtoCode: row.rtoCode || row.reg_number || undefined,
    price_breakup: Array.isArray(row.price_breakup) ? row.price_breakup : undefined,
    created_at: row.created_at
  } as Car;
}

// Only list cars that are actually on sale. Hidden/sold/ended records never
// surface on the public site, no matter what was deleted or edited.
function isListable(car: any) {
  return !car.status || car.status === "available";
}

export function useCatalogCars(): Car[] {
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

  React.useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      try {
        const { data } = await supabase.from("cars").select();
        if (disposed) return;
        if (Array.isArray(data)) {
          if (typeof window !== "undefined") {
            localStorage.setItem(DB_CACHE_KEY, JSON.stringify(data));
          }
          setCars(data.filter(isListable).map(normalizeDbCar));
        }
      } catch (e) {
        console.error("Failed to load cars from catalog:", e);
      }
    };

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
      disposed = true;
      window.removeEventListener("1stcars_settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return cars;
}
