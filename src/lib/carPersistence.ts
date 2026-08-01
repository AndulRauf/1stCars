import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";

// Columns that physically exist on the real Supabase `public.cars` table
// (see supabase/migrations/20260718000000_schema.sql). Every other field the
// CMS produces (images, price_breakup, inspection report, ...) is stored in a
// JSONB `payload` column so it survives real-mode inserts/updates.
export const CAR_CORE_COLUMNS = [
  "title",
  "brand",
  "model",
  "variant",
  "year",
  "price",
  "km_driven",
  "fuel",
  "transmission",
  "owner_count",
  "city",
  "reg_number",
  "color",
  "insurance_type",
  "overall_score",
  "status",
  "created_by"
] as const;

export function buildCarRecord(record: any): any {
  if (!isRealSupabase) {
    // Mock database accepts the full record as-is; keep the client-generated
    // id so create/edit/delete stay consistent inside the CMS.
    return {
      ...record,
      id: record.id || `id-cars-${Math.random().toString(36).substr(2, 9)}`,
      created_at: record.created_at || new Date().toISOString()
    };
  }

  // Real Supabase: only send columns that exist on the table (drop the text id
  // so Postgres can generate a UUID), and stash everything else in `payload`.
  const { id, created_at, updated_at, payload: oldPayload, ...rest } = record;

  const core: Record<string, any> = {};
  for (const col of CAR_CORE_COLUMNS) {
    if (rest[col] !== undefined && rest[col] !== null) core[col] = rest[col];
  }

  return { ...core, payload: rest };
}

export function errorMessage(err: any): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err.message) return String(err.message);
  if (err.error_description) return String(err.error_description);
  if (err.details) return String(err.details);
  return JSON.stringify(err);
}

export async function saveCar(record: any, editingId?: string | null) {
  const payload = buildCarRecord(record);
  if (editingId) {
    const { error } = await supabase.from("cars").update(payload).eq("id", editingId);
    return { id: editingId, error };
  }
  const { data, error } = await supabase.from("cars").insert([payload]).select().single();
  return { id: data?.id ?? payload.id, error };
}

export async function deleteCar(id: string) {
  const { error } = await supabase.from("cars").delete().eq("id", id);
  return { error };
}
