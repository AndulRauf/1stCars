// 1stCars — mobile "Login as Buyer / Seller" decision logic (pure + testable).
//
// SECURITY CONTRACT (do not weaken):
//   A typed mobile number NEVER establishes identity and NEVER grants access to
//   private dashboard data. Identity MUST come from an already-verified session
//   (email/password or Google via the existing AuthModal). The mobile number is
//   used ONLY to decide which of the signed-in user's OWN dashboards to open.
//
// Why the lookup is gated on the signed-in user's id:
//   `public.profiles` SELECT is `TO authenticated USING (true)`, so any signed-in
//   user can read every profile row. Without an id gate, a signed-in user could
//   type someone else's mobile and be routed to that person's dashboard. We only
//   ever consider rows whose `id` equals the authenticated user's id, so a user
//   can only ever open their own Buyer/Seller dashboard.

export type MobileLoginRole = "Buyer" | "Seller";

/** Minimal shape of a `public.profiles` row this module needs. */
export interface MobileLoginProfile {
  id: string;
  role: string;
  mobile?: string | null;
  email?: string | null;
  name?: string | null;
  city?: string | null;
  created_at?: string | null;
}

export type MobileLoginDecision =
  /** No verified session -> direct the user to the existing email login. */
  | { action: "require_email_login" }
  /** Signed in, but no Buyer/Seller profile matches this mobile for the user. */
  | { action: "no_match" }
  /** Exactly one role -> route straight to that dashboard. */
  | { action: "route"; role: MobileLoginRole; profile: MobileLoginProfile }
  /** The signed-in user owns both a Buyer and a Seller profile -> let them pick. */
  | { action: "choose"; roles: MobileLoginRole[]; profiles: MobileLoginProfile[] };

/** Normalise a mobile to its last 10 digits (India), ignoring formatting. */
export function normalizeMobile(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "").slice(-10);
}

function isMobileRole(role: unknown): role is MobileLoginRole {
  return role === "Buyer" || role === "Seller";
}

/**
 * Decide the mobile-login outcome. `sessionUserId` is the authenticated user's
 * id (auth.uid()); it MUST be non-null for any routing to happen. `profiles`
 * are the rows the caller fetched for the entered mobile (readable because the
 * caller is authenticated). Only rows owned by `sessionUserId` are considered,
 * so no other user's data can ever be surfaced or routed to.
 */
export function resolveMobileLogin(
  sessionUserId: string | null | undefined,
  mobile: string,
  profiles: MobileLoginProfile[]
): MobileLoginDecision {
  // Identity gate: a mobile number alone can never grant access.
  if (!sessionUserId) return { action: "require_email_login" };

  const digits = normalizeMobile(mobile);
  if (!digits) return { action: "no_match" };

  // Only the signed-in user's OWN profiles for this mobile (no cross-user leak).
  const own = (profiles || []).filter(
    (p) => p && p.id === sessionUserId && normalizeMobile(p.mobile) === digits
  );

  const roles = Array.from(
    new Set(own.map((p) => p.role).filter(isMobileRole))
  ) as MobileLoginRole[];

  if (roles.length === 0) return { action: "no_match" };

  if (roles.length === 1) {
    const profile = own.find((p) => p.role === roles[0]) as MobileLoginProfile;
    return { action: "route", role: roles[0], profile };
  }

  // Defensive: the same signed-in user has both a Buyer and a Seller profile.
  return { action: "choose", roles, profiles: own };
}
