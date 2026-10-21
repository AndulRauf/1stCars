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
//   Fix: pre-generate a client UUID and, on that specific rejection, retry
//   as a bare INSERT (no `.select()`). The bare INSERT needs no SELECT
//   policy, so anonymous visitors succeed. The known client id is returned
//   as `row.id` so background assignment updates keep targeting the real row.
//
// IMPORTANT: only a genuine RLS-RETURNING rejection may trigger the bare
// retry. Trigger/constraint failures (NOT NULL, FK, …) must surface as
// errors — retrying them double-writes at best and hides the real cause.
// A "duplicate" result is NOT success on its own: the server must confirm
// the row exists via verify_sales_lead(uuid).
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

// Join every diagnostic PostgREST puts on an error (message/details/hint/code).
export function leadErrorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const parts = [
    (error as any).message,
    (error as any).details,
    (error as any).hint,
    (error as any).code
  ].filter((p) => typeof p === "string" && p.trim().length > 0);
  if (parts.length === 0) return error instanceof Error ? error.message : String(error);
  return parts.join(" | ");
}

export type LeadInsertErrorKind = "rls" | "schema" | "duplicate" | "database" | "unknown";

// Classify a failed lead write. Used both to pick a safe retry and to send a
// PII-free failure reason to analytics.
export function classifyLeadInsertError(error: unknown): LeadInsertErrorKind {
  const msg = leadErrorText(error);
  if (/duplicate key|unique constraint|already exists/i.test(msg)) return "duplicate";
  if (/new row violates row.?level security policy|row.?level security policy|42501/i.test(msg)) return "rls";
  if (/schema cache|could not find the .* column|column .* does not exist|PGRST204/i.test(msg)) return "schema";
  if (/null value in column|violates .* constraint|foreign key|23502|23503|23514/i.test(msg)) return "database";
  return "unknown";
}

// The RLS RETURNING trap specifically: the INSERT itself is allowed, only
// RETURNING is rejected. Bare retry is safe. A plain "permission denied for
// table" is a grant problem and must be surfaced, not retried.
function isRlsReturningBlocked(error: unknown): boolean {
  return /new row violates row.?level security policy/i.test(leadErrorText(error));
}

// Server-side existence check (SECURITY DEFINER, boolean only). Returns
// null when the helper is not deployed or the call failed — callers must
// treat null as "not confirmed".
async function verifyLeadExists(id: string): Promise<boolean | null> {
  try {
    const res = await (supabase as any)?.rpc?.("verify_sales_lead", { p_id: id });
    if (res && !res.error) return res.data === true;
  } catch { /* fall through */ }
  return null;
}

function successResult(payload: Record<string, any>, data?: any) {
  return { data: data ?? [payload], error: null as any, row: { ...payload } };
}

async function settleFailedWrite(error: unknown, payload: Record<string, any>) {
  const kind = classifyLeadInsertError(error);

  // Freeze the RETURNING set: re-send as a bare INSERT (no SELECT policy needed).
  if (kind === "rls" && isRlsReturningBlocked(error)) {
    console.warn("Lead INSERT+RETURNING was RLS-blocked — retrying as a bare INSERT (no RETURNING).");
    const bare = await supabase.from("sales_notifications").insert([payload]);
    if (!bare.error) return successResult(payload);
    const bareKind = classifyLeadInsertError(bare.error);
    if (bareKind === "duplicate") {
      const exists = await verifyLeadExists(String(payload.id));
      if (exists === true) return successResult(payload);
      return { data: null, error: bare.error as any, row: null };
    }
    return { data: null, error: bare.error as any, row: null };
  }

  // Never report success on a duplicate without server confirmation.
  if (kind === "duplicate") {
    const exists = await verifyLeadExists(String(payload.id));
    if (exists === true) {
      console.warn("Lead already existed with this client id — confirmed by verify_sales_lead.");
      return successResult(payload);
    }
    return { data: null, error, row: null };
  }

  return { data: null, error: error as any, row: null };
}

export async function insertLeadWithAssignment(lead: any) {
  // TIER 1 — canonical server-side path: submit_sales_lead(jsonb) is
  // SECURITY DEFINER, so it bypasses RLS entirely and can never hit the
  // INSERT...RETURNING trap. Requires
  // supabase/migrations/20261010000000_fix_testdrive_rls_returning.sql (or
  // the consolidated 20261020000000_lead_intake_hardening.sql) to have been
  // run once in the Supabase SQL Editor. The mock client also implements
  // this RPC so unit tests exercise the same path.
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

  // Schema-cache lag (assigned_to columns not yet visible to PostgREST):
  // strip the new columns and retry before settling.
  if (classifyLeadInsertError(first.error) === "schema") {
    const { assigned_to, assigned_to_name, ...stripped } = withId;
    const retry = await supabase.from("sales_notifications").insert([stripped]).select();
    if (!retry.error) {
      console.warn("Lead inserted without assigned_to (run the schema migration to enable auto-assignment).");
      return { data: retry.data, error: retry.error as any, row: pickRow(retry.data) || { ...stripped } };
    }
    return settleFailedWrite(retry.error, stripped);
  }

  return settleFailedWrite(first.error, withId);
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