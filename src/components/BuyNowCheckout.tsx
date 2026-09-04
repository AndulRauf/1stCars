import * as React from "react";
import { X, ArrowLeft, Headphones, CheckCircle2, ArrowRight, RotateCcw, Home, ShieldCheck, BadgeCheck, ChevronRight, QrCode } from "lucide-react";
import { Car } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { getOrCreateAutoPassword, resolveAutoSignIn } from "@/src/lib/autoAuth";
import { trackMetaEvent } from "@/src/lib/metaPixel";
import { trackWhatsAppClick } from "@/src/lib/analytics";
import { resolveLeadOwner, insertLeadWithAssignment } from "@/src/lib/leadAssignment";

interface BuyNowCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  car?: Car | null;
  selectedCity?: string;
  savedCars?: string[];
  onSaveToggle?: (id: string, model: string) => void;
  onNavigateToDashboard?: () => void;
}

const MIN_BOOKING_TOKEN = 3000;
const MAX_BOOKING_TOKEN = 10000;

// Refundable booking token = 1% of the car's value, capped between ₹3,000
// and ₹10,000.
const bookingTokenFor = (price: number) =>
  Math.min(MAX_BOOKING_TOKEN, Math.max(MIN_BOOKING_TOKEN, Math.round(price * 0.01)));

const processCheckout = async (
  car: Car,
  selectedCity: string,
  buyerName: string,
  buyerEmail: string,
  buyerMobile: string,
  refId: string,
  vehicleTitle: string,
  totalPrice: number,
  fmt: (val: number) => string,
  upiRef: string,
  upiId: string,
  paymentStatus: string,
  onSaveToggle?: (id: string, model: string) => void,
  savedCars?: string[]
) => {
  const safeEmail = buyerEmail.trim() || `${buyerMobile.trim()}@1stcars.com`;
  const tokenAmount = bookingTokenFor(car.price);
  try {
    // Reuse the shared auto-auth helper so the stored auto-password matches the
    // account's real password across ALL flows (Sell Car, Booking, Checkout).
    // A hardcoded password here created accounts that SellCarView's later
    // sign-in attempt could not authenticate, leaving the seller stranded.
    const autoPassword = getOrCreateAutoPassword(safeEmail);
  } catch (authErr) {
    console.warn("Auto sign in error during checkout:", authErr);
  }

  if (car.id) {
    const existingSaved = JSON.parse(localStorage.getItem("1stcars_saved_cars") || "[]");
    if (!existingSaved.includes(car.id)) {
      localStorage.setItem("1stcars_saved_cars", JSON.stringify([car.id, ...existingSaved]));
    }
    if (onSaveToggle && !existingSaved.includes(car.id)) onSaveToggle(car.id, car.model);
  }

  const leadRecord: Record<string, any> = {
    id: refId,
    created_at: new Date().toISOString(),
    name: buyerName.trim(),
    email: safeEmail,
    mobile: buyerMobile.trim(),
    mobile_verified: !isRealSupabase,
    city: selectedCity || car.cities?.[0] || car.location || "Surat",
    vehicle: vehicleTitle,
    car_id: car.id,
    car_brand: car.brand,
    car_model: car.model,
    price: car.price,
    type: "Buy Car / Reservation",
    status: paymentStatus,
    notes: paymentStatus === "Payment Submitted"
      ? `Token ${fmt(tokenAmount)} paid via UPI | UPI Ref: ${upiRef} | UPI ID: ${upiId} | Total: ${fmt(totalPrice)} | Ref: ${refId}`
      : `Booking token ${fmt(tokenAmount)} | Total drive-away ${fmt(totalPrice)} | Ref: ${refId}`,
    ...(paymentStatus === "Payment Submitted" && {
      upi_ref: upiRef,
      upi_id: upiId,
      payment_status: "submitted"
    })
  };
  // Auto-assign the lead to the Sales Associate who uploaded this car
  // (leads for admin-published/demo cars stay in the shared pool).
  const owner = await resolveLeadOwner(car);
  if (owner) {
    leadRecord.assigned_to = owner.id;
    leadRecord.assigned_to_name = owner.name || "";
  }

  const existingLeads = JSON.parse(localStorage.getItem("1stcars_sales_leads") || "[]");
  localStorage.setItem("1stcars_sales_leads", JSON.stringify([leadRecord, ...existingLeads]));

  const { error: insertError } = await insertLeadWithAssignment({
    name: buyerName.trim() || "Buyer (Checkout)",
    mobile: buyerMobile.trim(),
    city: selectedCity || car.cities?.[0] || car.location || "Surat",
    preferred_date: new Date().toISOString().split("T")[0],
    preferred_time: "Immediate Reservation",
    car_id: car.id,
    car_brand: car.brand,
    car_model: car.model,
    type: "buy_now",
    status: paymentStatus === "Payment Submitted" ? "payment_submitted" : "pending",
    assigned_to: owner?.id || null,
    assigned_to_name: owner?.name || null,
    notes: paymentStatus === "Payment Submitted"
      ? `Token ${fmt(tokenAmount)} | UPI Ref: ${upiRef} | UPI ID: ${upiId} | Total ${fmt(totalPrice)} | Ref ${refId} | Mobile ${!isRealSupabase ? "Verified" : "Pending Call Verification"}`
      : `Token ${fmt(tokenAmount)} | Total ${fmt(totalPrice)} | Ref ${refId} | Mobile ${!isRealSupabase ? "Verified" : "Pending Call Verification"}`,
  });

  if (insertError) throw new Error(insertError.message);

  trackMetaEvent("Lead", {
    content_name: vehicleTitle,
    content_category: "Buy Now",
    value: car.price,
    currency: "INR",
    num_items: 1
  });

  if (paymentStatus === "Payment Submitted") {
    trackMetaEvent("Purchase", {
      content_name: vehicleTitle,
      content_category: "Buy Now",
      value: totalPrice,
      currency: "INR",
      num_items: 1
    });
  }

  // Lead is persisted — the caller shows the confirmation immediately. The
  // auto sign-in and staff notifications run in the background so the
  // checkout never blocks on extra network round-trips.
  void (async () => {
    try {
      await resolveAutoSignIn(
        supabase,
        safeEmail,
        getOrCreateAutoPassword(safeEmail),
        {
          data: {
            name: buyerName.trim(),
            email: safeEmail,
            mobile: buyerMobile.trim(),
            role: "Buyer",
            city: selectedCity || car.cities?.[0] || car.location || "Surat",
          },
        }
      );
    } catch (authErr) {
      console.warn("Auto sign in error during checkout:", authErr);
    }

    try {
      await notificationService.triggerCarReserved({
        buyerName: buyerName.trim(),
        carTitle: vehicleTitle,
        price: car.price,
      });
    } catch (notifErr) {
      console.warn("Background reservation notification failed:", notifErr);
    }
  })();
};

export function BuyNowCheckout({
  isOpen,
  onClose,
  car,
  selectedCity = "Surat",
  savedCars,
  onSaveToggle,
  onNavigateToDashboard,
}: BuyNowCheckoutProps) {
  const [showPriceSummary, setShowPriceSummary] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [leadRefId, setLeadRefId] = React.useState("");
  const [buyerName, setBuyerName] = React.useState("");
  const [buyerEmail, setBuyerEmail] = React.useState("");
  const [buyerMobile, setBuyerMobile] = React.useState("");

  // Mobile OTP verification state
  const [otpSent, setOtpSent] = React.useState(false);
  const [generatedOtp, setGeneratedOtp] = React.useState("");
  const [enteredOtp, setEnteredOtp] = React.useState("");
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isMobileVerified, setIsMobileVerified] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [simulatedSms, setSimulatedSms] = React.useState<{ mobile: string; code: string } | null>(null);

  // UPI payment step
  const [showUpiPayment, setShowUpiPayment] = React.useState(false);
  const [upiRef, setUpiRef] = React.useState("");
  const [upiSettings, setUpiSettings] = React.useState<{ upiId: string; qrUrl: string; instructions: string; payeeName: string }>({ upiId: "", qrUrl: "", instructions: "", payeeName: "1stCars" });

  React.useEffect(() => {
    const raw = localStorage.getItem("1stcars_payment_settings");
    if (raw) {
      try { setUpiSettings(JSON.parse(raw)); } catch {}
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setShowPriceSummary(false);
      setIsSubmitted(false);
      setBuyerName("");
      setBuyerEmail("");
      setBuyerMobile("");
      setOtpSent(false);
      setGeneratedOtp("");
      setEnteredOtp("");
      setIsMobileVerified(false);
      setCountdown(0);
      setSimulatedSms(null);
      setShowUpiPayment(false);
      setUpiRef("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        onNavigateToDashboard?.();
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, onClose, onNavigateToDashboard]);

  // OTP resend countdown timer
  React.useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);


  if (!isOpen || !car) return null;

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  // Refundable booking token = 1% of the car's value (min ₹3,000 / max ₹10,000).
  const bookingToken = bookingTokenFor(car.price);

  // Build a UPI deep-link for a given app scheme.
  // Uses the standard NPCI UPI URL parameters so any UPI app can pre-fill the payment.
  const buildUpiLink = (scheme: string) => {
    // URLSearchParams encodes only the values and keeps the `key=value&key=value`
    // separators intact, which is what UPI apps expect to parse.
    const params = new URLSearchParams({
      pa: upiSettings.upiId,
      pn: upiSettings.payeeName || "1stCars",
      am: String(bookingToken),
      cu: "INR",
      tn: `1stCars Booking Token ${car.brand} ${car.model}`.trim(),
    });
    const queryStr = params.toString();

    // App-specific URL formats
    if (scheme === "tez") {
      // Google Pay (GPay)
      return `tez://upi/pay?${queryStr}`;
    } else if (scheme === "phonepe") {
      // PhonePe
      return `phonepe://pay?${queryStr}`;
    } else if (scheme === "paytmmp") {
      // Paytm
      return `paytmmp://pay?${queryStr}`;
    } else {
      // Generic UPI intent
      return `upi://pay?${queryStr}`;
    }
  };

  // Popular UPI apps with their intent schemes.
  const upiApps = [
    { name: "Google Pay", icon: "🟢", scheme: "tez" },
    { name: "PhonePe", icon: "🟣", scheme: "phonepe" },
    { name: "Paytm", icon: "🔵", scheme: "paytmmp" },
    { name: "Other UPI", icon: "💳", scheme: "upi" },
  ];

  // Price breakup — use the admin-configured per-car breakup when available,
  // otherwise fall back to the default drive-away charges.
  const basePrice = car.price;
  const customBreakup = Array.isArray((car as any).price_breakup) ? (car as any).price_breakup : null;

  const defaultExtras = [
    { label: "RC transfer price", amount: 10000, desc: "Seamless RC transfer services with RTO assistance" },
    { label: "Intra state road tax", amount: Math.round(basePrice * 0.011), desc: "Government mandated tax on the transfer of ownership" },
    { label: "Third party insurance", amount: 2474, desc: "Govt mandated insurance against third party damages" },
    { label: "Car Servicing Charges", amount: 11000, desc: "One-time fee for pre-sale car maintenance to ensure safe drives" },
  ];

  const extras = customBreakup
    ? customBreakup.map((r: any) => ({ label: r.label, amount: Number(r.amount) || 0, desc: r.desc || null }))
    : defaultExtras;

  const priceRows = [
    { label: "Base price", amount: basePrice, desc: null },
    ...extras,
  ];

  const totalPrice = priceRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const kmDriven = ((car as any).km_driven || car.mileage) || 0;
  const kmLabel = kmDriven >= 1000 ? `${(kmDriven / 1000).toFixed(2)} T km` : `${kmDriven.toLocaleString()} km`;
  const ownerLabel = car.owners === 1 ? "1st owner" : `${car.owners || 1} owners`;
  const variant = (car as any).variant || "";

  // EMI fallback: if the car has no emi value, estimate at ~2% of price/month (approx 5yr @ ~10%)
  const displayEmi = car.emi && car.emi > 0 ? car.emi : Math.round((totalPrice * 0.021) / 100) * 100;

  const buildWhatsAppLink = () => {
    const phone = "918866377722"; // 1stCars support number
    const msg = `Hi 1stCars! I'm interested in the ${car.year} ${car.brand} ${car.model}${variant ? " " + variant : ""} (${fmt(car.price)}). Please share more details.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Step 1: Verify mobile before payment. On the real backend the number is
  // verified by the concierge on the call — no simulated OTP is ever shown in
  // production. The simulated OTP gate exists only in mock/demo mode.
  const handleSendOtp = async () => {
    if (!buyerName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!buyerMobile || buyerMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (isRealSupabase) {
      toast.success("Proceed to pay the booking token — our team verifies your number over the call.");
      setShowUpiPayment(true);
      return;
    }

    setIsSendingOtp(true);
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      setOtpSent(true);
      setEnteredOtp("");
      setCountdown(30);

      // Simulated SMS gateway (mirrors the login OTP experience) — mock only.
      setSimulatedSms({ mobile: buyerMobile, code: otpCode });
      setTimeout(() => setSimulatedSms(null), 15000);

      toast.success(`🔑 SMS Gateway: Your checkout OTP is ${otpCode}`);
    } catch (err) {
      console.error("Send OTP error:", err);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Resend OTP (respects the countdown timer)
  const handleResendOtp = () => {
    if (countdown > 0) return;
    handleSendOtp();
  };

  // Step 2: Verify OTP → show UPI payment screen
  const handleVerifyAndPay = async () => {
    if (enteredOtp !== generatedOtp) {
      toast.error("Incorrect OTP. Please check the code and try again.");
      return;
    }
    setIsMobileVerified(true);
    toast.success("Mobile number verified! Proceed to pay the booking token.");
    setShowUpiPayment(true);
  };

  const handleContinueToPay = async () => {
    if (!buyerName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!buyerMobile || buyerMobile.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setIsSubmitting(true);

    const refId = `BUY-${Math.floor(100000 + Math.random() * 900000)}`;
    setLeadRefId(refId);
    const vehicleTitle = `${car.brand} ${car.model} (${car.year})`;

    try {
      await processCheckout(car, selectedCity, buyerName, buyerEmail, buyerMobile, refId, vehicleTitle, totalPrice, fmt, "", "", "Pending", onSaveToggle, savedCars);
      setIsSubmitted(true);
      toast.success("Reservation started! Our team will connect with you to complete the payment.");
    } catch (err) {
      console.error("Buy now checkout error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong while creating your reservation.";
      toast.error(`Reservation failed: ${message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPI Payment Screen
  if (showUpiPayment) {
    const handleConfirmPayment = async () => {
      if (!upiRef.trim()) {
        toast.error("Please enter your UPI transaction reference number.");
        return;
      }
      setIsSubmitting(true);
      const refId = `BUY-${Math.floor(100000 + Math.random() * 900000)}`;
      setLeadRefId(refId);
      const vehicleTitle = `${car.brand} ${car.model} (${car.year})`;
      try {
        await processCheckout(car, selectedCity, buyerName, buyerEmail, buyerMobile, refId, vehicleTitle, totalPrice, fmt, upiRef.trim(), upiSettings.upiId, "Payment Submitted", onSaveToggle, savedCars);
        setIsSubmitted(true);
        toast.success("Payment submitted! Our team will contact you shortly.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        toast.error(`Reservation failed: ${message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
            <button onClick={() => setShowUpiPayment(false)} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Pay Booking Token
            </button>
          </div>
          <div className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount to Pay</p>
              <p className="text-3xl font-black text-slate-900">{fmt(bookingToken)}</p>
              <p className="text-xs text-slate-500 font-medium">Refundable booking token (1% of car value)</p>
            </div>

            {/* UPI ID + QR (shown when configured by admin) */}
            {upiSettings.upiId && (
              <div className="space-y-3">
                {upiSettings.qrUrl && (
                  <div className="flex justify-center">
                    <img src={upiSettings.qrUrl} alt="UPI QR Code" className="w-44 h-44 rounded-2xl border border-slate-200 object-contain" />
                  </div>
                )}
                {upiSettings.instructions && (
                  <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 rounded-xl px-3 py-2">{upiSettings.instructions}</p>
                )}
              </div>
            )}

            {/* Pay directly with UPI apps via deep links — ALWAYS shown */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Pay directly with your UPI app</p>
              <div className="grid grid-cols-2 gap-2">
                {upiApps.map((app) => (
                  <a
                    key={app.name}
                    href={buildUpiLink(app.scheme)}
                    onClick={(e) => {
                      if (!upiSettings.upiId) {
                        e.preventDefault();
                        toast.error("UPI collection isn't set up yet. Please ask the team to configure a UPI ID, or enter your payment reference below.");
                        return;
                      }
                      // Fire the deep link; if the app isn't installed the OS simply ignores it,
                      // so we also surface a hint after a short delay.
                      toast.info(`Opening ${app.name}… complete the payment, then enter the UTR below.`);
                      // Fallback for desktop / when no app handles the scheme: after 1.2s,
                      // if the page is still visible, tell the user to scan the QR / use another app.
                      setTimeout(() => {
                        if (document.visibilityState === "visible") {
                          toast.info(`If ${app.name} didn't open, make sure it's installed — or scan the QR above.`);
                        }
                      }, 1200);
                    }}
                    className="flex items-center justify-center gap-2 h-12 rounded-2xl border border-slate-200 bg-white hover:border-[#2E7D32] hover:bg-[#2E7D32]/5 transition-colors cursor-pointer active:scale-95"
                  >
                    <span className="text-lg">{app.icon}</span>
                    <span className="text-xs font-black text-slate-800">{app.name}</span>
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center">Tapping a button opens the app with the amount pre-filled. On desktop, scan the QR above instead.</p>
            </div>

            {!upiSettings.upiId && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-xs font-semibold text-amber-700">UPI collection isn't fully configured yet. You can still tap your UPI app above, or our team will contact you to collect the token payment.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">UPI Transaction Reference No.</label>
              <input
                type="text"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                placeholder="Enter UTR / Transaction ID after payment"
                className="w-full h-11 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2E7D32]"
              />
              <p className="text-[10px] text-slate-400 font-medium">Find this in your UPI app under payment history</p>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 bg-white">
            <Button
              onClick={handleConfirmPayment}
              disabled={isSubmitting || !upiRef.trim()}
              className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-sm uppercase tracking-wider h-12 rounded-2xl shadow-md shadow-[#2E7D32]/20 cursor-pointer"
            >
              {isSubmitting ? "Confirming..." : "Confirm Payment & Reserve"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Price Summary Sheet
  if (showPriceSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
          <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-slate-100 flex items-start justify-between z-10">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Price Summary</h2>
              <p className="text-sm text-slate-500 mt-0.5">Check your complete price breakup</p>
            </div>
            <button onClick={() => setShowPriceSummary(false)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-1">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-4">
              <span className="text-lg">₹</span>
              <p className="text-sm font-bold text-slate-700"><span className="font-black text-slate-900">Drive-away price:</span> Save time, no surprises</p>
            </div>
            {priceRows.map((row, i) => (
              <div key={i} className={`py-3 ${i < priceRows.length - 1 ? "border-b border-slate-100" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${i === 0 ? "text-slate-700" : "text-slate-600 underline decoration-dotted"}`}>{row.label}</span>
                  <span className="text-sm font-bold text-slate-900">{fmt(row.amount)}</span>
                </div>
                {row.desc && <p className="text-xs text-slate-400 mt-0.5 font-medium">{row.desc}</p>}
              </div>
            ))}
            <div className="flex items-center justify-between pt-4 border-t-2 border-slate-200 mt-2">
              <span className="text-base font-black text-slate-900">Total car price</span>
              <span className="text-base font-black text-slate-900">{fmt(totalPrice)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 text-center space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-9 w-9 text-[#2E7D32] stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Payment Confirmed!</h3>
            <p className="text-sm text-slate-500 mt-1">Ref: <strong className="text-slate-800">{leadRefId}</strong></p>
            <p className="text-sm text-slate-500 mt-2">Your Sales Assistant will contact you shortly.</p>
          </div>
          <div className="space-y-2 pt-2">
            <Button onClick={() => { onNavigateToDashboard?.(); onClose(); }} className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white rounded-xl font-black text-xs uppercase tracking-wider h-11">Go to Buyer Dashboard</Button>
            <p className="text-[10px] text-slate-400 font-bold text-center">Redirecting you to your Buyer Dashboard in a moment…</p>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout sheet
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      {/* Simulated SMS Notification Banner — mock/demo mode only */}
      {!isRealSupabase && simulatedSms && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4">
          <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/20 flex flex-col gap-2 animate-bounce">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                💬 Messages • Live Notification
              </span>
              <button onClick={() => setSimulatedSms(null)} className="text-white/40 hover:text-white/80 text-xs font-bold cursor-pointer">✕</button>
            </div>
            <div className="text-[11px] leading-relaxed font-semibold text-slate-100">
              <strong className="text-white">+91 {simulatedSms.mobile}</strong>: [1stCars] Your checkout verification OTP is {simulatedSms.code}. Valid for 5 minutes. Do not share it with anyone.
            </div>
            <button
              onClick={() => {
                setEnteredOtp(simulatedSms.code);
                toast.success("OTP autofilled! Click Verify & Pay to continue.");
                setSimulatedSms(null);
              }}
              className="mt-1 bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider rounded-lg py-2 transition-all cursor-pointer shadow-lg shadow-[#2E7D32]/20"
            >
              ⚡ Autofill OTP: {simulatedSms.code}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <button
            onClick={otpSent ? () => setOtpSent(false) : onClose}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> {otpSent ? "Verify Mobile" : "Bookings"}
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Car card */}
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
            <div className="w-20 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
              {car.image_url ? (
                <img src={car.image_url} alt={car.model} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-xs font-black">{car.brand[0]}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-900 text-sm leading-tight">{car.year} {car.brand} {car.model} {variant && <span className="font-semibold text-slate-500">{variant}</span>}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{kmLabel} · {car.fuel} · {ownerLabel} · {car.transmission}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1"><BadgeCheck className="h-3 w-3 text-[#2E7D32]" />{car.location}</p>
            </div>
          </div>

          {/* Refundable token */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#2E7D32] rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-slate-800">Refundable booking amount</span>
              </div>
              <span className="text-sm font-black text-slate-900">{fmt(bookingToken)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-8">Pay token to get priority assistance <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" onClick={() => { trackWhatsAppClick("buy_now_know_more", `${car.brand} ${car.model}`, car.price); trackMetaEvent("InitiateContact", { content_name: `${car.brand} ${car.model}`, contact_way: "whatsapp" }); }} className="text-[#2E7D32] font-bold underline">Know more!</a></p>

          </div>

          {/* Price row */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">Car Price</p>
                <p className="text-base font-black text-slate-900">{fmt(car.price)}</p>
              </div>
              <button onClick={() => setShowPriceSummary(true)} className="text-sm font-bold text-slate-800 flex items-center gap-1 cursor-pointer hover:text-[#2E7D32]">
                Understand price <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!otpSent ? (
            <>
              {/* Buyer details */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Your full name *"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2E7D32]"
                />
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">+91</span>
                  <input
                    type="tel"
                    value={buyerMobile}
                    onChange={(e) => setBuyerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number *"
                    className="w-full h-10 border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>
              </div>

              <p className="text-center text-xs font-bold text-[#2E7D32]">Your token is 100% refundable</p>
            </>
          ) : (
            <>
              {/* OTP verification step */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#2E7D32] shrink-0" />
                  <p className="text-xs font-semibold text-slate-600">
                    We sent a 6-digit OTP to <strong className="text-slate-900">+91 {buyerMobile}</strong>.
                    <button onClick={() => setOtpSent(false)} className="text-[#2E7D32] font-bold underline ml-1 cursor-pointer">Change</button>
                  </p>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  autoFocus
                  className="w-full h-12 border border-slate-200 rounded-xl px-3 text-center text-lg font-black tracking-[0.4em] text-slate-900 placeholder-slate-300 placeholder:tracking-normal placeholder:text-sm placeholder:font-bold focus:outline-none focus:border-[#2E7D32]"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Didn't receive it?</p>
                  <button
                    onClick={handleResendOtp}
                    disabled={countdown > 0}
                    className={`text-xs font-bold cursor-pointer ${countdown > 0 ? "text-slate-300 cursor-not-allowed" : "text-[#2E7D32] underline"}`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky bottom CTA */}

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-4 bg-white">
          <div>
            <p className="text-xl font-black text-slate-900">{fmt(bookingToken)}</p>
          </div>
          {!otpSent ? (
            <Button
              onClick={handleSendOtp}
              disabled={isSendingOtp}
              className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-sm uppercase tracking-wider h-12 rounded-2xl shadow-md shadow-[#2E7D32]/20 cursor-pointer"
            >
              {isSendingOtp ? "Sending OTP..." : "Book Now"}
            </Button>
          ) : (
            <Button
              onClick={handleVerifyAndPay}
              disabled={isSubmitting || enteredOtp.length < 6}
              className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-sm uppercase tracking-wider h-12 rounded-2xl shadow-md shadow-[#2E7D32]/20 cursor-pointer"
            >
              {isSubmitting ? "Processing..." : "Verify & pay"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

}