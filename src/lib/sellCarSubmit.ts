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

/**
 * Persists a completed Sell Car inspection request.
 *
 * Throws on failure (caller is responsible for surfacing the message); resolves
 * once a real row is guaranteed to exist. Does NOT return the created row to
 * anonymous callers — they cannot read it back under RLS.
 */
export async function submitInspection({
  supabase,
  record,
  partialLeadId,
  user
}: SubmitInspectionOptions): Promise<void> {
  let submitted = false;

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
    }
    submitted = Boolean(!res.error && res.data?.id);
  }

  if (!submitted) {
    // Fresh INSERT — the common anonymous-submit path. RLS WITH CHECK, NOT NULL
    // constraints and grant problems all surface as errors, so `error === null`
    // means the row was created even when the response body is empty.
    let result = await supabase.from("inspections").insert([record]);
    if (result.error && isUnknownColumnError(result.error.message)) {
      console.warn(
        "Inspection insert rejected an optional column — retrying with base columns only.",
        result.error.message
      );
      const { seller_email, notes, ...baseRecord } = record;
      result = await supabase.from("inspections").insert([baseRecord]);
    }
    if (result.error) {
      throw new Error(result.error.message || "Could not save your inspection request.");
    }
    submitted = true;
  }

  if (!submitted) {
    throw new Error("Inspection save was not confirmed. Please try again.");
  }
}