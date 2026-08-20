import * as React from "react";
import { X, ShieldCheck, Mail, User, Phone, MapPin, Database, Check, Award, Upload, Lock } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { UserRole } from "@/src/lib/db";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { toast } from "@/src/lib/toast";
import { getOrCreateAutoPassword, resolveAutoSignIn } from "@/src/lib/autoAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  initialMode?: "login" | "register";
  initialEmail?: string;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess, initialMode = "login", initialEmail }: AuthModalProps) {
  const [mode, setMode] = React.useState<"login" | "register" | "forgot">(initialMode);
  const [email, setEmail] = React.useState("");
  
  // Dealer Registration States
  const [regName, setRegName] = React.useState("");
  const [regMobile, setRegMobile] = React.useState("");
  const [regCity, setRegCity] = React.useState("Surat");
  const [dealershipName, setDealershipName] = React.useState("");
  const [visitingCardUrl, setVisitingCardUrl] = React.useState("");
  const [aadharCardUrl, setAadharCardUrl] = React.useState("");

  const handleDealerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "visiting" | "aadhar") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (target === "visiting") {
          setVisitingCardUrl(dataUrl);
          toast.success("Visiting Card photo attached successfully!");
        } else {
          setAadharCardUrl(dataUrl);
          toast.success("Aadhar Card photo attached successfully!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Production builds may not use the local mock database at all — the
  // "Bypass & Use Local Mock Database" escape hatch below is hidden then.
  // @ts-ignore
  const isProdBuild = import.meta.env.PROD === true;

  // Reset form state each time the modal opens. When an initialEmail is
  // provided (e.g. "Go to Seller Dashboard") the login email is pre-filled so
  // the user only enters their password.
  React.useEffect(() => {
    setMode(initialMode);
    setError("");
    setSuccess("");
    setLoginEmail(initialEmail || "");
    setLoginPassword("");
  }, [initialMode, isOpen]);

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

  // ESC key listener to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    setMode(initialMode);
    setError("");
    setSuccess("");
    setLoginEmail("");
    setLoginPassword("");
  }, [initialMode, isOpen]);

  React.useEffect(() => {
    setError("");
    setSuccess("");
  }, [mode]);

  // Demo account click logs in instantly
  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    setError("");
    setSuccess("");

    const matchedDemo = demoAccounts.find(d => d.email === demoEmail) || demoAccounts[0];
    const defaultRole: UserRole = matchedDemo.email.includes("admin") ? "Admin" 
      : matchedDemo.email.includes("seller") ? "Seller" 
      : matchedDemo.email.includes("dealer") ? "Dealer" 
      : matchedDemo.email.includes("inspector") ? "Inspector" 
      : matchedDemo.email.includes("sales") ? "Sales Associate" 
      : "Buyer";

    // Staff roles (Admin / Sales Associate / Inspector) may only be used via
    // the LOCAL mock database. On the real shared backend a public one-click
    // demo sign-in must never mint a staff account.
    const isStaffDemo = ["admin", "sales", "inspector"].some((k) => matchedDemo.email.includes(k));
    if (isRealSupabase && isStaffDemo) {
      setError("Staff demo accounts are only available on the local demo database. Please register a Buyer account or contact the administrator.");
      setLoading(false);
      return;
    }

    if (!isRealSupabase) {
      const mockUser = {
        id: "demo-" + matchedDemo.email.split("@")[0],
        name: matchedDemo.name,
        email: matchedDemo.email,
        role: defaultRole,
        city: "Mumbai"
      };
      setSuccess(`Authenticated as ${mockUser.role} (${mockUser.name})! Redirecting...`);
      setTimeout(() => {
        onLoginSuccess(mockUser);
        onClose();
      }, 800);
      setLoading(false);
      return;
    }

    const autoPassword = getOrCreateAutoPassword(demoEmail);

    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: autoPassword
      });

      if (!signInErr && signInData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", signInData.user.id)
          .single();

        const finalUser = profile || {
          id: signInData.user.id,
          name: matchedDemo.name,
          email: demoEmail,
          role: defaultRole,
          city: "Mumbai"
        };

        setSuccess(`Successfully logged in as ${finalUser.role || "Buyer"}!`);
        setTimeout(() => {
          onLoginSuccess(finalUser);
          onClose();
        }, 800);
        return;
      }

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: demoEmail,
        password: autoPassword,
        options: {
          data: {
            name: matchedDemo.name,
            role: defaultRole,
            city: "Mumbai"
          }
        }
      });

      // A real Supabase user must exist before we sign anyone in. If sign-in
      // failed and sign-up returned no user (e.g. "Confirm email" is enabled
      // in Supabase Auth settings, so the account isn't active until the link
      // is clicked), report it honestly instead of minting a fake local user.
      if (!signUpData?.user) {
        const hint =
          (signUpErr?.message || "").toLowerCase().includes("already") ||
          (signUpErr?.message || "").toLowerCase().includes("registered")
            ? " It looks like this demo account already exists — try the sign-in tab instead."
            : " Please make sure 'Confirm email' is turned OFF in Supabase Auth settings, or sign in with your existing account.";
        setError((signUpErr?.message || "Demo sign-up did not return a user.") + hint);
        return;
      }

      const userObj = {
        id: signUpData.user.id,
        name: matchedDemo.name,
        email: demoEmail,
        role: defaultRole,
        city: "Mumbai"
      };

      setSuccess(`Authenticated as ${userObj.role} (${userObj.name})! Welcome...`);
      setTimeout(() => {
        onLoginSuccess(userObj);
        onClose();
      }, 800);
    } catch (err: any) {
      // Never fabricate a login: a thrown error means the backend could not
      // authenticate us, so surface it instead of minting a fake user.
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth sign-in (real Supabase only — the mock client has no OAuth).
  const handleGoogleLogin = async () => {
    setError("");
    setSuccess("");
    if (!isRealSupabase) {
      setError("Google sign-in is only available when connected to real Supabase. Use the demo accounts instead.");
      return;
    }
    setLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/role_dashboards` : undefined
        }
      });
      if (oauthErr) {
        setError(oauthErr.message || "Google sign-in failed. Is the Google provider enabled in Supabase Auth?");
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
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
      if (!loginEmail.trim() || !loginPassword) {
        setError("Please enter your email and password.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword
        });

        if (signInErr) {
          setError(signInErr.message || "Invalid email or password.");
          setLoading(false);
          return;
        }
        if (!data?.user) {
          setError("No account found for this email. Contact the administrator.");
          setLoading(false);
          return;
        }

        let profile: any = null;
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();
          profile = profileData || null;
        } catch (e) {}

        const resolvedUser = profile || {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User",
          email: data.user.email || loginEmail.trim(),
          role: (data.user.user_metadata?.role as UserRole) || "Buyer",
          city: data.user.user_metadata?.city || "Mumbai",
          mobile: data.user.user_metadata?.mobile || ""
        };

        setSuccess(`Welcome back, ${resolvedUser.name}!`);
        setTimeout(() => {
          onLoginSuccess(resolvedUser);
          onClose();
        }, 700);
      } catch (err: any) {
        setError(err.message || "Failed to sign in. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    } else if (mode === "register") {
      if (!regName || !email || !regMobile) {
        setError("Please enter your Full Name, Mobile Number, and Email Address.");
        setLoading(false);
        return;
      }
      if (!visitingCardUrl) {
        setError("Please upload a photo of your Dealership Visiting Card.");
        setLoading(false);
        return;
      }
      if (!aadharCardUrl) {
        setError("Please upload a photo of your Aadhar Card for identity verification.");
        setLoading(false);
        return;
      }

      const newDealerRecord = {
        id: "dealer-" + Date.now(),
        name: regName,
        dealership_name: dealershipName || `${regName} Motors`,
        email: email.trim(),
        mobile: regMobile,
        city: regCity,
        role: "Dealer" as UserRole,
        is_approved: false,
        status: "pending_approval",
        visiting_card_url: visitingCardUrl,
        aadhar_card_url: aadharCardUrl,
        created_at: new Date().toISOString()
      };

      // Save dealer record in localStorage list for Admin CMS
      try {
        const existingDealers = JSON.parse(localStorage.getItem("1stcars_cms_dealers") || "[]");
        const updatedDealers = [newDealerRecord, ...existingDealers];
        localStorage.setItem("1stcars_cms_dealers", JSON.stringify(updatedDealers));
      } catch (e) {}

      if (isRealSupabase) {
        // Real Supabase: create an actual auth account (role Dealer, pending
        // approval) so the dealer can sign in after admin approval. A random
        // per-device password is used and a password-reset email is sent so the
        // dealer controls their own credentials.
        try {
          const dealerEmail = email.trim().toLowerCase();
          const dealerPassword = getOrCreateAutoPassword(dealerEmail);
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: dealerEmail,
            password: dealerPassword,
            options: {
              data: {
                name: regName,
                role: "Dealer",
                mobile: regMobile,
                city: regCity,
                dealership_name: dealershipName || `${regName} Motors`
              }
            }
          });
          if (signUpErr) throw signUpErr;
          if (!signUpData?.user) {
            setError("Account creation did not complete. If you already have an account for this email, please sign in instead.");
            return;
          }

          // Persist the KYC application so the Admin review queue can approve
          // the account against the uploaded documents.
          try {
            await supabase.from("dealer_applications").insert({
              user_id: signUpData.user.id,
              name: regName,
              dealership_name: dealershipName || `${regName} Motors`,
              email: dealerEmail,
              mobile: regMobile,
              city: regCity,
              status: "pending_approval",
              visiting_card_url: visitingCardUrl,
              aadhar_card_url: aadharCardUrl
            });
          } catch (appErr) {
            console.error("Failed to persist dealer application:", appErr);
          }

          // Give the dealer a way to set their own password.
          try {
            await supabase.auth.resetPasswordForEmail(dealerEmail);
          } catch (resetErr) {
            console.error("Failed to send password reset email:", resetErr);
          }

          // Do NOT keep the dealer signed in: the account must stay locked out
          // of the dealer dashboard until the Admin approves the application.
          // With "Confirm email" OFF, signUp already created a session, so sign
          // it out again here.
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            console.error("Failed to sign out pending dealer:", signOutErr);
          }

          setSuccess(`Dealer registration submitted for ${regName}! Admin will review your documents. Check ${dealerEmail} for a password-setup link — once approved you can sign in to participate in live auctions.`);
          toast.success("Dealer profile submitted to Admin for review!");
          setLoading(false);
          setRegName("");
          setRegMobile("");
          setEmail("");
          setDealershipName("");
          setVisitingCardUrl("");
          setAadharCardUrl("");
          return;
        } catch (err: any) {
          setError(err?.message || "Dealer registration failed. Please try again.");
          return;
        }
      }

      // KYC documents (Visiting Card / Aadhar) are intentionally NOT written to
      // the public `profiles` table — that table carries no KYC columns and is
      // world-readable (Public Read Profiles policy). They live only in the
      // Admin review queue (localStorage "1stcars_cms_dealers") until approved.

      setSuccess(`Dealer registration submitted for ${regName}! Your profile, Visiting Card, and Aadhar Card have been sent to Admin for review. Once approved, you can log in to participate in live auctions.`);
      toast.success("Dealer profile submitted to Admin for review!");

      // Reset form fields
      setRegName("");
      setRegMobile("");
      setEmail("");
      setDealershipName("");
      setVisitingCardUrl("");
      setAadharCardUrl("");

      setTimeout(() => {
        setLoading(false);
      }, 2000);
      return;
    } else {
      // Forgot Password flow — send a real reset email via Supabase Auth.
      if (!email.trim() || !email.includes("@")) {
        setError("Please enter a valid email address.");
        setLoading(false);
        return;
      }
      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (resetErr) {
          setError(resetErr.message || "Failed to send reset link.");
          setLoading(false);
          return;
        }
        setSuccess("Reset link sent successfully to " + email.trim());
        setEmail("");
      } catch (err: any) {
        setError(err.message || "Failed to send reset link.");
      } finally {
        setLoading(false);
      }
    }
  };

  const demoAccounts = [
    { label: "Buyer", email: "buyer@1stcars.com", name: "Rahul" },
    { label: "Seller", email: "seller@1stcars.com", name: "Amit" },
    { label: "Dealer", email: "dealer@1stcars.com", name: "Elite Motors" },
    { label: "Inspector", email: "inspector@1stcars.com", name: "Vikram" },
    { label: "Sales Assoc.", email: "sales@1stcars.com", name: "Sneha" }
  ];

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >

      {/* Modal Box */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 flex flex-col my-auto max-h-[90vh] relative overflow-hidden text-left">
        
        {/* Permanent Sticky Top Header with Always-Visible Close Button */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <a href="/" className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#2E7D32] rounded flex items-center justify-center shadow-md shadow-[#2E7D32]/20">
              <div className="w-3 h-3 border-2 border-white rotate-45"></div>
            </div>
            <span className="text-lg font-black tracking-tighter text-[#2E7D32]">1stCars Gateway</span>
          </a>
          
          <button 
            onClick={onClose}
            type="button"
            title="Close window (Esc)"
            className="p-2 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-6 overflow-y-auto space-y-5">

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Reset Password"}
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {mode === "login" 
                ? "Sign in securely with your Google account." 
                : mode === "register" 
                ? "Join as an Elite customer, dealer, or system representative." 
                : "Provide your email to receive standard reset parameters."}
            </p>
          </div>

        {/* Error and Success Indicators */}
        {!isRealSupabase && (
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
                  {!isProdBuild && (
                    <>
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
                    </>
                  )}
                  {isProdBuild && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      Production builds cannot fall back to the local mock database. Set the Supabase
                      environment variables and redeploy.
                    </p>
                  )}
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
                    placeholder="e.g. Rajesh Shah"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational City *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <select
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full h-11 border border-slate-200 rounded-xl pl-10 pr-4 bg-white text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-[#2E7D32] outline-none cursor-pointer"
                    >
                      <option value="Surat" className="bg-white text-slate-900">Surat</option>
                      <option value="Bharuch" className="bg-white text-slate-900">Bharuch</option>
                      <option value="Vadodara" className="bg-white text-slate-900">Vadodara</option>
                      <option value="Vapi" className="bg-white text-slate-900">Vapi</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dealership / Firm Name</label>
                <div className="relative">
                  <Award className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Royal Auto Cars Dealership"
                    value={dealershipName}
                    onChange={(e) => setDealershipName(e.target.value)}
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Photo Uploads: Visiting Card Photo & Aadhar Card Photo */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <p className="text-[10px] font-black text-[#2E7D32] uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Identity & Verification Documents
                </p>

                {/* 1. Visiting Card Photo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Visiting Card Photo *</label>
                  {visitingCardUrl ? (
                    <div className="relative h-24 w-full rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={visitingCardUrl} alt="Visiting Card" className="h-20 w-28 object-cover rounded-lg border border-slate-200 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-emerald-900">Visiting Card Attached</p>
                          <p className="text-[10px] text-emerald-700 font-medium">Ready for Admin review</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVisitingCardUrl("")}
                        className="px-2.5 py-1 text-[10px] font-black text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-[#2E7D32] bg-slate-50 hover:bg-[#2E7D32]/5 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Visiting Card Photo</span>
                      <span className="text-[9px] text-slate-400 font-semibold">JPG, PNG or WEBP (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleDealerPhotoUpload(e, "visiting")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 2. Aadhar Card Photo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Aadhar Card Photo *</label>
                  {aadharCardUrl ? (
                    <div className="relative h-24 w-full rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={aadharCardUrl} alt="Aadhar Card" className="h-20 w-28 object-cover rounded-lg border border-slate-200 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-emerald-900">Aadhar Card Attached</p>
                          <p className="text-[10px] text-emerald-700 font-medium">Identity verified for review</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAadharCardUrl("")}
                        className="px-2.5 py-1 text-[10px] font-black text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-[#2E7D32] bg-slate-50 hover:bg-[#2E7D32]/5 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Aadhar Card Photo</span>
                      <span className="text-[9px] text-slate-400 font-semibold">JPG, PNG or WEBP (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleDealerPhotoUpload(e, "aadhar")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 font-semibold flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-[#2E7D32] shrink-0 mt-0.5" />
                <span>
                  Admin will review your profile, Visiting Card, and Aadhar Card. Once approved, you can log in to participate in live vehicle auctions.
                </span>
              </div>
            </>
          )}

          {mode === "login" ? (
            <div className="space-y-3">
              {!isRealSupabase && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Demo Accounts</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {demoAccounts.map((d) => (
                      <button
                        key={d.email}
                        type="button"
                        onClick={() => handleDemoLogin(d.email)}
                        disabled={loading}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-left transition-all cursor-pointer disabled:opacity-60"
                      >
                        <span className="block text-[10px] font-black text-[#2E7D32] uppercase tracking-wider">{d.label}</span>
                        <span className="block text-[9px] text-slate-500 font-semibold break-all">{d.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2.5 text-xs font-black text-slate-700 transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"/>
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 pt-1">
                  <span className="flex-1 h-px bg-slate-200" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">or use email</span>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="e.g. you@company.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setError("");
                    }}
                    required
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>

                <div className="pt-1.5 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setError("");
                      }}
                      required
                      className="h-11 pl-10 rounded-xl"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold">B2B dealers, staff & administrators sign in with their registered email and password.</p>
                </div>
              </div>
            </div>
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
                ? "Processing Application..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "register"
                    ? "Submit Dealer Application for Admin Review"
                    : "Send Reset Instructions"}
            </Button>
          </div>
        </form>

        {/* Footer toggle switcher */}
        <div className="text-center pt-2 text-xs font-semibold text-slate-400">
          {mode === "login" ? (
            <p>
              Are you an official car dealer?{" "}
              <button 
                onClick={() => setMode("register")}
                className="text-[#2E7D32] font-black hover:underline cursor-pointer"
              >
                Register as Partnered Dealer
              </button>
            </p>
          ) : (
            <p>
              Already registered dealer?{" "}
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
    </div>
  );
}
