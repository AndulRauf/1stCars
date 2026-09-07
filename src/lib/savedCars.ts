/**
 * Shared persistence for a buyer's "saved cars" (wishlist).
 *
 * Two layers are kept in sync:
 *   - localStorage ("1stcars_saved_cars"): instant UI cache + mock-mode source.
 *   - Supabase "saved_cars" table (public/saved_cars.sql): cross-device truth
 *     for signed-in buyers.
 *
 * Every remote call is defensive: when Supabase is missing, the table / RLS
 * policy is not deployed yet, or the request fails, callers transparently fall
 * back to the local cache — the buyer journey never regresses.
 */
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";

export const SAVED_CARS_STORAGE_KEY = "1stcars_saved_cars";

export function getSavedCarsLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_CARS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setSavedCarsLocal(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_CARS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* non-fatal */
  }
}

/**
 * Fetch the buyer's saved car ids from Supabase. Returns null when the remote
 * source is unavailable (mock mode, missing table, RLS gap, network error) so
 * callers can decide to fall back to the local cache.
 */
export async function loadSavedCarsFromDb(userId: string): Promise<string[] | null> {
  if (!isRealSupabase || !userId || typeof window === "undefined") return null;
  try {
    const { data, error } = await supabase
      .from("saved_cars")
      .select("car_id")
      .eq("user_id", userId);
    if (error) return null;
    return (data || [])
      .map((row: any) => String(row.car_id))
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Insert/remove a single saved-car row. Guaranteed no-op in mock mode or when
 * the table is missing, so the local cache always stays the safe fallback.
 */
export async function setSavedCarInDb(userId: string, carId: string, saved: boolean): Promise<void> {
  if (!isRealSupabase || !userId || !carId || typeof window === "undefined") return;
  try {
    if (saved) {
      const { data: existing } = await supabase
        .from("saved_cars")
        .select("id")
        .eq("user_id", userId)
        .eq("car_id", carId)
        .maybeSingle();
      if (!existing) {
        await supabase.from("saved_cars").insert({ user_id: userId, car_id: carId });
      }
    } else {
      await supabase
        .from("saved_cars")
        .delete()
        .eq("user_id", userId)
        .eq("car_id", carId);
    }
  } catch (err) {
    // Missing table / RLS gap on an older database — the local cache already
    // carries the change so the UI stays consistent within this browser.
    console.warn("[savedCars] Supabase sync skipped:", err);
  }
}

/**
 * Persist a saved-car row for whichever user owns the live auth session
 * (no-op when signed out). Used by the booking/checkout flows where the buyer
 * may not have a session back in React state yet.
 */
export async function setSavedCarForSession(carId: string, saved: boolean): Promise<void> {
  if (!isRealSupabase || !carId || typeof window === "undefined") return;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (uid) await setSavedCarInDb(uid, carId, saved);
  } catch {
    /* best-effort — local cache already updated */
  }
}