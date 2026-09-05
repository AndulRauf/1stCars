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
// Returns { data, error, row } so callers can read the DB-generated id.
export async function insertLeadWithAssignment(lead: any) {
  const first = await supabase.from("sales_notifications").insert([lead]);
  if (!first.error) {
    return {
      data: first.data,
      error: first.error as any,
      row: Array.isArray(first.data) && first.data.length > 0 ? first.data[0] : null
    };
  }

  const msg = String(first.error.message || JSON.stringify(first.error));
  if (/assigned_to|schema cache|does not exist/i.test(msg)) {
    const { assigned_to, assigned_to_name, ...stripped } = lead;
    const retry = await supabase.from("sales_notifications").insert([stripped]);
    if (!retry.error) {
      console.warn("Lead inserted without assigned_to (run the schema migration to enable auto-assignment).");
    }
    return {
      data: retry.data,
      error: retry.error as any,
      row: Array.isArray(retry.data) && retry.data.length > 0 ? retry.data[0] : null
    };
  }

  return { data: first.data, error: first.error as any, row: null };
}

// Best-effort guarantee that the currently signed-in auth user has a
// profiles row. The audit_trail.actor_user_id foreign key points at
// public.profiles(id), and the booking triggers call automation_audit(),
// so a signed-in buyer without a profile would roll back the whole lead
// INSERT. Anonymous visitors are a no-op (return null immediately).
export async function ensureProfileExists(supabaseClient: any = supabase): Promise<string | null> {
  try {
    const { data: session } = await supabaseClient.auth.getSession();
    if (!session?.session?.user?.id) return null;
    const { data, error } = await supabaseClient.rpc("ensure_profile");
    if (!error) return data || null;
    // RPC not deployed yet — fall back to a lightweight check + upsert so
    // bookings never break on older databases.
    const { data: existing } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", session.session.user.id)
      .maybeSingle();
    if (existing?.id) return existing.id;
    await supabaseClient.from("profiles").insert({
      id: session.session.user.id,
      name: session.session.user.user_metadata?.name || "Customer",
      email: session.session.user.email || null,
      mobile: session.session.user.user_metadata?.mobile || null,
      role: "Buyer",
      city: session.session.user.user_metadata?.city || "Mumbai"
    }).then(() => undefined).catch(() => undefined);
    return session.session.user.id;
  } catch {
    return null;
  }
}