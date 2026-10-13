// Confirmed-write inspection submission used by the Sell Car form.
//
// RLS facts this is built on (public/fix_inspections_insert.sql):
//  - Anonymous visitors have an INSERT grant/policy on public.inspections but
//    NO SELECT RLS visibility (the "Sellers read own inspections" policy only
//    matches signed-in owners/staff — auth.uid() is NULL for anon). So
//    PostgREST creates the row while the RETURNING set comes back EMPTY
//    ("success, no rows returned"), which is NOT a failure.
//  - Partial-lead rows are only ever captured for signed-in users, and a
//    signed-in owner can always read their own rows back.
//
// Therefore:
//  - The INSERT path treats `error === null` as success and never requires a
//    returned id.
//  - Partial-lead promotion (UPDATE) is only attempted for a signed-in user and
//    is read-back confirmed via `.select("id").maybeSingle()` — "no error, no
//    row" proves the UPDATE matched nothing (e.g. the session vanished so RLS
//    hid the row) and we fall through to a fresh INSERT instead of silently
//    claiming success.

import { isCompleteInspectionRow } from "@/src/lib/sellCarValidation";

// Detect PostgREST "unknown column" / stale schema-cache errors so the write can
// retry with only the guaranteed base columns. These surface when the live
// database was created from an older public/schema.sql that is missing the
// denormalized seller_name/seller_mobile/seller_email/notes columns.
export function isUnknownColumnError(message?: string): boolean {
  if (!message) return false;
  return (
    /schema cache/i.test(message) ||
    /could not find the .* column/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /PGRST204/i.test(message)
  );
}

// RLS / table-grant write rejections surfaced by PostgREST (e.g. an UPDATE
// attempt on a database that predates the seller-update policy, or an anonymous
// visitor who has no UPDATE grant on inspections). The submission must fall back
// to a fresh INSERT instead of failing, so that the Sell Car form always lands.
export function isRlsBlockedWrite(message?: string): boolean {
  if (!message) return false;
  return (
    /row.?level security policy/i.test(message) ||
    /permission denied/i.test(message)
  );
}

export interface SubmitInspectionOptions {
  // Used structurally so both the real Supabase client and the dev mock satisfy it.
  supabase: { from: (table: string) => any };
  record: Record<string, unknown>;
  // Row created at step 3 (partial lead). Only ever set for signed-in users.
  partialLeadId: string | null;
  // The signed-in user at submit time (null for anonymous visitors).
  user: { id: string } | null;
}

export interface SubmitInspectionResult {
  /** Real DB id when the write path could read it back, else null. */
  id: string | null;
  /** True when an existing partial lead was promoted instead of inserting. */
  promotedPartialLead: boolean;
  /** True when the write fell back to a fresh INSERT after a blocked UPDATE. */
  fellBackToInsert: boolean;
  /** True when the write retried without optional columns (older schema). */
  retriedWithoutOptionalColumns: boolean;
}

/**
 * Persists a completed Sell Car inspection request.
 *
 * Throws on failure (caller is responsible for surfacing the message); resolves
 * once a real row is guaranteed to exist. Anonymous callers cannot read the id
 * back under RLS, so `id` is null on that path by design.
 */
export async function submitInspection({
  supabase,
  record,
  partialLeadId,
  user
}: SubmitInspectionOptions): Promise<SubmitInspectionResult> {
  let submitted = false;
  let createdId: string | null = null;
  let promotedPartialLead = false;
  let fellBackToInsert = false;
  let retriedWithoutOptionalColumns = false;

  if (partialLeadId && user) {
    let res = await supabase
      .from("inspections")
      .update(record)
      .eq("id", partialLeadId)
      .select("id")
      .maybeSingle();
    if (res.error && isUnknownColumnError(res.error.message)) {
      console.warn(
        "Inspection UPDATE rejected an optional column — retrying with base columns only.",
        res.error.message
      );
      retriedWithoutOptionalColumns = true;
      const { seller_email, notes, ...baseRecord } = record;
      res = await supabase
        .from("inspections")
        .update(baseRecord)
        .eq("id", partialLeadId)
        .select("id")
        .maybeSingle();
    }
    if (res.error && (isRlsBlockedWrite(res.error.message) || isUnknownColumnError(res.error.message))) {
      console.warn("Partial-lead UPDATE was blocked — inserting a fresh inspection row instead.", res.error.message);
      fellBackToInsert = true;
    }
    if (!res.error && res.data?.id) {
      submitted = true;
      createdId = String(res.data.id);
      promotedPartialLead = true;
    } else if (!res.error && partialLeadId) {
      // No error but no row matched (e.g. session changed so RLS hid the
      // partial lead): fall through to a fresh INSERT below.
      fellBackToInsert = true;
    }
  }

  if (!submitted) {
    // Fresh INSERT — the common anonymous-submit path. RLS WITH CHECK, NOT NULL
    // constraints and grant problems all surface as errors, so `error === null`
    // means the row was created even when the response body is empty.
    // A `.select("id").maybeSingle()` read-back is attempted so signed-in
    // owners and the dev mock get the real id for notifications/automation;
    // anonymous callers under RLS get no row back (id stays null by design)
    // and that is still a confirmed success.
    let result = await supabase.from("inspections").insert([record]).select("id").maybeSingle();
    if (result.error && isUnknownColumnError(result.error.message)) {
      console.warn(
        "Inspection insert rejected an optional column — retrying with base columns only.",
        result.error.message
      );
      retriedWithoutOptionalColumns = true;
      const { seller_email, notes, ...baseRecord } = record;
      result = await supabase.from("inspections").insert([baseRecord]).select("id").maybeSingle();
    }
    if (result.error) {
      throw new Error(result.error.message || "Could not save your inspection request.");
    }
    submitted = true;
    if (result.data?.id) createdId = String(result.data.id);
  }

  if (!submitted) {
    throw new Error("Inspection save was not confirmed. Please try again.");
  }
  return { id: createdId, promotedPartialLead, fellBackToInsert, retriedWithoutOptionalColumns };
}

// ============================================================
// Duplicate-lead pre-check (P5) — read-only, fail-open.
// ============================================================

/** How far back a pending row counts as the same submission attempt. */
export const DUP_LEAD_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Defensive cap on candidate rows pulled per check. */
const DUP_CANDIDATE_LIMIT = 10;

export interface DuplicateLeadCheckOptions {
  // Used structurally so both the real Supabase client and the dev mock satisfy it.
  supabase: { from: (table: string) => any };
  mobile: string;
  regNumber?: string;
  /**
   * Real row id of THIS submission's Mobile-step partial lead (set by
   * handleMobileSubmit) — always excluded so the in-progress lead can never
   * match itself and skip the full write. Null for anonymous visitors, who
   * never have a partial lead.
   */
  excludeLeadId: string | null;
}

export interface DuplicateLeadCheckResult {
  /**
   * A confirmed COMPLETE pending inspection (same mobile within the
   * last 24h; plate match only when a reg number is provided), or null
   * when none exists — in which case the caller MUST proceed with the
   * full submission.
   */
  duplicateRow: Record<string, any> | null;
  /** Candidate rows considered after exclusions (0 also on read failure). */
  candidates: number;
}

/**
 * Fail-open duplicate-lead pre-check for the Sell Car final submit.
 *
 * Never throws: a failed or blocked read returns `{ duplicateRow: null }` so a
 * transient SELECT problem can never block a genuine lead. Only rows passing
 * `isCompleteInspectionRow` (full slot + odometer + address; thin "Partial
 * lead" rows excluded) can be returned, so a success screen sourced from this
 * row always reflects a real, complete record in the database.
 */
export async function findConfirmedDuplicateLead({
  supabase,
  mobile,
  regNumber,
  excludeLeadId
}: DuplicateLeadCheckOptions): Promise<DuplicateLeadCheckResult> {
  try {
    const since = new Date(Date.now() - DUP_LEAD_WINDOW_MS).toISOString();
    let query = supabase
      .from("inspections")
      .select(
        "id,seller_name,seller_mobile,seller_email,reg_number,brand,model,year,km_driven,address,city,preferred_date,preferred_time,status,created_at,notes"
      )
      .eq("seller_mobile", mobile)
      .eq("status", "pending")
      .gte("created_at", since);
    // Plate filter only when a reg number is known (registration step is
    // currently removed from the form — match on mobile alone then).
    if (regNumber) {
      query = query.eq("reg_number", regNumber);
    }
    // Server-side exclusion of the current submission's own partial lead
    // (belt); the JS-side filter below repeats it (braces) in case a client
    // silently lacks `.neq`.
    if (excludeLeadId && typeof query.neq === "function") {
      query = query.neq("id", excludeLeadId);
    }
    const { data, error } = await query.limit(DUP_CANDIDATE_LIMIT);
    if (error || !Array.isArray(data)) {
      return { duplicateRow: null, candidates: 0 };
    }
    const rows = data.filter(
      (row: any) => !excludeLeadId || String(row?.id ?? "") !== excludeLeadId
    );
    const duplicateRow = rows.find((row: any) => isCompleteInspectionRow(row)) ?? null;
    return { duplicateRow, candidates: rows.length };
  } catch {
    return { duplicateRow: null, candidates: 0 };
  }
}