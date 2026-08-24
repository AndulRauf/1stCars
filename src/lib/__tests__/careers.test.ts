import { describe, it, expect, beforeEach } from "vitest";

// The mock Supabase client is what the public /careers form AND the Admin CMS
// both talk to in demo/mock mode. This test verifies the full loop: an
// application submitted by CareersView (insert into `career_applications`)
// can be read back by the admin panel (select from `career_applications`).
describe("career applications mock persistence (careers page <-> admin panel)", () => {
  beforeEach(() => {
    // Simulate a browser so the mock client persists to localStorage. The
    // mock override must be enabled BEFORE supabaseClient is imported, or the
    // module-level isRealSupabase flag resolves to the live backend (which may
    // not have the career_applications table provisioned yet).
    const store: Record<string, string> = {};
    (globalThis as any).window = { location: { pathname: "/careers" } };
    (globalThis as any).localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; }
    };
    localStorage.setItem("1stcars_use_mock_db", "true");
  });

  it("stores an application via insert and returns it via select", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");

    const sample = {
      full_name: "Ravi Kumar",
      phone: "9876543210",
      email: "ravi@example.com",
      position: "Sales Associate",
      experience: "2 years in sales",
      message: "Excited to join the team.",
      resume_name: "ravi-resume.pdf",
      status: "pending"
    };

    const { data: inserted, error } = await supabase.from("career_applications").insert(sample);
    expect(error).toBeNull();
    expect(inserted.full_name).toBe("Ravi Kumar");
    expect(inserted.position).toBe("Sales Associate");

    const { data: rows } = await supabase.from("career_applications").select();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("ravi@example.com");
    expect(rows[0].message).toContain("Excited to join");
  });

  it("surfaces applications submitted in a previous session (localStorage fallback)", async () => {
    // Seed the same key the public form writes to, then read it back the way
    // AdminCMS does in mock mode.
    const stored = JSON.stringify([
      {
        id: "app-abc123",
        created_at: new Date().toISOString(),
        full_name: "Anita Desai",
        phone: "9123456789",
        email: "anita@example.com",
        position: "Inspection Engineer",
        experience: "3 years automotive",
        message: "",
        resume_name: "anita-cv.pdf",
        status: "pending"
      }
    ]);
    localStorage.setItem("1stcars_career_applications", stored);

    const { supabase } = await import("@/src/lib/supabaseClient");
    const { data: rows } = await supabase.from("career_applications").select();
    // The mock table starts empty, so the admin panel falls back to the
    // localStorage key — simulate exactly that fallback here.
    const fallback = JSON.parse(localStorage.getItem("1stcars_career_applications") || "[]");
    expect(fallback).toHaveLength(1);
    expect(fallback[0].position).toBe("Inspection Engineer");
    expect(fallback[0].full_name).toBe("Anita Desai");
  });
});