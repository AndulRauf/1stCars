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
//
// RLS TRAP (live-site Test Drive failure 10-Oct-2026):
//   anon has INSERT WITH CHECK (true) but NO SELECT policy on this table,
//   so `insert([...]).select()` (= INSERT ... RETURNING) fails with
//   "new row violates row-level security policy for table
//   sales_notifications" even though the INSERT itself is allowed.
//   Fix: pre-generate a client UUID and, on any RLS/RETURNING failure,
//   retry as a bare INSERT (no `.select()`). The bare INSERT needs no
//   SELECT policy, so anonymous visitors succeed with zero SQL changes.
//   The known client id is returned as `row.id` so background assignment
//   updates keep targeting the real row.
function newLeadUuid(): string {
  try {
    const c: any = (globalThis as any)?.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch { /* fall through */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function pickRow(data: any): any | null {
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

function isRlsReturningFailure(msg: string): boolean {
  return /row-level security|42501|permission denied|PGRST|returning|not allowed to|violates/i.test(msg || "");
}

export async function insertLeadWithAssignment(lead: any) {
  // TIER 1 — canonical server-side path: submit_sales_lead(jsonb) is
  // SECURITY DEFINER, so it bypasses RLS entirely and can never hit the
  // INSERT...RETURNING trap. Requires public/fix_testdrive_rls_returning.sql
  // to have been run once in the Supabase SQL Editor. The mock client also
  // implements this RPC so unit tests exercise the same path.
  const rpcPayload = {
    name: lead?.name, mobile: lead?.mobile, city: lead?.city,
    preferred_date: lead?.preferred_date, preferred_time: lead?.preferred_time,
    car_id: lead?.car_id ?? null, car_brand: lead?.car_brand, car_model: lead?.car_model,
    type: lead?.type, status: lead?.status, notes: lead?.notes ?? null
  };
  try {
    const rpc = await (supabase as any)?.rpc?.("submit_sales_lead", { p_lead: rpcPayload });
    if (rpc && !rpc.error && rpc.data) {
      const row = { ...lead, id: String(rpc.data) };
      return { data: [row], error: null as any, row };
    }
    // RPC missing (older DB / PostgREST cache) or rejected — fall through to
    // the direct-insert tiers below instead of failing the booking.
    if (rpc?.error) {
      console.warn("submit_sales_lead RPC unavailable, falling back to direct insert:", (rpc.error as any)?.message || rpc.error);
    }
  } catch (e) {
    console.warn("submit_sales_lead RPC threw, falling back to direct insert:", e);
  }

  // TIER 2/3 — direct insert fallbacks (need no SQL changes on the live DB).
  const clientId = (lead && typeof lead.id === "string" && /^[0-9a-fA-F-]{36}$/.test(lead.id))
    ? lead.id
    : newLeadUuid();
  const withId = { ...lead, id: clientId };

  const first = await supabase.from("sales_notifications").insert([withId]).select();
  if (!first.error) {
    return {
      data: first.data,
      error: first.error as any,
      row: pickRow(first.data) || { ...withId }
    };
  }

  const msg = String((first.error as any)?.message || JSON.stringify(first.error));

  // Schema-cache lag (assigned_to columns not yet visible to PostgREST):
  // strip the new columns and retry WITH returning first.
  if (/assigned_to|schema cache|does not exist/i.test(msg)) {
    const { assigned_to, assigned_to_name, ...stripped } = withId;
    const retry = await supabase.from("sales_notifications").insert([stripped]).select();
    if (!retry.error) {
      console.warn("Lead inserted without assigned_to (run the schema migration to enable auto-assignment).");
      return { data: retry.data, error: retry.error as any, row: pickRow(retry.data) || { ...stripped } };
    }
    // That retry may itself have hit the RLS RETURNING trap — fall through
    // to the bare-INSERT path below using the stripped payload.
    const rlsMsg = String((retry.error as any)?.message || JSON.stringify(retry.error));
    if (isRlsReturningFailure(rlsMsg)) {
      const bare = await supabase.from("sales_notifications").insert([stripped]);
      if (!bare.error || /duplicate|unique|already exists/i.test(String((bare.error as any)?.message || ""))) {
        if (bare.error) console.warn("Lead insert raced (duplicate id) — treating as success:", clientId);
        return { data: [{ ...stripped }], error: null, row: { ...stripped } };
      }
      return { data: bare.data, error: bare.error as any, row: null };
    }
    return { data: retry.data, error: retry.error as any, row: null };
  }

  // RLS RETURNING trap: the row was REJECTED only because `.select()`
  // demands a SELECT policy anon doesn't have. Retry as a bare INSERT
  // (no RETURNING) with the same client id — idempotent and policy-safe.
  if (isRlsReturningFailure(msg)) {
    const bare = await supabase.from("sales_notifications").insert([withId]);
    if (!bare.error || /duplicate|unique|already exists/i.test(String((bare.error as any)?.message || ""))) {
      if (bare.error) console.warn("Lead insert raced (duplicate id) — treating as success:", clientId);
      return { data: [{ ...withId }], error: null, row: { ...withId } };
    }
    return { data: bare.data, error: bare.error as any, row: null };
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
      city: session.session.user.user_metadata?.city || "Surat"
    }).then(() => undefined).catch(() => undefined);
    return session.session.user.id;
  } catch {
    return null;
  }
}