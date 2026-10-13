import { describe, it, expect } from "vitest";
import { findConfirmedDuplicateLead, submitInspection } from "@/src/lib/sellCarSubmit";
import { isCompleteInspectionRow, isPartialLeadRow } from "@/src/lib/sellCarValidation";

// ============================================================
// DUPLICATE-LEAD GUARD + SUBMIT PIPELINE — regression tests
//
// Locks in the fix for the final-submit duplicate pre-check that matched the
// signed-in seller's OWN Mobile-step partial lead (same mobile + plate +
// status pending) and short-circuited to success BEFORE submitInspection —
// losing the full record (km, year, slot, address), conversions and fan-out.
//
// Guard contract (src/lib/sellCarSubmit.ts → findConfirmedDuplicateLead):
//   1. The current submission's partial lead is excluded by its real DB id.
//   2. Only a CONFIRMED COMPLETE pending inspection can be a duplicate.
//   3. Fail-open: any read problem returns null → the full submit proceeds.
//   4. submitInspection throws on write failure → the component surfaces the
//      error toast and NEVER reaches the success screen.
// ============================================================

const MOBILE = "9876543210";
const REG = "GJ01AB1234";

/** The full record the final submit persists after all validations pass. */
const fullRecord = {
  seller_id: "u-1",
  seller_name: "Aarav Patel",
  seller_mobile: MOBILE,
  reg_number: REG,
  brand: "Tata",
  model: "Nexon",
  variant: "XZ+",
  fuel: "Petrol",
  transmission: "Manual",
  year: 2021,
  km_driven: 45000,
  city: "Surat",
  address: "Flat 4, Riverdale, Surat, 394540",
  preferred_date: "2026-10-14",
  preferred_time: "09:00 AM - 12:00 PM",
  status: "pending",
  notes: "New inspection request from the Sell Car form."
};

/** Thin row written by handleMobileSubmit at the Mobile step (signed-in only). */
function partialLeadRow(id: string) {
  return {
    id,
    seller_id: "u-1",
    seller_mobile: MOBILE,
    brand: "Tata",
    model: "Nexon",
    reg_number: REG,
    city: "",
    status: "pending",
    notes: "Partial lead. Form in progress",
    created_at: new Date().toISOString()
  };
}

/** A genuinely complete pending inspection (what a real duplicate looks like). */
function completePendingRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    seller_id: "u-1",
    seller_name: "Aarav Patel",
    seller_mobile: MOBILE,
    reg_number: REG,
    brand: "Tata",
    model: "Nexon",
    year: 2021,
    km_driven: 45000,
    city: "Surat",
    address: "Flat 4, Riverdale, Surat, 394540",
    preferred_date: "2026-10-14",
    preferred_time: "09:00 AM - 12:00 PM",
    status: "pending",
    notes: "New inspection request from the Sell Car form.",
    created_at: new Date().toISOString(),
    ...overrides
  };
}

type FakeOptions = {
  /** Simulate anon RLS: SELECT always empty, INSERT read-back empty. */
  anonMode?: boolean;
  /** Force the duplicate SELECT to fail (stale schema-cache style error). */
  selectError?: { message: string };
  /** Force the final INSERT to fail. */
  insertError?: { message: string };
};

/**
 * Minimal in-memory Supabase stand-in covering exactly the chains used by
 * findConfirmedDuplicateLead + submitInspection, including PostgREST's RLS
 * behaviour for anon (empty SELECT, empty INSERT read-back).
 */
function makeFakeSupabase(initialRows: any[], opts: FakeOptions = {}) {
  const db = { rows: initialRows.map((r) => ({ ...r })) };
  const calls = { inserts: 0, updates: 0 };
  let insertedSeq = 0;

  const supabase: any = {
    from: () => ({
      select: () => {
        const eq: Array<[string, unknown]> = [];
        const gte: Array<[string, unknown]> = [];
        const neq: Array<[string, unknown]> = [];
        const builder: any = {
          eq: (k: string, v: unknown) => {
            eq.push([k, v]);
            return builder;
          },
          gte: (k: string, v: unknown) => {
            gte.push([k, v]);
            return builder;
          },
          neq: (k: string, v: unknown) => {
            neq.push([k, v]);
            return builder;
          },
          limit: (n: number) => {
            if (opts.selectError) return Promise.resolve({ data: null, error: opts.selectError });
            // RLS: anon has no SELECT visibility on inspections — always empty.
            if (opts.anonMode) return Promise.resolve({ data: [], error: null });
            const rows = db.rows
              .filter((r) => eq.every(([k, v]) => r[k] === v))
              .filter((r) => gte.every(([k, v]) => String(r[k]) >= String(v)))
              .filter((r) => neq.every(([k, v]) => String(r[k]) !== String(v)))
              .slice(0, n);
            return Promise.resolve({ data: rows, error: null });
          }
        };
        return builder;
      },
      update: (record: any) => ({
        eq: (k: string, v: unknown) => ({
          select: () => ({
            maybeSingle: () => {
              const target = db.rows.find((r) => r[k] === v);
              // No match = RLS hid the row → "no error, no row" read-back.
              if (!target) return Promise.resolve({ data: null, error: null });
              Object.assign(target, record);
              calls.updates += 1;
              return Promise.resolve({ data: { id: target.id }, error: null });
            }
          })
        })
      }),
      insert: (records: any[]) => ({
        select: () => ({
          maybeSingle: () => {
            if (opts.insertError) return Promise.resolve({ data: null, error: opts.insertError });
            const row = { id: `row-${++insertedSeq}`, ...records[0] };
            db.rows.push(row);
            calls.inserts += 1;
            // Real anon under RLS: insert succeeds, RETURNING set is empty.
            return Promise.resolve({ data: opts.anonMode ? null : { id: row.id }, error: null });
          }
        })
      })
    })
  };
  return { supabase, db, calls };
}

const check = (supabase: any, excludeLeadId: string | null) =>
  findConfirmedDuplicateLead({ supabase, mobile: MOBILE, regNumber: REG, excludeLeadId });

describe("signed-in seller with their own partial lead", () => {
  it("never matches its own partial lead and still persists the full record", async () => {
    const { supabase, db } = makeFakeSupabase([partialLeadRow("partial-9")]);

    // The defect: without the id exclusion this row (same mobile + plate +
    // pending + fresh) matched and skipped submitInspection entirely.
    const excluded = await check(supabase, "partial-9");
    expect(excluded.duplicateRow).toBeNull();

    // Defense in depth — even unexcluded, a thin partial row can never be
    // confirmed as a complete inspection.
    const notExcluded = await check(supabase, null);
    expect(notExcluded.duplicateRow).toBeNull();
    expect(isPartialLeadRow(partialLeadRow("x"))).toBe(true);
    expect(isCompleteInspectionRow(partialLeadRow("x"))).toBe(false);

    // The full submission proceeds and PROMOTES the same partial row:
    const result = await submitInspection({
      supabase,
      record: fullRecord,
      partialLeadId: "partial-9",
      user: { id: "u-1" }
    });
    expect(result).toMatchObject({
      id: "partial-9",
      promotedPartialLead: true,
      fellBackToInsert: false
    });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({
      id: "partial-9",
      km_driven: 45000,
      year: 2021,
      preferred_date: "2026-10-14",
      preferred_time: "09:00 AM - 12:00 PM",
      address: fullRecord.address,
      notes: fullRecord.notes
    });
  });

  it("an orphaned thin partial lead from an earlier session does not block submission", async () => {
    const { supabase } = makeFakeSupabase([partialLeadRow("orphan-1")]);
    const result = await check(supabase, "partial-9");
    // Considered (same mobile + plate + pending) but rejected as incomplete:
    expect(result.candidates).toBe(1);
    expect(result.duplicateRow).toBeNull();
  });
});

describe("genuine duplicate", () => {
  it("returns only the confirmed complete record, excluding the own partial lead", async () => {
    const { supabase } = makeFakeSupabase([
      partialLeadRow("partial-7"),
      completePendingRow("dup-1")
    ]);
    const result = await check(supabase, "partial-7");
    expect(result.duplicateRow?.id).toBe("dup-1");
    expect(isCompleteInspectionRow(result.duplicateRow)).toBe(true);
    // The own partial lead was excluded, not reported as the duplicate:
    expect(result.candidates).toBe(1);
  });

  it("ignores pending rows older than the 24h window", async () => {
    const { supabase } = makeFakeSupabase([
      completePendingRow("old-1", {
        created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
      })
    ]);
    const result = await check(supabase, null);
    expect(result).toEqual({ duplicateRow: null, candidates: 0 });
  });
});

describe("anonymous submission", () => {
  it("still inserts with a confirmed write and no readable id under RLS", async () => {
    const { supabase, db } = makeFakeSupabase([completePendingRow("staff-only")], {
      anonMode: true
    });

    // Anon SELECT under RLS sees nothing → no duplicate short-circuit is ever
    // available, so the write always runs.
    const dup = await check(supabase, null);
    expect(dup.duplicateRow).toBeNull();

    const result = await submitInspection({
      supabase,
      record: fullRecord,
      partialLeadId: null,
      user: null
    });
    expect(result).toMatchObject({
      id: null,
      promotedPartialLead: false,
      fellBackToInsert: false,
      retriedWithoutOptionalColumns: false
    });
    expect(db.rows).toHaveLength(2);
    expect(db.rows[1]).toMatchObject({
      seller_mobile: MOBILE,
      reg_number: REG,
      km_driven: 45000,
      preferred_date: "2026-10-14"
    });
  });
});

describe("failed final insert", () => {
  it("never produces a false success", async () => {
    const { supabase, db } = makeFakeSupabase([], {
      insertError: { message: "permission denied for table inspections" }
    });

    // No duplicate shortcut available AND the write rejects: neither success
    // path can trigger, so the component stays on the form with an error toast.
    const dup = await check(supabase, null);
    expect(dup.duplicateRow).toBeNull();
    await expect(
      submitInspection({ supabase, record: fullRecord, partialLeadId: null, user: null })
    ).rejects.toThrow("permission denied for table inspections");
    expect(db.rows).toHaveLength(0);
  });

  it("a broken duplicate check fails open — the full submit still runs", async () => {
    const { supabase, db } = makeFakeSupabase([], {
      selectError: { message: "failed to parse schema cache" }
    });
    const dup = await check(supabase, null);
    expect(dup).toEqual({ duplicateRow: null, candidates: 0 });

    const result = await submitInspection({
      supabase,
      record: fullRecord,
      partialLeadId: null,
      user: { id: "u-1" }
    });
    expect(result.id).toBe("row-1");
    expect(db.rows).toHaveLength(1);
  });
});
