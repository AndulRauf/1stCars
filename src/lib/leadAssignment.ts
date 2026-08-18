import { supabase } from "./supabaseClient";

// ============================================================
// LEAD AUTO-ASSIGNMENT
// Every car uploaded by a Sales Associate carries `created_by`
// (their profile id). When a lead (test drive / buy-now) comes
// in for that car, the lead is auto-assigned to that associate
// so only they see it in their CRM desk.
// ============================================================

export interface LeadOwner {
  id: string;
  name?: string;
}

// Resolve which Sales Associate uploaded a car so incoming leads
// can be auto-assigned. Returns null when the car is not owned by
// an associate (admin-published or bundled demo inventory) — such
// leads stay in the shared/unassigned pool.
export async function resolveLeadOwner(car: { id?: string | null; brand?: string; model?: string } | null | undefined): Promise<LeadOwner | null> {
  if (!car) return null;

  // 1. Exact match by car id (covers CMS/associate-uploaded cars).
  if (car.id) {
    try {
      const { data: byId } = await supabase
        .from("cars")
        .select("created_by, created_by_name")
        .eq("id", car.id)
        .maybeSingle();
      if (byId?.created_by) {
        return { id: byId.created_by, name: byId.created_by_name };
      }
    } catch (e) {
      console.warn("Lead assignment lookup by id failed:", e);
    }
  }

  // 2. Fallback: brand + model match (demo/legacy cars may not exist
  //    in the DB by the frontend id). Only auto-assign when the listing is
  //    unambiguous — i.e. exactly ONE associate uploaded that car. If several
  //    associates carry the same brand+model, the lead stays in the shared
  //    pool instead of being stolen by whoever matched first.
  if (car.brand && car.model) {
    try {
      const { data: matches } = await supabase
        .from("cars")
        .select("created_by, created_by_name")
        .eq("brand", car.brand)
        .eq("model", car.model);
      const owners = (matches || []).filter((m: any) => m.created_by);
      const distinct = owners.filter(
        (m: any, i: number) => owners.findIndex((o: any) => o.created_by === m.created_by) === i
      );
      if (distinct.length === 1) {
        return { id: distinct[0].created_by, name: distinct[0].created_by_name };
      }
    } catch (e) {
      console.warn("Lead assignment lookup by brand/model failed:", e);
    }
  }

  return null;
}

// Insert a lead into sales_notifications including auto-assignment.
// If the live database predates the `assigned_to` migration, retry the
// insert without the new columns so bookings never fail.
export async function insertLeadWithAssignment(lead: any) {
  const first = await supabase.from("sales_notifications").insert([lead]);
  if (!first.error) return first;

  const msg = String(first.error.message || JSON.stringify(first.error));
  if (/assigned_to|schema cache|does not exist/i.test(msg)) {
    const { assigned_to, assigned_to_name, ...stripped } = lead;
    const retry = await supabase.from("sales_notifications").insert([stripped]);
    if (!retry.error) {
      console.warn("Lead inserted without assigned_to (run the schema migration to enable auto-assignment).");
    }
    return retry;
  }

  return first;
}