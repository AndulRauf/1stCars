import * as React from "react";
import { X, Phone, Check, User, Store, ShieldCheck, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { getOrCreateAutoPassword, resolveAutoSignIn } from "@/src/lib/autoAuth";
import { generateDerivedEmail } from "@/src/lib/utils";

export type MobileLoginRole = "Buyer" | "Seller";

interface MobileLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

// Mobile quick login for Buyers & Sellers only. The user picks a role, enters
// a 10-digit mobile number and verifies it (simulated OTP in mock mode; the
// concierge verifies the number on the phone in real mode — no SMS is faked).
// On success the caller routes to the role dashboard (Buyer -> buyer dashboard,
// Seller -> seller dashboard) exactly like the other auth flows.
export function MobileLoginModal({ isOpen, onClose, onLoginSuccess }: MobileLoginModalProps) {
  const [role, setRole] = React.useState<MobileLoginRole | null>(null);
  const [mobile, setMobile] = React.useState("");
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [generatedOtp, setGeneratedOtp] = React.useState("");
  const [enteredOtp, setEnteredOtp] = React.useState("");
  const [isOtpVerified, setIsOtpVerified] = React.useState(false);
  const [otpCountdown, setOtpCountdown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setRole(null);
      setMobile("");
      setIsOtpSent(false);
      setIsOtpVerified(false);
      setEnteredOtp("");
      setError("");
      setGeneratedOtp("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    if (mobile.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setIsOtpSent(true);
    setOtpCountdown(30);
    toast.success(`Verification OTP sent to +91 ${mobile}! Simulated OTP: ${code}`);
  };

  const handleVerifyOtp = () => {
    if (!enteredOtp) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }
    if (enteredOtp === generatedOtp) {
      setIsOtpVerified(true);
      toast.success("Mobile number verified successfully!");
    } else {
      toast.error("Invalid OTP code. Please try again.");
    }
  };

  const completeLogin = async () => {
    setLoading(true);
    setError("");
    const digits = mobile.replace(/\D/g, "").slice(-10);
    const email = generateDerivedEmail(digits);
    const autoPassword = getOrCreateAutoPassword(email);
    const defaultName = `User ${digits.slice(-4)}`;

    try {
      if (!isRealSupabase) {
        const mockUser = {
          id: `mob-${(role as string).toLowerCase()}-${digits}`,
          name: defaultName,
          email,
          mobile: digits,
          role,
          city: "Surat",
          created_at: new Date().toISOString()
        };
        toast.success(`Logged in as ${role}! Redirecting to your dashboard...`);
        onLoginSuccess(mockUser);
        onClose();
        return;
      }

      // Reuse an existing Buyer/Seller account for this mobile number when one
      // exists; otherwise auto-create an account in the chosen role (same
      // derived-email scheme the booking/inspection flows already use).
      let profile: any = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("mobile", digits)
          .in("role", ["Buyer", "Seller"])
          .limit(1);
        profile = data?.[0] || null;
      } catch (e) {
        console.warn("[mobile-login] profile lookup skipped:", e);
      }

      const { user } = await resolveAutoSignIn(
        supabase,
        profile?.email || email,
        autoPassword,
        {
          data: {
            name: profile?.name || defaultName,
            mobile: digits,
            role,
            city: "Surat"
          }
        }
      );

      if (!user) {
        setError("Could not sign in with this mobile number. Please try again.");
        return;
      }

      const resolvedUser = {
        id: user.id,
        name: profile?.name || user.user_metadata?.name || defaultName,
        email: profile?.email || email,
        mobile: digits,
        role: profile?.role || role,
        city: profile?.city || "Surat"
      };
      toast.success(`Logged in as ${resolvedUser.role}! Redirecting to your dashboard...`);
      onLoginSuccess(resolvedUser);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!role) {
      setError("Please choose how you want to log in: Buyer or Seller.");
      return;
    }
    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!isRealSupabase && !isOtpVerified) {
      if (isOtpSent && enteredOtp === generatedOtp) {
        setIsOtpVerified(true);
      } else {
        setError("Please send & verify your Mobile OTP before logging in.");
        return;
      }
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
              {role ? (role === "Seller" ? "Seller Login" : "Buyer Login") : "Log In"}
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {role
                ? `Enter your mobile number to access your ${role.toLowerCase()} dashboard.`
                : "Choose your account type to continue."}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">
              ⚠️ {error}
            </div>
          )}

          {!role ? (
            /* Step 1 — role selection (Buyer / Seller only) */
            <div className="grid grid-cols-1 gap-3">
              {([
                { value: "Buyer", label: "Buyer", desc: "Browse, save & book test drives", icon: User },
                { value: "Seller", label: "Seller", desc: "Sell your car & track inspections", icon: Store }
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-[#FAF9F5] hover:border-[#2E7D32]/40 hover:bg-white transition-all cursor-pointer text-left shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center shrink-0 group-hover:bg-[#2E7D32] group-hover:text-white transition-colors">
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-sm">{opt.label}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{opt.desc}</p>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-slate-300 rotate-180 group-hover:text-[#2E7D32] transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            /* Step 2 — mobile + OTP */
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setRole(null)}
                className="text-[11px] font-black uppercase tracking-wider text-[#2E7D32] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change account type
              </button>

              <div className="flex items-center gap-2.5 p-3 bg-[#FFFDF7] border border-amber-200/80 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  {role === "Seller" ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">{role}</p>
                  <p className="text-[10px] text-slate-500 font-bold">You'll be redirected to your {role.toLowerCase()} dashboard.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone className="h-3 w-3 text-[#2E7D32]" /> Mobile Number *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">+91</span>
                    <Input
                      type="tel"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setIsOtpVerified(false);
                        setError("");
                      }}
                      placeholder="10-digit mobile number"
                      disabled={isOtpVerified}
                      required
                      className="h-10 pl-10 text-xs font-bold rounded-xl"
                    />
                  </div>
                  {!isRealSupabase && !isOtpVerified && (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpCountdown > 0 || !mobile || mobile.length < 10}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold h-10 px-3.5 rounded-xl shrink-0 cursor-pointer"
                    >
                      {otpCountdown > 0 ? `${otpCountdown}s` : isOtpSent ? "Resend OTP" : "Send OTP"}
                    </Button>
                  )}
                </div>

                {!isRealSupabase && isOtpSent && !isOtpVerified && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-900 uppercase">Enter 6-Digit OTP</span>
                      <span className="text-[10px] font-bold text-emerald-700">Simulated Code: <strong className="bg-emerald-200 px-1.5 py-0.5 rounded font-mono text-slate-900">{generatedOtp}</strong></span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        className="h-9 text-xs font-mono font-bold rounded-xl bg-white text-center tracking-widest flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => setEnteredOtp(generatedOtp)}
                        variant="outline"
                        className="h-9 px-2.5 text-[10px] font-black uppercase text-emerald-800 border-emerald-300 bg-white hover:bg-emerald-100 rounded-xl shrink-0 cursor-pointer"
                      >
                        Auto-Fill
                      </Button>
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="h-9 px-4 text-xs font-black bg-[#2E7D32] hover:bg-[#25632a] text-white rounded-xl shrink-0 cursor-pointer"
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                )}

                {isRealSupabase && (
                  <p className="text-[10px] text-slate-400 font-semibold pt-0.5">
                    We'll sign you in with your registered mobile number.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-wider h-12 rounded-xl cursor-pointer shadow-md shadow-[#2E7D32]/20 flex items-center justify-center gap-2"
              >
                {loading ? <span>Logging in...</span> : (<><Send className="h-4 w-4" /> {isOtpVerified ? "Login Now" : "Login with Mobile"}</>)}
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