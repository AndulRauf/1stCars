import * as React from "react";
import { X, Calendar, Clock, MapPin, Check, Phone, Mail, ShieldCheck, Car as CarIcon, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { Car } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase, isRealSupabase, friendlyOAuthErrorMessage } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { automationService } from "@/src/lib/automation";
import { getOrCreateAutoPassword, resolveAutoSignIn } from "@/src/lib/autoAuth";
import { trackMetaEvent } from "@/src/lib/metaPixel";
import { resolveLeadOwner, insertLeadWithAssignment } from "@/src/lib/leadAssignment";

// Official multi-color Google "G" logo (lucide has no brand icons).
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.3C41.5 36.3 44 31.2 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  car?: Car | null;
  initialType?: "test_drive" | "buy_now";
  selectedCity?: string;
  savedCars?: string[];
  onSaveToggle?: (id: string, model: string) => void;
  onNavigateToDashboard?: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  car,
  initialType = "test_drive",
  selectedCity = "Surat",
  savedCars,
  onSaveToggle,
  onNavigateToDashboard
}: BookingModalProps) {
  const [bookingType, setBookingType] = React.useState<"test_drive" | "buy_now">(initialType);
  
  // Form fields
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [city, setCity] = React.useState(selectedCity || "Surat");
  const [preferredDate, setPreferredDate] = React.useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [preferredTime, setPreferredTime] = React.useState("11:00 AM - 01:00 PM");
  const [notes, setNotes] = React.useState("");

  // OTP state
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [generatedOtp, setGeneratedOtp] = React.useState("");
  const [enteredOtp, setEnteredOtp] = React.useState("");
  const [isOtpVerified, setIsOtpVerified] = React.useState(false);
  const [otpCountdown, setOtpCountdown] = React.useState(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [leadRefId, setLeadRefId] = React.useState("");


  // Reset state on open/close or initialType change
  React.useEffect(() => {
    if (isOpen) {
      setBookingType(initialType);
      setIsSubmitted(false);
      setIsOtpVerified(false);
      setIsOtpSent(false);
      setEnteredOtp("");
      setCity(selectedCity || car?.cities?.[0] || car?.location || "Surat");
    }
  }, [isOpen, initialType, car, selectedCity]);

  // Auto-fill the buyer's Full Name & Email from an active Google / Supabase
  // session so the user never has to type them. Covers both cases:
  //  1. Already signed in (session restored via getSession on open).
  //  2. Just returned from the Google OAuth redirect (SIGNED_IN fires and the
  //     fields update live while the modal re-opens).
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const applySessionUser = (sessionUser: any) => {
      if (!sessionUser?.email || cancelled) return;
      const meta = sessionUser.user_metadata || {};
      const metaName = meta.name || meta.full_name || meta.given_name;
      const fallbackName = sessionUser.name || sessionUser.email.split("@")[0] || "";
      const autoName = metaName || fallbackName;
      // Only fill empty fields so hand-typed values are never overwritten.
      setName((prev) => prev || autoName);
      setEmail(sessionUser.email);
    };

    supabase.auth
      .getSession()
      .then(({ data }: any) => applySessionUser(data?.session?.user))
      .catch(() => {});

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      applySessionUser(session?.user);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [isOpen]);

  // Countdown timer for OTP
  React.useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Auto-redirect to the Buyer dashboard once the booking is submitted.
  React.useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        onClose();
        onNavigateToDashboard?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, onClose, onNavigateToDashboard]);

  if (!isOpen) return null;

  // Handle Send Mobile OTP — simulated OTP exists ONLY in mock/demo mode. On a
  // real backend the concierge verifies the number over the phone; the UI never
  // pretends a production SMS verification happened.
  const handleSendOtp = () => {
    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setIsOtpSent(true);
    setOtpCountdown(30);
    toast.success(`Verification OTP sent to +91 ${mobile}! Simulated OTP: ${code}`);
  };

  // Handle Verify OTP
  const handleVerifyOtp = () => {
    if (!enteredOtp) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }
    if (enteredOtp === generatedOtp) {
      setIsOtpVerified(true);
      toast.success("Mobile number verified successfully!");
    } else {
      toast.error("Invalid OTP code. Please try again or use auto-fill.");
    }
  };

  // Sign in with Google so Full Name & Email are pulled from the Google account
  // automatically. Uses the same Supabase OAuth redirect flow already used by
  // AuthModal, but returns to the same car page and re-opens the booking modal.
  const handleGoogleLogin = async () => {
    setSubmitError("");
    if (!isRealSupabase) {
      toast.error("Google sign-in is available with the live database. You can continue by typing your details above.");
      return;
    }
    setGoogleLoading(true);
    try {
      // Keep the buyer on this exact car page after Google redirects back and
      // flag the return so CarDetailsView re-opens the booking modal with the
      // auto-filled name & email ready to submit.
      const url = new URL(window.location.href);
      url.searchParams.set("open_booking", "1");
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: url.toString() },
      });
      if (oauthErr) {
        setGoogleLoading(false);
        toast.error(friendlyOAuthErrorMessage(oauthErr, "Google sign-in failed. Please try again."));
      }
    } catch (err: any) {
      setGoogleLoading(false);
      toast.error(friendlyOAuthErrorMessage(err, "Google sign-in failed. Please try again."));
    }
  };

  // Handle Final Booking Submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid Gmail / Email address.");
      return;
    }

    // Auto verify OTP if user hasn't manually clicked verify but filled
    // correctly. The simulated OTP gate only applies in mock/demo mode — real
    // bookings never fake a mobile verification.
    if (!isRealSupabase) {
      if (!isOtpVerified) {
        if (isOtpSent && enteredOtp === generatedOtp) {
          setIsOtpVerified(true);
        } else {
          toast.error("Please send & verify your Mobile OTP before submitting.");
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmitError("");
    const refId = `INQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setLeadRefId(refId);


    const vehicleTitle = car ? `${car.brand} ${car.model} (${car.year})` : "General Vehicle Inquiry";

    const leadRecord: Record<string, any> = {
      id: refId,
      created_at: new Date().toISOString(),
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      city: city || "Surat",
      vehicle: vehicleTitle,
      car_id: car?.id || null,
      car_brand: car?.brand || "1stCars",
      car_model: car?.model || "Selection",
      price: car?.price || 0,
      type: bookingType === "test_drive" ? "Test Drive Request" : "Buy Car / Reservation",
      preferred_date: preferredDate || new Date().toISOString().split("T")[0],
      preferred_time: preferredTime,
      status: "Pending",
      notes: notes.trim() || `Submitted via ${bookingType === "test_drive" ? "Priority Test Drive" : "Direct Purchase"} modal`
    };

    try {
      // 0. Auto-register / Log in as Buyer profile. The password is random per
      // device and stored locally — it can NEVER be derived from the email by
      // a third party (previous deterministic scheme removed).
      const userEmail = email.trim().toLowerCase();
      const userName = name.trim();
      const userMobile = mobile.trim();
      const userCity = city || "Surat";
      const autoPassword = getOrCreateAutoPassword(userEmail);

      // Automatically add vehicle to favorite/saved cars list
      if (car?.id) {
        const existingSaved = JSON.parse(localStorage.getItem("1stcars_saved_cars") || "[]");
        if (!existingSaved.includes(car.id)) {
          const updatedSaved = [car.id, ...existingSaved];
          localStorage.setItem("1stcars_saved_cars", JSON.stringify(updatedSaved));
        }
        if (onSaveToggle && !savedCars?.includes(car.id)) {
          onSaveToggle(car.id, car.model);
        }
      }

      // Add formatted test drive entry to 1stcars_test_drives for Buyer Dashboard
      const testDriveEntry = {
        id: refId,
        status: "Confirmed",
        car_title: vehicleTitle,
        car_id: car?.id || null,
        date: preferredDate,
        time: preferredTime,
        type: bookingType,
        buyer_name: userName,
        buyer_mobile: userMobile,
        created_at: new Date().toISOString()
      };
      const currentTDs = JSON.parse(localStorage.getItem("1stcars_test_drives") || "[]");
      localStorage.setItem("1stcars_test_drives", JSON.stringify([testDriveEntry, ...currentTDs]));

      // 2. Auto-assign the lead to the Sales Associate who uploaded this car
      //    (leads for admin-published/demo cars stay in the shared pool).
      const owner = await resolveLeadOwner(car);
      if (owner) {
        leadRecord.assigned_to = owner.id;
        leadRecord.assigned_to_name = owner.name || "";
      }

      // 3. Save to localStorage "1stcars_sales_leads" for Admin CMS Buyer
      //    Enquiries — persisted AFTER auto-assignment so the record carries
      //    the same owner as the Supabase row (mock-mode fallback source).
      const existingLeads = JSON.parse(localStorage.getItem("1stcars_sales_leads") || "[]");
      localStorage.setItem("1stcars_sales_leads", JSON.stringify([leadRecord, ...existingLeads]));

      // 4. Save to Supabase table sales_notifications (source of truth for Sales/Admin desk)
      const { error: insertError } = await insertLeadWithAssignment({
        name: name.trim(),
        mobile: mobile.trim(),
        city: city || "Surat",
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        car_id: car?.id,
        car_brand: car?.brand,
        car_model: car?.model,
        type: bookingType,
        status: "pending",
        assigned_to: owner?.id || null,
        assigned_to_name: owner?.name || null,
        notes: `Gmail: ${email.trim()} | Ref: ${refId} | ${notes.trim()}`
      });

      if (insertError) {
        // The lead did NOT reach the Sales desk — surface a real failure instead of a false success.
        throw new Error(insertError.message || "Could not save your request to the database.");
      }

      // Lead is persisted — show the confirmation immediately. Everything
      // below (auto sign-in, automation event, notifications) runs in the
      // background so the submit never blocks on extra network round-trips.
      setIsSubmitted(true);
      toast.success("Your inquiry is submitted! One of our team members will connect with you shortly.");

      trackMetaEvent(bookingType === "test_drive" ? "Lead" : "InitiateCheckout", {
        content_name: vehicleTitle,
        content_category: "Test Drive",
        value: car?.price || 0,
        currency: "INR",
        num_items: 1
      });

      void (async () => {
        try {
          // If this email already owns the active session (e.g. the buyer just
          // signed in with Google), skip the auto sign-up/sign-in below - the
          // account is already authenticated on this device and the random
          // fallback password would only fail.
          const { data: currentSession } = await supabase.auth.getSession();
          const activeEmail = currentSession?.session?.user?.email?.toLowerCase();

          if (activeEmail !== userEmail) {
            const { error: authError } = await resolveAutoSignIn(
              supabase,
              userEmail,
              autoPassword,
              {
                data: {
                  name: userName,
                  mobile: userMobile,
                  role: "Buyer",
                  city: userCity,
                },
              }
            );

            if (authError) {
              console.warn("Auto sign in error during booking:", authError);
            }
          }
        } catch (authErr) {
          console.warn("Auto sign in error during booking:", authErr);
        }

        // Record the automation event (idempotent; on the live DB the AFTER INSERT
        // trigger already recorded it, so the RPC is a no-op and only the local
        // engine consumes this for mock/pre-migration databases).
        void automationService.emitEvent({
          type: "lead.created",
          sourceTable: "sales_notifications",
          sourceId: refId,
          payload: {
            lead_id: refId,
            name: name.trim(),
            mobile: mobile.trim(),
            city: city || "Surat",
            type: bookingType,
            car_brand: car?.brand,
            car_model: car?.model,
            preferred_date: preferredDate,
            preferred_time: preferredTime
          }
        }).catch((err) => console.warn("Automation event emission failed:", err));

        // Trigger system notifications
        try {
          if (bookingType === "test_drive") {
            await notificationService.triggerTestDriveBooked({
              buyerName: name.trim(),
              carTitle: vehicleTitle,
              preferredDate: preferredDate,
              preferredTime: preferredTime
            });
          } else {
            await notificationService.triggerCarReserved({
              buyerName: name.trim(),
              carTitle: vehicleTitle,
              price: car?.price || 0
            });
          }
        } catch (notifErr) {
          console.warn("Background booking notification failed:", notifErr);
        }
      })();
    } catch (err) {
      console.error("Booking submission error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong while submitting your request.";
      setSubmitError(message);
      toast.error(`Could not submit your inquiry: ${message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }

  };

  const formattedPrice = car ? new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(car.price) : "";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative border border-slate-100 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Modal Close X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {isSubmitted ? (
          /* ================= SUCCESS CONFIRMATION STATE ================= */
          <div className="py-4 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-[#2E7D32] rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-[#2E7D32] border border-emerald-200 rounded-full inline-block">
                Inquiry Ref #{leadRefId}
              </span>

              {/* Exact user notification text requirement */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug px-2">
                "Your inquiry is submitted, one of our team members will connect with you shortly"
              </h3>
              
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Our certified 1stCars concierge team in <strong className="text-slate-800">{city}</strong> has received your request and will reach out via phone & email.
              </p>
            </div>

            {/* Summary Ticket Card */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-slate-200/80 text-left space-y-2.5 text-xs font-bold text-slate-700">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                <span className="text-slate-400 font-black uppercase text-[10px]">Buyer Account Status</span>
                <span className="text-emerald-700 font-black uppercase bg-emerald-100/70 px-2 py-0.5 rounded-md text-[10px]">
                  ✓ Logged in as Buyer ({name})
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                <span className="text-slate-400 font-black uppercase text-[10px]">Service Type</span>
                <span className="text-[#2E7D32] font-black uppercase">
                  {bookingType === "test_drive" ? "🚘 Priority Test Drive" : "💎 Vehicle Acquisition / Buy"}
                </span>
              </div>
              {car && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                  <span className="text-slate-400 font-black uppercase text-[10px]">Vehicle Saved to Favorites</span>
                  <span className="text-slate-900 font-black">{car.brand} {car.model} ({car.year}) ❤️</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                <span className="text-slate-400 font-black uppercase text-[10px]">
                  {isOtpVerified ? "Verified Phone" : "Contact Number"}
                </span>
                <span className="text-slate-900 font-black">
                  +91 {mobile}
                  {isOtpVerified && <span className="text-emerald-600 font-normal"> ✓</span>}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                <span className="text-slate-400 font-black uppercase text-[10px]">Gmail / Email</span>
                <span className="text-slate-900 font-black">{email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-black uppercase text-[10px]">Schedule Slot</span>
                <span className="text-slate-900 font-black">{preferredDate} ({preferredTime})</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateToDashboard) {
                    onNavigateToDashboard();
                  }
                }}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-wider h-12 rounded-xl cursor-pointer shadow-md shadow-[#2E7D32]/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Go to Buyer Menu & Favorite Cars
              </Button>
              <p className="text-[10px] text-slate-400 font-bold text-center">
                Redirecting you to your Buyer Dashboard in a moment…
              </p>
            </div>
          </div>
        ) : (
          /* ================= BOOKING FORM STATE ================= */
          <form onSubmit={handleSubmitBooking} className="space-y-4">
            
            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32]">
                <CarIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  {bookingType === "test_drive" ? "Book Test Drive" : "Acquire Vehicle (Reserve Now)"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  1stCars Concierge Doorstep & Showroom Experience
                </p>
              </div>
            </div>

            {/* Car Preview Card (if car object is present) */}
            {car && (
              <div className="p-3 bg-[#FFFDF7] rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                    {car.image_url ? (
                      <img src={car.image_url} alt={car.model} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <CarIcon className="h-6 w-6 text-emerald-400" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">{car.brand}</p>
                    <p className="font-extrabold text-xs text-slate-900 truncate">{car.model} ({car.year})</p>
                    <p className="text-[10px] text-slate-500 font-bold">{car.fuel} • {((car as any).km_driven || car.mileage)?.toLocaleString()} km</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-black text-sm text-[#2E7D32]">{formattedPrice}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Certified Stock</span>
                </div>
              </div>
            )}

            {/* Header: Test Drive only */}
            <div className="flex items-center gap-2 bg-[#2E7D32]/10 border border-[#2E7D32]/20 px-4 py-2.5 rounded-2xl">
              <Calendar className="h-4 w-4 text-[#2E7D32]" />
              <span className="text-xs font-black text-[#2E7D32] uppercase tracking-wider">Book Test Drive</span>
            </div>


            {/* Sign in with Google - pulls Full Name & Email from the account */}
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || isSubmitting}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-extrabold h-11 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2.5"
              >
                <GoogleG className="h-4 w-4 shrink-0" />
                {googleLoading ? "Connecting to Google..." : "Sign in with Google & Auto-fill Details"}
              </Button>
              <div className="flex items-center gap-2">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">or fill the form manually</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>

            {/* Input 1: Buyer Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Full Name *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your complete full name"
                required
                className="h-10 text-xs font-bold rounded-xl"
              />
            </div>

            {/* Input 2: Mobile Number & OTP Verification */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone className="h-3 w-3 text-[#2E7D32]" /> Mobile Number *
                </label>
                {isOtpVerified && (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">+91</span>
                  <Input
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setIsOtpVerified(false);
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

              {/* Simulated OTP Input (mock/demo mode only) */}
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

              {/* Real mode: number is verified by the concierge on the call —
                  the UI must not pretend an SMS verification happened. */}
              {isRealSupabase && (
                <p className="text-[10px] text-slate-400 font-semibold pt-0.5">
                  Our concierge will verify this number when they call you to confirm your slot.
                </p>
              )}
            </div>

            {/* Input 3: Gmail / Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Mail className="h-3 w-3 text-[#2E7D32]" /> Email Address *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. buyer@gmail.com"
                required
                className="h-10 text-xs font-bold rounded-xl"
              />
            </div>

            {/* City & Preferred Date/Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#2E7D32]" /> City Location
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32]"
                >
                  <option value="Surat">Surat (Main Hub)</option>
                  <option value="Bharuch">Bharuch</option>
                  <option value="Vadodara">Vadodara</option>
                  <option value="Vapi">Vapi</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Rajkot">Rajkot</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#2E7D32]" /> Preferred Date
                </label>
                <Input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Preferred Time Slot */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#2E7D32]" /> Preferred Time Slot
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32]"
              >
                <option value="10:00 AM - 12:00 PM">Morning (10:00 AM - 12:00 PM)</option>
                <option value="11:00 AM - 01:00 PM">Mid-day (11:00 AM - 01:00 PM)</option>
                <option value="02:00 PM - 04:00 PM">Afternoon (02:00 PM - 04:00 PM)</option>
                <option value="05:00 PM - 07:00 PM">Evening (05:00 PM - 07:00 PM)</option>
              </select>
            </div>

            {/* Inline error banner — shows real failure instead of a false success */}
            {submitError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2.5 text-xs font-bold animate-in fade-in duration-200">
                <X className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Submission failed: {submitError}. Please check your details and try again.</span>
              </div>
            )}

            {/* Submit CTA Button */}
            <Button
              type="submit"
              disabled={isSubmitting}

              className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs uppercase tracking-wider h-12 rounded-xl cursor-pointer shadow-md shadow-[#2E7D32]/20 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <span>Submitting Inquiry...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Inquiry</span>
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
              <span>1stCars Privacy Secured • No Spam Promise</span>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
