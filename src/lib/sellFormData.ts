import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import {
  OFFICIAL_120_CATEGORIES, Inspection120Category,
  INSPECTION_FORM_STORAGE_KEY, INSPECTION_FORM_SETTING_KEY
} from "@/src/data/inspection120Data";

export interface SellModel {
  name: string;
  category: string;
  years: string;
  image: string;
  variants: string[];
}

export interface SellBrandEntry {
  logo: string;
  isPopular: boolean;
  models: SellModel[];
}

export type SellCatalog = Record<string, SellBrandEntry>;

export interface CatalogStoragePayload {
  removed: string[];
  brands: Record<string, SellBrandEntry>;
}

export const SELL_CATALOG_STORAGE_KEY = "1stcars_cms_sell_catalog";
export const SELL_CATALOG_SETTING_KEY = "sell_catalog";

export const DEFAULT_POPULAR_SELL_BRANDS = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota",
  "Kia", "Renault", "Volkswagen", "Skoda", "Ford", "MG",
  "Force", "ICML", "San Motors", "DC Design", "Reva",
  "Nissan", "Fiat", "Chevrolet",
  "BMW", "Audi", "Mercedes-Benz", "Jaguar", "Land Rover", "Volvo",
  "Mini Cooper", "Jeep", "Tesla", "Porsche", "Bentley", "Aston Martin", "Ferrari"
];

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Converts the legacy { brand: { models } } + { brand: logo } structure
// into the unified catalog shape used by the Sell Car form and admin editor.
export function catalogFromLegacy(
  brandData: Record<string, { models: SellModel[] }>,
  brandLogos: Record<string, string>,
  popularBrands: string[] = DEFAULT_POPULAR_SELL_BRANDS
): SellCatalog {
  const catalog: SellCatalog = {};
  const brandNames = Array.from(new Set([...Object.keys(brandData), ...Object.keys(brandLogos)]));
  brandNames.forEach((brand) => {
    catalog[brand] = {
      logo: brandLogos[brand] || "⭐",
      isPopular: popularBrands.includes(brand),
      models: Array.isArray(brandData[brand]?.models) ? brandData[brand].models : []
    };
  });
  return catalog;
}

// Overlays the stored catalog (brands map + removed list) on top of the
// default catalog so admin edits persist while new default brands still appear.
export function mergeCatalog(
  defaults: SellCatalog,
  storedBrands: Record<string, SellBrandEntry> | null | undefined,
  removed: string[] = []
): SellCatalog {
  const result = deepClone(defaults);
  if (storedBrands && typeof storedBrands === "object") {
    Object.keys(storedBrands).forEach((brand) => {
      const entry = storedBrands[brand];
      if (entry && typeof entry === "object") {
        if (result[brand]) {
          result[brand] = { ...result[brand], ...entry, models: Array.isArray(entry.models) ? entry.models : [] };
        } else {
          result[brand] = entry;
        }
      }
    });
  }
  removed.forEach((brand) => {
    delete result[brand];
  });
  return result;
}

export function getStoredSellCatalog(): CatalogStoragePayload | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SELL_CATALOG_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      removed: Array.isArray(parsed.removed) ? parsed.removed : [],
      brands: parsed.brands && typeof parsed.brands === "object" ? parsed.brands : {}
    };
  } catch (e) {
    console.error("Failed to parse stored sell catalog", e);
    return null;
  }
}

export function setStoredSellCatalog(payload: CatalogStoragePayload) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELL_CATALOG_STORAGE_KEY, JSON.stringify(payload));
}

export async function loadSellCatalogFromSupabase(): Promise<CatalogStoragePayload | null> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", SELL_CATALOG_SETTING_KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    const parsed = JSON.parse(data.value);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      removed: Array.isArray(parsed.removed) ? parsed.removed : [],
      brands: parsed.brands && typeof parsed.brands === "object" ? parsed.brands : {}
    };
  } catch (e) {
    console.error("Failed to load sell catalog from Supabase", e);
    return null;
  }
}

export async function saveSellCatalog(payload: CatalogStoragePayload): Promise<boolean> {
  const value = JSON.stringify(payload);
  setStoredSellCatalog(payload);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("1stcars_settings_updated"));
  }
  try {
    const row = {
      key: SELL_CATALOG_SETTING_KEY,
      value,
      description: "Sell Car Form brand / model / variant catalog (edited from Admin CMS)"
    };
    const { error } = isRealSupabase
      ? await supabase.from("settings").upsert(row, { onConflict: "key" })
      : await supabase.from("settings").upsert({ id: SELL_CATALOG_SETTING_KEY, ...row });
    if (error) {
      console.error("Failed to persist sell catalog to Supabase", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to persist sell catalog to Supabase", e);
    return false;
  }
}

export function getStoredInspectionCategories(): Inspection120Category[] {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(INSPECTION_FORM_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Inspection120Category[];
        }
      } catch (e) {
        console.error("Failed to parse stored inspection form", e);
      }
    }
  }
  return deepClone(OFFICIAL_120_CATEGORIES);
}

export async function loadInspectionFormFromSupabase(): Promise<Inspection120Category[] | null> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", INSPECTION_FORM_SETTING_KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    const parsed = JSON.parse(data.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Inspection120Category[];
    }
    return null;
  } catch (e) {
    console.error("Failed to load inspection form from Supabase", e);
    return null;
  }
}

export async function saveInspectionForm(categories: Inspection120Category[]): Promise<boolean> {
  const value = JSON.stringify(categories);
  if (typeof window !== "undefined") {
    localStorage.setItem(INSPECTION_FORM_STORAGE_KEY, value);
    window.dispatchEvent(new Event("1stcars_settings_updated"));
  }
  try {
    const row = {
      key: INSPECTION_FORM_SETTING_KEY,
      value,
      description: "120-Point Sell Car Inspection form structure (edited from Admin CMS)"
    };
    const { error } = isRealSupabase
      ? await supabase.from("settings").upsert(row, { onConflict: "key" })
      : await supabase.from("settings").upsert({ id: INSPECTION_FORM_SETTING_KEY, ...row });
    if (error) {
      console.error("Failed to persist inspection form to Supabase", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to persist inspection form to Supabase", e);
    return false;
  }
}
