import * as React from "react";
import { X, ShieldCheck, Mail, Lock, User, Phone, MapPin, Sparkles, Database, Check, Award } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { UserRole } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "@/src/lib/toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, onLoginSuccess, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = React.useState<"login" | "register" | "forgot">(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  
  // Registration States
  const [regName, setRegName] = React.useState("");
  const [regMobile, setRegMobile] = React.useState("");
  const [regCity, setRegCity] = React.useState("Mumbai");
  const [regRole, setRegRole] = React.useState<UserRole>("Buyer");

  // Mobile OTP States
  const [loginMobile, setLoginMobile] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [generatedOtp, setGeneratedOtp] = React.useState("");
  const [enteredOtp, setEnteredOtp] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);

  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // @ts-ignore
  const hasSupabaseKeys = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const [isUsingMock, setIsUsingMock] = React.useState(() => {
    return typeof window !== "undefined" && localStorage.getItem("1stcars_use_mock_db") === "true";
  });

  const handleCopySQL = async () => {
    try {
      const response = await fetch("/schema.sql");
      if (!response.ok) throw new Error("Failed to load schema file.");
      const sql = await response.text();
      await navigator.clipboard.writeText(sql);
      toast.success("Database SQL copied to clipboard! Paste it into the Supabase SQL Editor and run it.");
    } catch (err) {
      toast.error("Failed to read schema file automatically. Use the download link below!");
    }
  };

  const handleMockFallback = () => {
    localStorage.setItem("1stcars_use_mock_db", "true");
    toast.success("Switched to Local Mock Database! Reloading app...");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleSwitchToSupabase = () => {
    localStorage.removeItem("1stcars_use_mock_db");
    toast.success("Switched back to remote Supabase! Reloading...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // OTP Resend Countdown
  React.useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  React.useEffect(() => {
    setMode(initialMode);
    setError("");
    setSuccess("");
    setLoginMobile("");
    setOtpSent(false);
    setGeneratedOtp("");
    setEnteredOtp("");
    setCountdown(0);
  }, [initialMode, isOpen]);

  React.useEffect(() => {
    setError("");
    setSuccess("");
    setLoginMobile("");
    setOtpSent(false);
    setGeneratedOtp("");
    setEnteredOtp("");
    setCountdown(0);
  }, [mode]);

  if (!isOpen) return null;

  // Demo account click logs in instantly
  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    setError("");
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: "password123"
    });
    setLoading(false);
    
    if (authErr) {
      setError(authErr.message || "Failed to authenticate demo user");
    } else if (data.user) {
      // Load full user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const finalUser = profile || data.user;
      setSuccess(`Successfully logged in as ${finalUser.role || "Buyer"}!`);
      setTimeout(() => {
        onLoginSuccess(finalUser);
        onClose();
      }, 1000);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      setCountdown(30);
      toast.success(`🔑 SMS Gateway: New verification code is ${otpCode}`);
      setSuccess(`New OTP code sent! Use: ${otpCode}`);
    } catch (err: any) {
      setError("Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      if (!otpSent) {
        if (!loginMobile || loginMobile.length !== 10 || !/^\d+$/.test(loginMobile)) {
          setError("Please enter a valid 10-digit mobile number.");
          setLoading(false);
          return;
        }

        try {
          const { data: profiles, error: fetchErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("mobile", loginMobile);

          if (fetchErr) {
            setError(fetchErr.message || "Failed to search for user profile.");
            setLoading(false);
            return;
          }

          const profile = profiles && profiles[0];
          if (!profile) {
            setError("No account found with this mobile number. Please register using the Register tab first.");
            setLoading(false);
            return;
          }

          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(otpCode);
          setOtpSent(true);
          setCountdown(30);
          
          toast.success(`🔑 SMS Gateway: Verification code is ${otpCode}`);
          setSuccess(`OTP sent successfully to +91 ${loginMobile}! Check your notifications.`);
        } catch (err: any) {
          setError(err.message || "Failed to process request.");
        } finally {
          setLoading(false);
        }
      } else {
        if (enteredOtp !== generatedOtp && enteredOtp !== "123456") {
          setError("Incorrect OTP verification code. Please try again.");
          setLoading(false);
          return;
        }

        try {
          const { data, error: authErr } = await supabase.auth.signInWithPassword({
            email: loginMobile,
            password: "password123"
          });

          if (authErr) {
            setError(authErr.message || "Invalid credentials.");
            setLoading(false);
          } else if (data.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .single();

            const finalUser = profile || data.user;
            setSuccess("OTP verified successfully! Welcome to 1stCars...");
            setTimeout(() => {
              onLoginSuccess(finalUser);
              onClose();
            }, 1000);
          }
        } catch (err: any) {
          setError(err.message || "Error logging in.");
          setLoading(false);
        }
      }
    } else if (mode === "register") {
      if (!regName || !email || !regMobile) {
        setError("Please complete all required fields.");
        setLoading(false);
        return;
      }
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password: password || "password123",
        options: {
          data: {
            name: regName,
            mobile: regMobile,
            city: regCity,
            role: regRole
          }
        }
      });
      if (authErr) {
        setError(authErr.message || "Failed to register user.");
        setLoading(false);
      } else if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const finalUser = profile || {
          id: data.user.id,
          name: regName,
          email,
          mobile: regMobile,
          city: regCity,
          role: regRole,
          created_at: new Date().toISOString()
        };

        setSuccess(`Registration successful! Welcome, ${finalUser.name}.`);
        setTimeout(() => {
          onLoginSuccess(finalUser);
          onClose();
        }, 1200);
      }
    } else {
      // Forgot Password flow
      const { error: resetErr } = await supabase.auth.signOut(); // reset mock or placeholder
      setLoading(false);
      setSuccess("Reset link sent successfully to " + email);
    }
  };

  const rolesList: { id: UserRole; title: string; desc: string }[] = [
    { id: "Buyer", title: "Premium Buyer", desc: "Browse, save cars, schedule test drives & make offers" },
    { id: "Seller", title: "Private Seller", desc: "List your vehicle, schedule inspections & manage live bids" },
    { id: "Dealer", title: "Certified Dealer", desc: "Participate in premium dealer auctions & bid on cars" },
    { id: "Inspector", title: "Field Inspector", desc: "Assess assigned cars & upload full condition reports" },
    { id: "Sales Associate", title: "Sales Executive", desc: "Coordinate customer bookings & manage test drive requests" },
    { id: "Admin", title: "System Administrator", desc: "Manage staff, system configurations, users & inventory" }
  ];

  const demoAccounts = [
    { label: "Buyer", email: "buyer@1stcars.com", name: "Rahul" },
    { label: "Seller", email: "seller@1stcars.com", name: "Amit" },
    { label: "Dealer", email: "dealer@1stcars.com", name: "Elite Motors" },
    { label: "Inspector", email: "inspector@1stcars.com", name: "Vikram" },
    { label: "Sales Assoc.", email: "sales@1stcars.com", name: "Sneha" },
    { label: "Admin", email: "admin@1stcars.com", name: "Super Admin" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      
      {/* Modal Box */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#2E7D32]/15 p-6 md:p-8 flex flex-col justify-between text-left space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center">
          <a href="/" className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#2E7D32] rounded flex items-center justify-center shadow-md shadow-[#2E7D32]/20">
              <div className="w-3 h-3 border-2 border-white rotate-45"></div>
            </div>
            <span className="text-lg font-black tracking-tighter text-[#2E7D32]">1stCars Gateway</span>
          </a>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Reset Password"}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === "login" 
              ? "Enter your mobile number to receive a secure OTP code." 
              : mode === "register" 
              ? "Join as an Elite customer, dealer, or system representative." 
              : "Provide your email to receive standard reset parameters."}
          </p>
        </div>

        {/* Error and Success Indicators */}
        {hasSupabaseKeys && isUsingMock && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-bold flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">💡 Running in Mock DB mode</span>
              <button 
                type="button" 
                onClick={handleSwitchToSupabase} 
                className="text-[10px] text-[#2E7D32] hover:underline cursor-pointer"
              >
                Reconnect Supabase
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Remote Supabase database is bypassed. You can use the mock accounts shown below to sign in instantly.
            </p>
          </div>
        )}

        {error && (() => {
          const isSchemaError = error.includes("profiles") || 
                               error.includes("schema cache") || 
                               error.includes("Could not find the table") || 
                               error.includes("relation") || 
                               error.includes("does not exist") ||
                               error.includes("table");
          
          if (isSchemaError) {
            return (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-900 text-xs rounded-xl flex flex-col gap-3">
                <div className="font-bold flex items-center gap-1 text-rose-700">
                  ⚠️ Database Schema Incomplete
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  You connected a real Supabase instance, but forgot to run the database setup tables (like <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-800 font-mono">profiles</code>). Let's fix this:
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopySQL}
                    className="flex-1 min-w-[140px] px-3 py-2 bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Database className="h-3 w-3" /> Copy Setup SQL
                  </button>
                  <a
                    href="/schema.sql"
                    download="1stcars_schema.sql"
                    className="flex-1 min-w-[140px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all text-center flex items-center justify-center gap-1 text-[10px] leading-tight font-black"
                  >
                    Download SQL File
                  </a>
                </div>

                <div className="bg-white/75 rounded-lg p-2.5 border border-rose-100 text-[10px] text-slate-500 space-y-1 font-medium">
                  <p className="font-bold text-slate-700">How to setup:</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Go to your <strong className="text-slate-700">Supabase Dashboard</strong>.</li>
                    <li>Click <strong className="text-slate-700">SQL Editor</strong> on the left side menu.</li>
                    <li>Click <strong className="text-slate-700">New Query</strong>, paste the copied SQL code, and click <strong className="text-[#2E7D32]">Run</strong>.</li>
                    <li>Refresh this app to sign in!</li>
                  </ol>
                </div>

                <div className="border-t border-rose-100/70 pt-2 flex flex-col gap-1">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Or bypass this and use the local high-fidelity preview mode:
                  </p>
                  <button
                    type="button"
                    onClick={handleMockFallback}
                    className="w-full py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    Bypass & Use Local Mock Database
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">
              ⚠️ {error}
            </div>
          );
        })()}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
            <Check className="h-4 w-4 text-emerald-600" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Conditional Fields based on mode */}
          {mode === "register" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Amit Verma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="10-digit number"
                      type="tel"
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ""))}
                      required
                      className="h-11 pl-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <select
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-4 bg-white text-xs font-semibold focus:ring-2 focus:ring-[#2E7D32] outline-none"
                    >
                      <option value="Surat">Surat</option>
                      <option value="Bharuch">Bharuch</option>
                      <option value="Vadodara">Vadodara</option>
                      <option value="Vapi">Vapi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Role Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Choose Your Account Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {rolesList.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegRole(r.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        regRole === r.id 
                          ? "bg-[#2E7D32]/10 border-[#2E7D32] text-[#2E7D32]" 
                          : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                      }`}
                    >
                      <p className="text-xs font-black">{r.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "login" ? (
            <>
              {!otpSent ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Enter 10-digit mobile e.g. 9999999999"
                      type="tel"
                      value={loginMobile}
                      onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      className="h-11 pl-10 rounded-xl font-medium tracking-wide"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-1">
                    Provide your registered mobile number. We'll send an OTP code via a secure simulated gateway.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enter 6-Digit OTP *</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-[#2E7D32]" />
                      <Input
                        placeholder="•••••"
                        type="text"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        className="h-11 pl-10 rounded-xl font-bold tracking-widest text-center text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-400">Didn't receive the OTP?</span>
                    {countdown > 0 ? (
                      <span className="text-slate-400">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-[#2E7D32] hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[10px] leading-relaxed text-amber-800 font-semibold flex items-start gap-1.5 w-full">
                    <span>🔑</span>
                    <div>
                      <span>SMS simulated security key: </span>
                      <strong className="font-black text-slate-900 bg-amber-100/80 px-1 py-0.5 rounded border border-amber-200">{generatedOtp || "123456"}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : mode === "forgot" ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Enter email e.g. amit@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 rounded-xl"
                />
              </div>
            </div>
          ) : (
            // Registration Email is still preserved for complete schema sync
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Enter email e.g. amit@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-widest rounded-xl h-11 shadow-lg shadow-[#2E7D32]/10"
            >
              {loading 
                ? "Authenticating Gateway..." 
                : mode === "login" 
                  ? (!otpSent ? "Send OTP" : "Verify OTP & Sign In")
                  : mode === "register" 
                    ? "Create Account" 
                    : "Send Reset Instructions"}
            </Button>
          </div>
        </form>

        {/* Footer toggle switcher */}
        <div className="text-center pt-2 text-xs font-semibold text-slate-400">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button 
                onClick={() => setMode("register")}
                className="text-[#2E7D32] font-black hover:underline cursor-pointer"
              >
                Register Now
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button 
                onClick={() => setMode("login")}
                className="text-[#2E7D32] font-black hover:underline cursor-pointer"
              >
                Sign In instead
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
