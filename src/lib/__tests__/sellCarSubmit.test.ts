import { describe, it, expect } from "vitest";
import { submitInspection, isUnknownColumnError } from "@/src/lib/sellCarSubmit";

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
        return Promise.resolve(
          overrides.insertResult ? overrides.insertResult(records) : { data: null, error: null }
        );
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
    ).resolves.toBeUndefined();
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
    ).resolves.toBeUndefined();
    expect(calls.updates).toHaveLength(0);
    expect(calls.inserts).toHaveLength(1);
  });
});

describe("submitInspection — partial-lead promotion", () => {
  it("is read-back confirmed for a signed-in owner and does NOT duplicate an insert", async () => {
    const { stub, calls } = makeStubSupabase({
      updateMaybeSingle: () => ({ data: { id: "partial-1" }, error: null })
    });
    await expect(
      submitInspection({ supabase: stub, record: baseRecord, partialLeadId: "partial-1", user: { id: "u-1" } })
    ).resolves.toBeUndefined();
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
    ).resolves.toBeUndefined();
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
    ).resolves.toBeUndefined();
    expect(calls.inserts).toHaveLength(2);
    expect(seen[1][0]).not.toHaveProperty("seller_email");
    expect(seen[1][0]).not.toHaveProperty("notes");
  });

  it("still flags unknown columns / RLS-blocked writes via the exported helpers", () => {
    expect(isUnknownColumnError("PGRST204 could not find column")).toBe(true);
    expect(isUnknownColumnError("schema cache")).toBe(true);
    expect(isUnknownColumnError("random error")).toBe(false);
  });
});