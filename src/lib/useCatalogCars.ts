import * as React from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { CARS_DATA } from "@/src/data/cars";
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

function isListable(car: any) {
  return !car.status || car.status === "available";
}

function mergeCatalogs(dbRows: any[]): Car[] {
  const dbCars = dbRows.filter(isListable).map(normalizeDbCar);
  // Newest listings first, then the curated static catalog. Dedupe by id so a
  // DB car with the same id as a static one is never rendered twice.
  const seen = new Set<string>();
  const merged: Car[] = [];
  const push = (car: Car) => {
    if (seen.has(car.id)) return;
    seen.add(car.id);
    merged.push(car);
  };
  dbCars
    .slice()
    .sort((a, b) => String((b as any).created_at || "").localeCompare(String((a as any).created_at || "")))
    .forEach(push);
  CARS_DATA.forEach(push);
  return merged;
}

export function useCatalogCars(): Car[] {
  const [cars, setCars] = React.useState<Car[]>(() => {
    if (typeof window === "undefined") return CARS_DATA;
    try {
      const raw = localStorage.getItem(DB_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached)) return mergeCatalogs(cached);
      }
    } catch (e) {
      // ignore corrupted cache
    }
    return CARS_DATA;
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
          setCars(mergeCatalogs(data));
        }
      } catch (e) {
        console.error("Failed to load cars from catalog:", e);
      }
    };

    refresh();

    const handleSettingsUpdated = () => refresh();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DB_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCars(mergeCatalogs(parsed));
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
