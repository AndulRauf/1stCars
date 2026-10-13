import * as React from "react";
import { X, Phone, User, Store, ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import {
  resolveMobileLogin,
  normalizeMobile,
  type MobileLoginRole,
  type MobileLoginProfile,
} from "@/src/lib/mobileLogin";

interface MobileLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  /** Opens the existing email/password AuthModal (used when no session exists). */
  onRequestEmailLogin?: () => void;
}

// Mobile "Login as Buyer / Seller". SECURITY: a mobile number NEVER establishes
// identity on its own. The user must already have a verified session (email or
// Google via the existing AuthModal); the mobile number is used ONLY to pick
// which of the signed-in user's OWN dashboards (Buyer / Seller) to open. If
// there is no session we direct the user to the existing email login instead of
// minting any access. See src/lib/mobileLogin.ts for the decision contract.
export function MobileLoginModal({ isOpen, onClose, onLoginSuccess, onRequestEmailLogin }: MobileLoginModalProps) {
  const [mobile, setMobile] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  // When the signed-in user owns BOTH a Buyer and a Seller profile for this
  // number, we hold the candidates and let them choose which dashboard to open.
  const [choice, setChoice] = React.useState<{ roles: MobileLoginRole[]; profiles: MobileLoginProfile[] } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMobile("");
      setError("");
      setChoice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const finishLogin = (profile: MobileLoginProfile, role: MobileLoginRole) => {
    const resolvedUser = {
      id: profile.id,
      name: profile.name || `User ${normalizeMobile(profile.mobile).slice(-4)}`,
      email: profile.email || "",
      mobile: normalizeMobile(profile.mobile) || normalizeMobile(mobile),
      role,
      city: profile.city || "Surat",
      created_at: profile.created_at || new Date().toISOString(),
    };
    toast.success(`Opening your ${role} dashboard…`);
    onLoginSuccess(resolvedUser);
    onClose();
  };

  const completeLogin = async () => {
    setLoading(true);
    setError("");
    setChoice(null);
    const digits = normalizeMobile(mobile);

    try {
      // 1. Identity MUST already exist. A typed mobile number never signs anyone
      //    in and never grants access to private dashboard data on its own.
      const { data: authData } = await supabase.auth.getUser();
      const sessionUserId: string | null = authData?.user?.id || null;
      if (!sessionUserId) {
        // No verified session -> use the existing email/password login.
        toast.info("Please sign in with your email first, then we'll open your dashboard.");
        onRequestEmailLogin?.();
        onClose();
        return;
      }

      // 2. Session exists -> look up THIS user's own Buyer/Seller profile(s) for
      //    the entered mobile (profiles are readable by any authenticated user,
      //    but resolveMobileLogin only ever considers rows owned by this id).
      let profiles: MobileLoginProfile[] = [];
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, mobile, role, city, created_at")
          .eq("mobile", digits)
          .in("role", ["Buyer", "Seller"]);
        profiles = (data as MobileLoginProfile[]) || [];
      } catch (e) {
        console.warn("[mobile-login] profile lookup failed:", e);
      }

      const decision = resolveMobileLogin(sessionUserId, digits, profiles);

      if (decision.action === "route") {
        finishLogin(decision.profile, decision.role);
        return;
      }
      if (decision.action === "choose") {
        setChoice({ roles: decision.roles, profiles: decision.profiles });
        return;
      }
      // no_match: the signed-in user has no Buyer/Seller profile for this number.
      setError("We couldn't find a Buyer or Seller account for this mobile number on your signed-in profile.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!mobile || normalizeMobile(mobile).length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    void completeLogin();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 flex flex-col my-auto max-h-[90vh] relative overflow-hidden text-left">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#2E7D32] rounded flex items-center justify-center shadow-md shadow-[#2E7D32]/20">
              <div className="w-3 h-3 border-2 border-white rotate-45"></div>
            </div>
            <span className="text-lg font-black tracking-tighter text-[#2E7D32]">1stCars Login</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            title="Close"
            className="p-2 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {choice ? "Choose your dashboard" : "Log In"}
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {choice
                ? "This number has both a Buyer and a Seller account. Pick where you'd like to go."
                : "Enter the mobile number on your account to open your Buyer or Seller dashboard."}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">
              ⚠️ {error}
            </div>
          )}

          {choice ? (
            /* Step 3 — the number has BOTH roles; let the user pick. */
            <div className="grid grid-cols-1 gap-3">
              {choice.roles.map((r) => {
                const prof = choice.profiles.find((p) => p.role === r)!;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => finishLogin(prof, r)}
                    className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-[#FAF9F5] hover:border-[#2E7D32]/40 hover:bg-white transition-all cursor-pointer text-left shadow-2xs"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center shrink-0 group-hover:bg-[#2E7D32] group-hover:text-white transition-colors">
                      {r === "Seller" ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-900 text-sm">{r} Dashboard</p>
                      <p className="text-[11px] text-slate-400 font-semibold">
                        {r === "Seller" ? "Sell your car & track inspections" : "Browse, save & book test drives"}
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-slate-300 rotate-180 group-hover:text-[#2E7D32] transition-colors" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => { setChoice(null); setError(""); }}
                className="text-[11px] font-black uppercase tracking-wider text-[#2E7D32] flex items-center gap-1 hover:underline cursor-pointer pt-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Use a different number
              </button>
            </div>
          ) : (
            /* Step 1 — mobile number. Identity is verified by the existing session. */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone className="h-3 w-3 text-[#2E7D32]" /> Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">+91</span>
                  <Input
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    placeholder="10-digit mobile number"
                    required
                    className="h-12 pl-10 text-sm font-bold rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold pt-0.5">
                  For your security, you'll need to be signed in. New here?{" "}
                  <button
                    type="button"
                    onClick={() => { onRequestEmailLogin?.(); onClose(); }}
                    className="text-[#2E7D32] font-bold underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" /> Create an account with email
                  </button>
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-wider h-12 rounded-xl cursor-pointer shadow-md shadow-[#2E7D32]/20 flex items-center justify-center gap-2"
              >
                {loading ? <span>Checking…</span> : "Continue"}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
                <span>1stCars Privacy Secured • No Spam Promise</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}