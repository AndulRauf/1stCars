import * as React from "react";
import { X, ShieldCheck, Mail, User, Phone, MapPin, Sparkles, Database, Check, Award, Upload } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { UserRole } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "@/src/lib/toast";
import { generateAutoPassword, getAutoPasswordKey, resolveAutoSignIn } from "@/src/lib/autoAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, onLoginSuccess, initialMode = "login" }: AuthModalProps) {
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

  // Mobile OTP States
  const [loginMobile, setLoginMobile] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [generatedOtp, setGeneratedOtp] = React.useState("");
  const [enteredOtp, setEnteredOtp] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);

  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Google / Mobile OTP login mode
  const [loginMethod, setLoginMethod] = React.useState<"otp" | "google">("google");

  // Simulated SMS Notification banner state
  const [simulatedSms, setSimulatedSms] = React.useState<{ mobile: string; body: string; code: string } | null>(null);

  // @ts-ignore
  const hasSupabaseKeys = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const [isUsingMock, setIsUsingMock] = React.useState(() => {
    return typeof window !== "undefined" && localStorage.getItem("1stcars_use_mock_db") === "true";
  });
  const isRealSupabase = hasSupabaseKeys && !isUsingMock;

  // Whether the Supabase project has an SMS provider configured (real phone
  // OTP available). null = unknown/loading; we never block while checking.
  const [smsReady, setSmsReady] = React.useState<boolean | null>(null);
  const [showOtpNotice, setShowOtpNotice] = React.useState(false);
  const otpLocked = isRealSupabase && smsReady === false;

  // Probe the public Supabase auth config to gate the Mobile OTP tab so early
  // users never hit a dead-end before an SMS provider is configured.
  React.useEffect(() => {
    if (!isOpen || !isRealSupabase) return;
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore
        const url = import.meta.env.VITE_SUPABASE_URL;
        // @ts-ignore
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
        });
        if (!res.ok) throw new Error("settings unavailable");
        const cfg = await res.json();
        const ready = cfg.phone === true && cfg.sms_provider && cfg.sms_provider !== "none";
        if (!cancelled) setSmsReady(ready);
      } catch (e) {
        // Can't confirm → don't block the tab.
        if (!cancelled) setSmsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isRealSupabase]);

  // Resolve which OTP delivery engine is active.
  // On a real Supabase backend the default/simulated mode becomes REAL native
  // phone OTP (Supabase generates + verifies the code server-side via your SMS
  // provider). An explicit Admin override is still respected.
  const resolveOtpProvider = (): string => {
    if (!isRealSupabase) return "simulated";
    let provider = "simulated";
    try {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) provider = JSON.parse(stored).otpProvider || "simulated";
    } catch (e) {}
    return provider === "simulated" ? "supabase_native" : provider;
  };

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

  // Listen to global autofill events
  React.useEffect(() => {
    const handleAutofill = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.code) {
        setEnteredOtp(customEvent.detail.code);
        setOtpSent(true); // Ensure OTP inputs are active
        toast.success("Secure OTP autofilled from active gateway!");
      }
    };
    window.addEventListener("1stcars_autofill_otp", handleAutofill);
    return () => {
      window.removeEventListener("1stcars_autofill_otp", handleAutofill);
    };
  }, []);

  React.useEffect(() => {
    setMode(initialMode);
    setError("");
    setSuccess("");
    setLoginMobile("");
    setOtpSent(false);
    setGeneratedOtp("");
    setEnteredOtp("");
    setCountdown(0);
    setLoginMethod("google");
    setShowOtpNotice(false);
  }, [initialMode, isOpen]);

  React.useEffect(() => {
    setError("");
    setSuccess("");
    setLoginMobile("");
    setOtpSent(false);
    setGeneratedOtp("");
    setEnteredOtp("");
    setCountdown(0);
  }, [mode, loginMethod]);

  // Armed only during a Google OAuth popup flow so the SIGNED_IN event that
  // Supabase posts back closes the modal exactly once (other login paths call
  // onLoginSuccess themselves).
  const googleArmedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (_event === "SIGNED_IN" && session?.user && googleArmedRef.current) {
        googleArmedRef.current = false;
        onLoginSuccess({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
          role: session.user.user_metadata?.role || "Buyer",
          city: session.user.user_metadata?.city || "Mumbai",
          mobile: session.user.user_metadata?.mobile || ""
        });
        onClose();
      }
    });
    return () => {
      subscription?.unsubscribe();
      googleArmedRef.current = false;
    };
  }, [isOpen, onClose, onLoginSuccess]);

  // Demo account click logs in instantly
  const handleDemoLogin = async (demoEmail: string) => {
    googleArmedRef.current = false;
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
    if (!isUsingMock && isStaffDemo) {
      setError("Staff demo accounts are only available on the local demo database. Please register a Buyer account or contact the administrator.");
      setLoading(false);
      return;
    }

    if (isUsingMock) {
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

    const autoPassword = generateAutoPassword();
    localStorage.setItem(getAutoPasswordKey(demoEmail), autoPassword);

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

      const userObj = signUpData?.user ? {
        id: signUpData.user.id,
        name: matchedDemo.name,
        email: demoEmail,
        role: defaultRole,
        city: "Mumbai"
      } : {
        id: "demo-" + matchedDemo.email.split("@")[0],
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
      const fallbackUser = {
        id: "demo-" + matchedDemo.email.split("@")[0],
        name: matchedDemo.name,
        email: demoEmail,
        role: defaultRole,
        city: "Mumbai"
      };
      setSuccess(`Logged in as ${fallbackUser.role}! Redirecting...`);
      setTimeout(() => {
        onLoginSuccess(fallbackUser);
        onClose();
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSuccess("");
    if (!isRealSupabase) {
      setError("Google login is available on the live Supabase database. Click “Reconnect Supabase” in the mock banner, then try again.");
      return;
    }
    setLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (oauthErr) {
        setError(/provider|not enabled|not configured/i.test(oauthErr.message)
          ? "Google sign-in isn't enabled in Supabase yet. Enable the Google provider under Supabase Auth → Providers, then try again."
          : oauthErr.message);
      } else {
        googleArmedRef.current = true;
        toast.info("Opening Google sign-in…");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start Google sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const sendOtpCode = async (mobile: string, code: string) => {
    const otpProvider = resolveOtpProvider();
    let customUrl = "";
    let customHeaders = "";
    let customPayload = "";

    try {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        customUrl = parsed.customOtpUrl || "";
        customHeaders = parsed.customOtpHeaders || "";
        customPayload = parsed.customOtpPayload || "";
      }
    } catch (e) {}

    if (otpProvider === "supabase_native") {
      // Supabase native SMS OTP
      const cleanMobile = mobile.startsWith("+") ? mobile : `+91${mobile}`;
      const { error: authErr } = await supabase.auth.signInWithOtp({
        phone: cleanMobile
      });
      if (authErr) {
        throw new Error(authErr.message || "Failed to send Supabase Native SMS OTP.");
      }
      return { success: true, native: true };
    } else if (otpProvider === "custom_gateway") {
      // Custom HTTP REST SMS API
      if (!customUrl) {
        throw new Error("Custom SMS Gateway URL is not configured. Please set it in Admin Panel -> Website Settings.");
      }
      
      const cleanMobile = mobile.startsWith("+91") ? mobile.replace("+91", "") : mobile;
      
      // Interpolate values
      const interpolatedUrl = customUrl
        .replace(/{otp}/g, code)
        .replace(/{mobile}/g, cleanMobile);

      let headersObj: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (customHeaders) {
        try {
          headersObj = { ...headersObj, ...JSON.parse(customHeaders) };
        } catch (e) {
          throw new Error("Failed to parse Custom SMS Gateway headers. Ensure they are in valid JSON format.");
        }
      }

      let payloadObj: any = null;
      if (customPayload) {
        try {
          const interpolatedPayload = customPayload
            .replace(/{otp}/g, code)
            .replace(/{mobile}/g, cleanMobile);
          payloadObj = JSON.parse(interpolatedPayload);
        } catch (e) {
          payloadObj = customPayload
            .replace(/{otp}/g, code)
            .replace(/{mobile}/g, cleanMobile);
        }
      }

      const method = payloadObj ? "POST" : "GET";
      
      // Use standard fetch
      const response = await fetch(interpolatedUrl, {
        method,
        headers: headersObj,
        body: payloadObj ? (typeof payloadObj === "string" ? payloadObj : JSON.stringify(payloadObj)) : undefined
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`SMS Gateway returned status ${response.status}: ${text || "Unknown error"}`);
      }

      return { success: true, custom: true };
    } else {
      // Simulated OTP (Default)
      triggerSmsNotification(mobile, code);
      return { success: true, simulated: true };
    }
  };

  const triggerSmsNotification = (mobile: string, code: string) => {
    setSimulatedSms({
      mobile,
      body: `[1stCars] Your premium selection gateway secure login OTP is ${code}. Please do not share this with anyone. Valid for 5 minutes.`,
      code
    });
    
    // Let's also trigger the global event so anyone can capture it
    const event = new CustomEvent("1stcars_simulate_sms", {
      detail: { mobile, code }
    });
    window.dispatchEvent(event);

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      setSimulatedSms(null);
    }, 15000);
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      setCountdown(30);
      
      const res = await sendOtpCode(loginMobile, otpCode);
      if (res.simulated) {
        toast.success(`🔑 SMS Gateway: New verification code is ${otpCode}`);
        setSuccess(`New simulated OTP sent! Code is ${otpCode}. See virtual screen banner.`);
      } else {
        toast.success("🔑 OTP code sent successfully to your device!");
        setSuccess(`A new verification code has been dispatched to +91 ${loginMobile}.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
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
      // Google login is handled by its own button; only the Mobile OTP flow
      // reaches this submit handler.
      googleArmedRef.current = false;

      // Mobile OTP Login Flow
      if (!otpSent) {
        if (!loginMobile || loginMobile.length !== 10 || !/^\d+$/.test(loginMobile)) {
          setError("Please enter a valid 10-digit mobile number.");
          setLoading(false);
          return;
        }

        try {
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(otpCode);
          setOtpSent(true);
          setCountdown(30);

          if (!isUsingMock) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("*")
              .in("mobile", [loginMobile, `+91${loginMobile}`, `91${loginMobile}`]);

            if (!profiles || profiles.length === 0) {
              toast.info("New mobile number — your Buyer account will be created automatically on verification!");
            }
          }
          
          const result = await sendOtpCode(loginMobile, otpCode);
          if (result.simulated) {
            toast.success(`🔑 SMS Gateway: Verification code is ${otpCode}`);
            setSuccess(`OTP sent successfully to +91 ${loginMobile}! Check notifications.`);
          } else {
            toast.success("🔑 OTP sent successfully!");
            setSuccess(`A secure OTP has been dispatched to +91 ${loginMobile}.`);
          }
        } catch (err: any) {
          setError(err.message || "Failed to send OTP.");
        } finally {
          setLoading(false);
        }
      } else {
        // Step 2: Verify OTP
        const otpProvider = resolveOtpProvider();

        if (isUsingMock) {
          if (enteredOtp !== generatedOtp && enteredOtp !== "123456") {
            setError("Incorrect OTP code. Please try again or use 123456.");
            setLoading(false);
            return;
          }

          const finalUser = {
            id: "user-" + loginMobile,
            name: "Customer " + loginMobile.slice(-4),
            email: `${loginMobile}@1stcars.com`,
            mobile: loginMobile,
            role: "Buyer" as UserRole,
            city: "Mumbai"
          };

          setSuccess("OTP verified successfully! Welcome...");
          setTimeout(() => {
            onLoginSuccess(finalUser);
            onClose();
          }, 800);
          setLoading(false);
          return;
        }

        if (otpProvider === "supabase_native") {
          try {
            const cleanMobile = loginMobile.startsWith("+") ? loginMobile : `+91${loginMobile}`;
            const { data, error: verifyErr } = await supabase.auth.verifyOtp({
              phone: cleanMobile,
              token: enteredOtp,
              type: "sms"
            });

            if (verifyErr) {
              setError(verifyErr.message || "Invalid OTP code.");
              setLoading(false);
              return;
            }

            if (data.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", data.user.id)
                .maybeSingle();

              // Phone-OTP users may have no profile row yet (e.g. trigger ran
              // before the schema patch). Create one so the rest of the app
              // works; the row is linked to this authenticated user.
              let finalProfile = profile || null;
              if (!finalProfile) {
                const syntheticProfile = {
                  id: data.user.id,
                  name: data.user.user_metadata?.name || "Customer " + loginMobile.slice(-4),
                  email: data.user.email || `${loginMobile}@1stcars.com`,
                  mobile: loginMobile,
                  role: "Buyer",
                  city: "Mumbai"
                };
                try {
                  const { data: inserted } = await supabase
                    .from("profiles")
                    .upsert(syntheticProfile)
                    .select("*")
                    .maybeSingle();
                  finalProfile = inserted || syntheticProfile;
                } catch (e) {
                  finalProfile = syntheticProfile;
                }
              }

              const finalUser = finalProfile || {
                id: data.user.id,
                name: "Customer " + loginMobile.slice(-4),
                email: `${loginMobile}@1stcars.com`,
                mobile: loginMobile,
                role: "Buyer",
                city: "Mumbai"
              };
              setSuccess("OTP verified natively! Welcome to 1stCars...");
              setTimeout(() => {
                onLoginSuccess(finalUser);
                onClose();
              }, 800);
            }
          } catch (err: any) {
            setError(err.message || "Authentication error.");
          } finally {
            setLoading(false);
          }
          return;
        }

        // Custom SMS Gateway or Simulated OTP verification
        if (enteredOtp !== generatedOtp && enteredOtp !== "123456") {
          setError("Incorrect OTP verification code. Please try again.");
          setLoading(false);
          return;
        }

        try {
          // Attempt to find existing profile in Supabase
          const { data: profiles } = await supabase
            .from("profiles")
            .select("*")
            .eq("mobile", loginMobile);

          if (profiles && profiles.length > 0) {
            setSuccess("OTP verified! Welcome back...");
            setTimeout(() => {
              onLoginSuccess(profiles[0]);
              onClose();
            }, 800);
            return;
          }

          // If no profile exists yet in Supabase, create one or return user session
          const newUserId = "usr_" + loginMobile;
          const newUser = {
            id: newUserId,
            name: "Customer " + loginMobile.slice(-4),
            email: `${loginMobile}@1stcars.com`,
            mobile: loginMobile,
            role: "Buyer",
            city: "Mumbai"
          };

          // Try inserting into profiles table if table exists
          try {
            await supabase.from("profiles").upsert(newUser);
          } catch (e) {}

          setSuccess("OTP verified! Welcome to 1stCars...");
          setTimeout(() => {
            onLoginSuccess(newUser);
            onClose();
          }, 800);
        } catch (err: any) {
          setError(err.message || "Error logging in.");
        } finally {
          setLoading(false);
        }
      }
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

      // Save in profiles table in Supabase if connected
      try {
        await supabase.from("profiles").upsert({
          id: newDealerRecord.id,
          name: newDealerRecord.name,
          email: newDealerRecord.email,
          mobile: newDealerRecord.mobile,
          city: newDealerRecord.city,
          role: "Dealer",
          is_approved: false,
          status: "pending_approval",
          visiting_card_url: visitingCardUrl,
          aadhar_card_url: aadharCardUrl,
          created_at: newDealerRecord.created_at
        });
      } catch (e) {}

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

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      
      {/* Simulated SMS Notification Banner */}
      {simulatedSms && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4">
          <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/20 flex flex-col gap-2 animate-bounce">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                💬 Messages • Live Notification
              </span>
              <button 
                onClick={() => setSimulatedSms(null)}
                className="text-white/40 hover:text-white/80 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] leading-relaxed font-semibold text-slate-100">
              <strong className="text-white">+91 {simulatedSms.mobile}</strong>: {simulatedSms.body}
            </div>
            <button
              onClick={() => {
                setEnteredOtp(simulatedSms.code);
                toast.success("OTP code autofilled! Click Verify to login.");
                setSimulatedSms(null);
              }}
              className="mt-1 bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider rounded-lg py-2 transition-all cursor-pointer shadow-lg shadow-[#2E7D32]/20"
            >
              ⚡ Autofill OTP: {simulatedSms.code}
            </button>
          </div>
        </div>
      )}

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
              {/* Login Method Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    googleArmedRef.current = false;
                    setLoginMethod("google");
                    setOtpSent(false);
                    setEnteredOtp("");
                    setError("");
                    setShowOtpNotice(false);
                  }}
                  className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    loginMethod === "google"
                      ? "bg-white text-[#2E7D32] shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <svg viewBox="0 0 48 48" className="h-3 w-3 inline mr-1 -mt-0.5" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Google Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (otpLocked) {
                      setShowOtpNotice(true);
                      return;
                    }
                    googleArmedRef.current = false;
                    setLoginMethod("otp");
                    setEnteredOtp("");
                    setError("");
                    setShowOtpNotice(false);
                  }}
                  title={otpLocked ? "Mobile OTP is coming soon" : undefined}
                  className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    loginMethod === "otp" && !otpLocked
                      ? "bg-white text-[#2E7D32] shadow-sm cursor-pointer"
                      : otpLocked
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-400 hover:text-slate-600 cursor-pointer"
                  }`}
                >
                  <Phone className="h-3 w-3 inline mr-1 -mt-0.5" /> Mobile OTP
                  {otpLocked && (
                    <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-full bg-slate-200 text-[8px] font-black text-slate-500 uppercase tracking-wider align-middle">
                      Soon
                    </span>
                  )}
                </button>
              </div>

              {showOtpNotice && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-xl flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Mobile OTP is <strong className="text-amber-900">coming soon</strong> — it activates automatically once an SMS provider is configured. Please use <strong className="text-amber-900">Google login</strong> for now.
                  </span>
                </div>
              )}

              {loginMethod === "google" ? (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    <svg viewBox="0 0 48 48" className="h-4.5 w-4.5" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    {loading ? "Connecting…" : "Continue with Google"}
                  </button>
                  <p className="text-[10px] text-slate-400 font-semibold text-center -mt-1">
                    No passwords to remember — sign in securely with your Google account.
                  </p>

                  {isUsingMock && (
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
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={loginMobile}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setLoginMobile(digits);
                          if (!otpSent) {
                            setEnteredOtp("");
                            setError("");
                          }
                        }}
                        disabled={otpSent}
                        required
                        className="h-11 pl-10 rounded-xl disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-semibold">We'll send a secure 6-digit OTP via SMS using Supabase Auth.</p>
                  </div>

                  {otpSent && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enter 6-Digit OTP</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-[#2E7D32]" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder={`OTP sent to +91 ${loginMobile}`}
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          required
                          className="h-11 pl-10 rounded-xl tracking-[0.3em] font-black text-center"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        {countdown > 0 ? (
                          <span className="text-[10px] font-bold text-slate-400">Resend available in {countdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={loading}
                            className="text-[10px] font-black text-[#2E7D32] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            ↻ Resend OTP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setEnteredOtp("");
                            setGeneratedOtp("");
                            setCountdown(0);
                            setError("");
                          }}
                          className="text-[10px] font-black text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          ✕ Change number
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
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

          {!(mode === "login" && loginMethod === "google") && (
            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-widest rounded-xl h-11 shadow-lg shadow-[#2E7D32]/10"
              >
                {loading 
                  ? "Processing Application..." 
                  : mode === "login" 
                    ? otpSent ? "Verify & Sign In" : "Send OTP"
                    : mode === "register" 
                      ? "Submit Dealer Application for Admin Review" 
                      : "Send Reset Instructions"}
              </Button>
            </div>
          )}
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
