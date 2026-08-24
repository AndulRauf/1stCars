import { describe, it, expect, beforeEach } from "vitest";

// ============================================================
// PHASE 1 — SALES CRM + SALES AUTOMATION tests
//
// Run against the project's mock Supabase client (same pattern as
// careers.test.ts): the mock override must be enabled BEFORE
// supabaseClient is imported so isRealSupabase resolves to the mock.
//
// The vehicle-owner assignment PRIORITY itself lives in
// public/sales_crm_phase1.sql (DB trigger, server-side). These tests
// cover the client-side CRM logic that rides on top of it:
//   - legacy → pipeline status mapping (existing rows keep working)
//   - stage transition guard (NEW → … → SOLD, LOST terminal)
//   - lead privacy filter (associate sees own + pool, never others')
//   - vehicle-owner resolution via cars.created_by (Test A/C/D)
//   - overview KPI computation from real rows
// ============================================================

describe("phase 1 — sales CRM + sales automation", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).window = { location: { pathname: "/" } };
    (globalThis as any).localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; }
    };
    localStorage.setItem("1stcars_use_mock_db", "true");
  });

  it("maps legacy lead statuses onto the pipeline without breaking them", async () => {
    const { mapLegacyStatus, PIPELINE_STAGES } = await import("@/src/lib/salesCrm");
    // Existing production values keep working:
    expect(mapLegacyStatus("pending")).toBe("new");
    expect(mapLegacyStatus("Pending")).toBe("new");
    expect(mapLegacyStatus("contacted")).toBe("contacted");
    expect(mapLegacyStatus("resolved")).toBe("sold");
    expect(mapLegacyStatus("payment_submitted")).toBe("negotiation");
    // New pipeline values pass through:
    for (const s of PIPELINE_STAGES) expect(mapLegacyStatus(s)).toBe(s);
    expect(mapLegacyStatus("lost")).toBe("lost");
    // Unknown → new (never crash on dirty data)
    expect(mapLegacyStatus("weird_value")).toBe("new");
    expect(mapLegacyStatus(null)).toBe("new");
  });

  it("enforces the pipeline lifecycle: NEW → … → SOLD with LOST terminal", async () => {
    const { STAGE_FLOW, PIPELINE_STAGES } = await import("@/src/lib/salesCrm");
    // Happy path is walkable end-to-end:
    const happy = ["new", "contacted", "qualified", "appointment", "test_drive", "negotiation", "booked", "sold"];
    for (let i = 0; i < happy.length - 1; i++) {
      expect(STAGE_FLOW[happy[i] as keyof typeof STAGE_FLOW]).toContain(happy[i + 1]);
    }
    // LOST is reachable from every open stage and is terminal:
    for (const s of PIPELINE_STAGES) {
      if (s !== "sold") expect(STAGE_FLOW[s as keyof typeof STAGE_FLOW]).toContain("lost");
    }
    expect(STAGE_FLOW.lost).toEqual([]);
    expect(STAGE_FLOW.sold).toEqual([]);
  });

  it("rejects invalid stage jumps and persists valid ones (Test A flow)", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");
    const { salesCrm } = await import("@/src/lib/salesCrm");

    const lead = {
      name: "Rahul Sharma",
      mobile: "9876500001",
      city: "Surat",
      car_id: "car-aaa1",
      car_brand: "Honda",
      car_model: "City",
      type: "buy_now",
      status: "pending",
      assigned_to: "user-assoc-a",
      assigned_to_name: "Associate A"
    };
    await supabase.from("sales_notifications").insert([lead]);
    const { data: rows } = await supabase.from("sales_notifications").select();
    const stored = (rows as any[]).find((r) => r.mobile === "9876500001");
    expect(stored).toBeTruthy();

    // Invalid jump: NEW → BOOKED must be rejected without touching the row.
    const bad = await salesCrm.updateLeadStage(stored as any, "booked");
    expect(bad.error).toBeTruthy();

    // Valid step: NEW → CONTACTED persists.
    const ok = await salesCrm.updateLeadStage(stored as any, "contacted");
    expect(ok.error).toBeUndefined();
    const { data: after } = await supabase.from("sales_notifications").select();
    const updated = (after as any[]).find((r) => r.id === stored.id);
    expect(updated.status).toBe("contacted");
  });

  it("lead privacy: an associate sees own + pool leads, never another associate's (Test G)", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");
    const { salesCrm } = await import("@/src/lib/salesCrm");

    await supabase.from("sales_notifications").insert([
      { name: "Mine A",   mobile: "9000000001", city: "Surat", car_id: "car-a", car_brand: "Honda", car_model: "City", type: "buy_now", status: "pending", assigned_to: "assoc-A", assigned_to_name: "A" },
      { name: "Theirs B", mobile: "9000000002", city: "Surat", car_id: "car-b", car_brand: "Audi",  car_model: "A6",   type: "buy_now", status: "pending", assigned_to: "assoc-B", assigned_to_name: "B" },
      { name: "Pool",     mobile: "9000000003", city: "Surat", car_id: "car-c", car_brand: "BMW",   car_model: "M4",   type: "buy_now", status: "pending" }
    ]);

    const seenByA = await salesCrm.getLeads("assoc-A", false);
    const names = seenByA.map((l) => l.name).sort();
    // A sees their own lead + the shared unassigned pool — never B's lead.
    expect(names).toContain("Mine A");
    expect(names).toContain("Pool");
    expect(names).not.toContain("Theirs B");

    // Admin sees everything (incl. B's lead).
    const seenByAdmin = await salesCrm.getLeads("admin-1", true);
    expect(seenByAdmin.map((l) => l.name)).toContain("Theirs B");
  });

  it("vehicle ownership: the uploading associate owns the lead (Tests A/C/D)", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");
    const { resolveLeadOwner } = await import("@/src/lib/leadAssignment");

    // Test A: Associate A uploads Car A → lead for Car A resolves to A.
    await supabase.from("cars").insert([{
      id: "car-owned-a", title: "Honda City", brand: "Honda", model: "City",
      year: 2021, price: 625000, status: "available",
      created_by: "assoc-A", created_by_name: "Associate A"
    }]);
    const ownerA = await resolveLeadOwner({ id: "car-owned-a", brand: "Honda", model: "City" });
    expect(ownerA?.id).toBe("assoc-A");

    // Test C: even if round-robin would pick B, the owner is still A.
    // (resolveLeadOwner returns the vehicle owner — the DB trigger enforces
    // the same priority server-side before round-robin can run.)
    expect(ownerA?.id).not.toBe("assoc-B");

    // Test D: a car with no associate owner → null → existing fallback.
    await supabase.from("cars").insert([{
      id: "car-no-owner", title: "Admin Demo Car", brand: "BMW", model: "X5",
      year: 2023, price: 9000000, status: "available", created_by: null
    }]);
    const ownerNone = await resolveLeadOwner({ id: "car-no-owner", brand: "BMW", model: "X5" });
    expect(ownerNone).toBeNull();
  });

  it("overview KPIs are computed from the associate's real rows only", async () => {
    const { salesCrm } = await import("@/src/lib/salesCrm");
    const leads = [
      { id: "1", status: "pending",   type: "test_drive", car_id: "car-a", preferred_date: new Date().toISOString().split("T")[0], assigned_to: "assoc-A" },
      { id: "2", status: "contacted", type: "buy_now",    car_id: "car-a", preferred_date: "2099-01-01", assigned_to: "assoc-A" },
      { id: "3", status: "sold",      type: "buy_now",    car_id: "car-a", assigned_to: "assoc-A" },
      { id: "4", status: "lost",      type: "buy_now",    car_id: "car-a", assigned_to: "assoc-A" }
    ] as any[];
    const cars = [
      { id: "car-a", status: "available", created_at: new Date().toISOString() },
      { id: "car-x", status: "pending",   created_at: new Date().toISOString() }
    ] as any[];
    const followUps = [
      { id: "f1", status: "open", due_at: new Date().toISOString() },
      { id: "f2", status: "completed", due_at: new Date().toISOString() }
    ] as any[];
    const testDrives = [
      { id: "t1", car_id: "car-a", status: "scheduled", preferred_date: "2099-01-01" }
    ];

    const k = salesCrm.computeOverview(leads, cars, followUps, testDrives);
    expect(k.myCars).toBe(2);
    expect(k.activeCars).toBe(1);
    expect(k.newLeads).toBe(1);
    expect(k.activeLeads).toBe(2); // pending + contacted (sold/lost excluded)
    expect(k.followUpsDue).toBe(1);
    expect(k.todaysAppointments).toBe(1);
    expect(k.upcomingTestDrives).toBe(1);
    expect(k.bookings).toBe(0);
    expect(k.sales).toBe(1);

    // Per-car roll-ups for the My Cars cards:
    const counts = salesCrm.countByCar(leads, testDrives);
    expect(counts["car-a"].leads).toBe(4);
    expect(counts["car-a"].appointments).toBe(1); // the single test_drive-type lead
    expect(counts["car-a"].testDrives).toBe(1);
  });
});

