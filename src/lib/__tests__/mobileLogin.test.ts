import { describe, it, expect } from "vitest";
import { resolveMobileLogin, normalizeMobile, type MobileLoginProfile } from "@/src/lib/mobileLogin";

// ============================================================
// MOBILE LOGIN decision logic — security regression tests
//
// Locks in the contract: a typed mobile number NEVER grants access.
// Routing only happens for the signed-in user's OWN profile(s); a
// signed-out visitor is sent to the existing email login; and a
// signed-in user can never be routed to someone else's dashboard.
// ============================================================

function profile(over: Partial<MobileLoginProfile> & { id: string; role: string; mobile?: string }): MobileLoginProfile {
  return { id: over.id, role: over.role, mobile: over.mobile ?? "9876543210" };
}

describe("resolveMobileLogin — identity gate", () => {
  it("requires the existing email login when there is NO session", () => {
    // Signed-out visitor typed a mobile: never grant access, never mint a
    // session — direct them to the email/password AuthModal.
    const decision = resolveMobileLogin(null, "9876543210", [
      profile({ id: "u-1", role: "Buyer" })
    ]);
    expect(decision).toEqual({ action: "require_email_login" });
  });

  it("treats an empty/whitespace session id as signed out", () => {
    expect(resolveMobileLogin("", "9876543210", [])).toEqual({ action: "require_email_login" });
  });
});

describe("resolveMobileLogin — routing to the correct dashboard", () => {
  it("routes a signed-in Buyer straight to the Buyer dashboard", () => {
    const decision = resolveMobileLogin("u-1", "9876543210", [
      profile({ id: "u-1", role: "Buyer" })
    ]);
    expect(decision).toMatchObject({ action: "route", role: "Buyer" });
    if (decision.action === "route") expect(decision.profile.id).toBe("u-1");
  });

  it("routes a signed-in Seller straight to the Seller dashboard", () => {
    const decision = resolveMobileLogin("u-2", "9123456789", [
      profile({ id: "u-2", role: "Seller", mobile: "9123456789" })
    ]);
    expect(decision).toMatchObject({ action: "route", role: "Seller" });
  });

  it("lets the user choose when their number has BOTH a Buyer and a Seller profile", () => {
    const decision = resolveMobileLogin("u-3", "9876543210", [
      profile({ id: "u-3", role: "Buyer" }),
      profile({ id: "u-3", role: "Seller" })
    ]);
    expect(decision.action).toBe("choose");
    if (decision.action === "choose") {
      expect([...decision.roles].sort()).toEqual(["Buyer", "Seller"]);
      expect(decision.profiles.every((p) => p.id === "u-3")).toBe(true);
    }
  });
});

describe("resolveMobileLogin — no cross-user access (RLS-safe)", () => {
  it("does NOT route to another user's dashboard even if their mobile matches", () => {
    // Signed in as u-1, but the only matching profile belongs to u-9.
    const decision = resolveMobileLogin("u-1", "9876543210", [
      profile({ id: "u-9", role: "Seller" })
    ]);
    expect(decision).toEqual({ action: "no_match" });
  });

  it("returns no_match when the mobile does not match the signed-in user", () => {
    const decision = resolveMobileLogin("u-1", "9000000000", [
      profile({ id: "u-1", role: "Buyer", mobile: "9876543210" })
    ]);
    expect(decision).toEqual({ action: "no_match" });
  });

  it("ignores non Buyer/Seller roles (Dealer/Admin/Inspector) for this flow", () => {
    const decision = resolveMobileLogin("u-1", "9876543210", [
      profile({ id: "u-1", role: "Dealer" })
    ]);
    expect(decision).toEqual({ action: "no_match" });
  });
});

describe("normalizeMobile", () => {
  it("keeps only the last 10 digits regardless of formatting", () => {
    expect(normalizeMobile("+91 98765 43210")).toBe("9876543210");
    expect(normalizeMobile("9876543210")).toBe("9876543210");
    expect(normalizeMobile("")).toBe("");
    expect(normalizeMobile(null)).toBe("");
  });
});
