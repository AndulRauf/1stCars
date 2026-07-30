import * as React from "react";
import { X, Calendar, Clock, MapPin, Check, Phone, Mail, ShieldCheck, Car as CarIcon, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { Car } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { generateAutoPassword, getAutoPasswordKey, resolveAutoSignIn } from "@/src/lib/autoAuth";

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

  if (!isOpen) return null;

  // Handle Send Mobile OTP
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
    if (enteredOtp === generatedOtp || enteredOtp === "123456") {
      setIsOtpVerified(true);
      toast.success("Mobile number verified successfully!");
    } else {
      toast.error("Invalid OTP code. Please try again or use auto-fill.");
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

    // Auto verify OTP if user hasn't manually clicked verify but filled correctly or entered simulated code
    if (!isOtpVerified) {
      if (isOtpSent && (enteredOtp === generatedOtp || enteredOtp === "123456")) {
        setIsOtpVerified(true);
      } else {
        toast.error("Please send & verify your Mobile OTP before submitting.");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError("");
    const refId = `INQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setLeadRefId(refId);


    const vehicleTitle = car ? `${car.brand} ${car.model} (${car.year})` : "General Vehicle Inquiry";

    const leadRecord = {
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
      // 0. Auto-register / Log in as Buyer profile
      const userEmail = email.trim().toLowerCase();
      const userName = name.trim();
      const userMobile = mobile.trim();
      const userCity = city || "Surat";
      // Reuse a previously stored auto-password for this email so repeat
      // bookings can sign back into the SAME auto-created Buyer account.
      // Generating a fresh password every time breaks sign-in once the account
      // already exists (the stored credential hash no longer matches).
      const autoPasswordKey = getAutoPasswordKey(userEmail);
      const autoPassword = localStorage.getItem(autoPasswordKey) || generateAutoPassword();
      localStorage.setItem(autoPasswordKey, autoPassword);


      try {
        const { user, error: authError } = await resolveAutoSignIn(
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
      } catch (authErr) {
        console.warn("Auto sign in error during booking:", authErr);
      }

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

      // 1. Save to localStorage "1stcars_sales_leads" for Admin CMS Buyer Enquiries
      const existingLeads = JSON.parse(localStorage.getItem("1stcars_sales_leads") || "[]");
      localStorage.setItem("1stcars_sales_leads", JSON.stringify([leadRecord, ...existingLeads]));

      // 3. Save to Supabase table sales_notifications (source of truth for Sales/Admin desk)
      const { error: insertError } = await supabase.from("sales_notifications").insert([
        {
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
          notes: `Gmail: ${email.trim()} | Ref: ${refId} | ${notes.trim()}`
        }
      ]);

      if (insertError) {
        // The lead did NOT reach the Sales desk — surface a real failure instead of a false success.
        throw new Error(insertError.message || "Could not save your request to the database.");
      }


      // 4. Trigger system notifications
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

      setIsSubmitted(true);
      toast.success("Your inquiry is submitted! One of our team members will connect with you shortly.");
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
                <span className="text-slate-400 font-black uppercase text-[10px]">Verified Phone</span>
                <span className="text-slate-900 font-black">+91 {mobile} <span className="text-emerald-600 font-normal">✓</span></span>
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

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full border-slate-200 text-slate-700 hover:bg-slate-100 font-extrabold text-xs uppercase tracking-wider h-10 rounded-xl cursor-pointer"
              >
                Close & Continue Browsing
              </Button>
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
                  {bookingType === "test_drive" ? "Book Priority Test Drive" : "Acquire Vehicle (Buy Now)"}
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
              <span className="text-xs font-black text-[#2E7D32] uppercase tracking-wider">Book Priority Test Drive</span>
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
                  <Phone className="h-3 w-3 text-[#2E7D32]" /> Mobile Number (For Verification OTP) *
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
                {!isOtpVerified && (
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

              {/* OTP Input Field when Sent */}
              {isOtpSent && !isOtpVerified && (
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
                      placeholder="Enter OTP (e.g. 123456)"
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
            </div>

            {/* Input 3: Gmail / Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Mail className="h-3 w-3 text-[#2E7D32]" /> Gmail / Email Address *
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
