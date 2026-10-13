import { describe, it, expect } from "vitest";
import { postgrestErrorText, submitInspection, isUnknownColumnError, isRlsBlockedWrite } from "@/src/lib/sellCarSubmit";

// ============================================================
// SELL CAR INSPECTION SUBMIT — RLS regression tests
//
// These lock in the write contract behind the Sell Car form's final submit
// (src/lib/sellCarSubmit.ts):
//   - Anonymous INSERT succeeds if `error === null`, even when PostgREST
//     returns NO row because the SELECT policy hides the just-inserted row
//     ("success, no rows returned") — anon never has SELECT visibility.
//   - Partial-lead promotion (UPDATE) runs ONLY for signed-in users and is
//     read-back confirmed; when it matches nothing, the code falls back to a
//     fresh INSERT instead of silently claiming success.
// The dev mock Supabase client cannot reproduce RLS empty-readback, so these
// tests use a stub that mimics PostgREST's RLS behaviour exactly.
// ============================================================

type PostgrestResult = { data: any; error: null | { message: string } };

const baseRecord = {
  seller_id: null,
  seller_name: "Aarav Patel",
  seller_mobile: "9876543210",
  brand: "Maruti Suzuki",
  model: "Baleno",
  status: "pending",
  notes: "New inspection request from the Gujarat Sell Car form."
};

// `.maybeSingle()` unwraps the result array into a single row object (or null),
// exactly like the real supabase-js client. `data` here is a ROW, not an array.
type MaybeSingleResult = { data: Record<string, unknown> | null; error: null | { message: string } };

function makeStubSupabase(overrides: {
  updateMaybeSingle?: () => MaybeSingleResult;
  insertResult?: (records: any[]) => PostgrestResult;
}) {
  const calls = {
    updates: [] as any[],
    inserts: [] as any[]
  };
  const stub: any = {
    from: (table: string) => ({
      update: (record: any) => {
        calls.updates.push(record);
        return {
          eq: () => ({
            select: () => ({
              maybeSingle: () =>
                Promise.resolve(
                  overrides.updateMaybeSingle
                    ? overrides.updateMaybeSingle()
                    : { data: { id: "partial-1" }, error: null }
                )
            })
          })
        };
      },
      insert: (records: any[]) => {
        calls.inserts.push(records);
        // Real supabase-js: `.insert([...])` is thenable AND chainable. The
        // confirmed-write submit calls `.select("id").maybeSingle()` to read
        // back the real id (signed-in/mock) or get an empty RLS body (anon).
        const insertResult = overrides.insertResult
          ? overrides.insertResult(records)
          : { data: null, error: null };
        return {
          then: (res: any, rej?: any) => Promise.resolve(insertResult).then(res, rej),
          select: () => ({
            maybeSingle: () => Promise.resolve(insertResult)
          })
        };
      }
    })
  };
  return { stub, calls };
}

describe("submitInspection — anonymous INSERT under RLS", () => {
  it("succeeds when the INSERT runs with no error even though no row comes back (SELECT/RLS blocks read-back)", async () => {
    // PostgREST reality: anon has INSERT grant but no SELECT visibility, so the
    // row is created while the response body is empty — NOT a failure.
    const { stub, calls } = makeStubSupabase({
      insertResult: () => ({ data: null, error: null })
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: null, user: null })
    ).resolves.toMatchObject({ id: null, promotedPartialLead: false, fellBackToInsert: false });
    expect(calls.updates).toHaveLength(0);
    expect(calls.inserts).toHaveLength(1);
  });

  it("throws on a real INSERT error (RLS WITH CHECK / grant problem)", async () => {
    const { stub } = makeStubSupabase({
      insertResult: () => ({ data: null, error: { message: "permission denied for table inspections" } })
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: null, user: null })
    ).rejects.toThrow(/permission denied/);
  });

  it("skips promotion for anonymous visitors even if a stale partialLeadId lingers", async () => {
    // Session expired between step 3 and submit: user is null but partialLeadId
    // is still set. The UPDATE must NOT run (RLS would hide the row); a fresh
    // INSERT lands the completed lead.
    const { stub, calls } = makeStubSupabase({
      insertResult: () => ({ data: null, error: null })
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: "partial-1", user: null })
    ).resolves.toMatchObject({ id: null, promotedPartialLead: false });
    expect(calls.updates).toHaveLength(0);
    expect(calls.inserts).toHaveLength(1);
  });

  it("recovers from the RLS RETURNING trap by re-sending a BARE INSERT (production 42501)", async () => {
    // Production shape (verified in leadAssignment.ts for sales_notifications):
    // anon has the INSERT grant + "Visitors submit inspection requests" policy
    // but NO SELECT visibility, so `insert().select("id")` (= INSERT ... RETURNING)
    // is rejected with 42501 even though the INSERT itself is allowed. The submit
    // must retry as a bare INSERT (no RETURNING, no SELECT policy needed) so the
    // lead still lands — with no SQL change and no weakening of RLS.
    const rlsError = {
      message: 'new row violates row-level security policy for table "inspections"',
      code: "42501"
    };
    const inserted: any[][] = [];
    const stub: any = {
      from: () => ({
        // First INSERT carries `.select("id")` -> INSERT ... RETURNING -> 42501.
        insert: (records: any[]) => {
          inserted.push(records);
          const withSelect: any = {
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: rlsError })
            })
          };
          // Bare INSERT (no `.select()`): `await insert(...)` resolves it.
          withSelect.then = (res: any) => Promise.resolve({ data: null, error: null }).then(res);
          return withSelect;
        }
      })
    };

    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: null, user: null })
    ).resolves.toMatchObject({
      id: null,
      promotedPartialLead: false,
      fellBackToInsert: false,
      fellBackToBareInsert: true
    });
    // Exactly two INSERTs: the RETURNING attempt + the bare retry. The row landed.
    expect(inserted).toHaveLength(2);
  });

  it("still throws when even the bare INSERT is blocked (surfaces the real error)", async () => {
    // If the INSERT itself is genuinely blocked, the bare INSERT fails too.
    // The submit must throw the BARE error (the true remaining cause), not the
    // RETURNING one, so a repeat failure is diagnosable.
    const rlsError = {
      message: 'new row violates row-level security policy for table "inspections"',
      code: "42501"
    };
    const stub: any = {
      from: () => ({
        insert: () => {
          const withSelect = {
            select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: rlsError }) }),
            then: (res: any) => Promise.resolve({ data: null, error: rlsError }).then(res)
          };
          return withSelect;
        }
      })
    };
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: null, user: null })
    ).rejects.toThrow(/violates row-level security policy for table "inspections"/);
  });
});

describe("submitInspection — partial-lead promotion", () => {
  it("is read-back confirmed for a signed-in owner and does NOT duplicate an insert", async () => {
    const { stub, calls } = makeStubSupabase({
      updateMaybeSingle: () => ({ data: { id: "partial-1" }, error: null })
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: "partial-1", user: { id: "u-1" } })
    ).resolves.toMatchObject({ id: "partial-1", promotedPartialLead: true, fellBackToInsert: false });
    expect(calls.updates).toHaveLength(1);
    expect(calls.inserts).toHaveLength(0);
  });

  it("falls back to a fresh INSERT when the UPDATE matches nothing (no error, no row)", async () => {
    const { stub, calls } = makeStubSupabase({
      updateMaybeSingle: () => ({ data: null, error: null }),
      insertResult: () => ({ data: null, error: null })
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: "orphaned", user: { id: "u-1" } })
    ).resolves.toMatchObject({ id: null, promotedPartialLead: false, fellBackToInsert: true });
    expect(calls.updates).toHaveLength(1);
    expect(calls.inserts).toHaveLength(1);
  });
});

describe("submitInspection — stale schema-cache recovery", () => {
  it("retries an unknown-column INSERT with only the base columns", async () => {
    let call = 0;
    const seen: any[][] = [];
    const { stub, calls } = makeStubSupabase({
      insertResult: (records) => {
        seen.push(records);
        call += 1;
        return call === 1
          ? { data: null, error: { message: "PGRST204 could not find the seller_email column" } }
          : { data: null, error: null };
      }
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: null, user: null })
    ).resolves.toMatchObject({ id: null, retriedWithoutOptionalColumns: true });
    expect(calls.inserts).toHaveLength(2);
    expect(seen[1][0]).not.toHaveProperty("seller_name");
    expect(seen[1][0]).not.toHaveProperty("seller_mobile");
    expect(seen[1][0]).not.toHaveProperty("seller_email");
    expect(seen[1][0]).not.toHaveProperty("overall_score");
    expect(seen[1][0]).not.toHaveProperty("notes");
  });

  it("flags unknown columns and RLS-blocked writes via the exported helpers", () => {
    expect(isUnknownColumnError("PGRST204 could not find column")).toBe(true);
    expect(isUnknownColumnError("schema cache")).toBe(true);
    expect(isUnknownColumnError("random error")).toBe(false);
    expect(isRlsBlockedWrite("permission denied for table inspections")).toBe(true);
    expect(isRlsBlockedWrite('new row violates row-level security policy')).toBe(true);
    expect(isRlsBlockedWrite('violates row-level security policy for table "inspections" | code 42501')).toBe(true);
    expect(isRlsBlockedWrite("random error")).toBe(false);
  });

  it("postgrestErrorText keeps message + details + hint + code (nothing lost)", () => {
    expect(
      postgrestErrorText({ message: "permission denied", details: null, hint: null, code: "42501" })
    ).toBe("permission denied | 42501");
    expect(postgrestErrorText({ message: "only message" })).toBe("only message");
    expect(postgrestErrorText("plain string")).toBe("plain string");
    expect(postgrestErrorText(new Error("boom"))).toBe("boom");
  });
});