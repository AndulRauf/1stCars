import * as React from "react";
import { X, ArrowLeft, Headphones, CheckCircle2, ArrowRight, RotateCcw, Home, ShieldCheck, BadgeCheck, ChevronRight } from "lucide-react";
import { Car } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";

interface BuyNowCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  car?: Car | null;
  selectedCity?: string;
  savedCars?: string[];
  onSaveToggle?: (id: string, model: string) => void;
  onNavigateToDashboard?: () => void;
}

const BOOKING_TOKEN = 3000;

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

  React.useEffect(() => {
    if (isOpen) {
      setShowPriceSummary(false);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen || !car) return null;

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  // Price breakup
  const basePrice = car.price;
  const rcTransfer = 10000;
  const roadTax = Math.round(basePrice * 0.011);
  const thirdPartyInsurance = 2474;
  const extendedWarranty = 12000;
  const servicingCharges = 11000;
  const totalPrice = basePrice + rcTransfer + roadTax + thirdPartyInsurance + extendedWarranty + servicingCharges;

  const priceRows = [
    { label: "Base price", amount: basePrice, desc: null },
    { label: "RC transfer price", amount: rcTransfer, desc: "Seamless RC transfer services with RTO assistance" },
    { label: "Intra state road tax", amount: roadTax, desc: "Government mandated tax on the transfer of ownership" },
    { label: "Third party insurance", amount: thirdPartyInsurance, desc: "Govt mandated insurance against third party damages" },
    { label: "Extended Warranty – 12 Months", amount: extendedWarranty, desc: "Built-in protection for your car's engine, gearbox & drivetrain for a full year so you drive worry free" },
    { label: "Car Servicing Charges", amount: servicingCharges, desc: "One-time fee for pre-sale car maintenance to ensure safe drives" },
  ];

  const kmDriven = ((car as any).km_driven || car.mileage) || 0;
  const kmLabel = kmDriven >= 1000 ? `${(kmDriven / 1000).toFixed(2)} T km` : `${kmDriven.toLocaleString()} km`;
  const ownerLabel = car.owners === 1 ? "1st owner" : `${car.owners || 1} owners`;
  const variant = (car as any).variant || "";

  const handleContinueToPay = async () => {
    setIsSubmitting(true);
    const refId = `BUY-${Math.floor(100000 + Math.random() * 900000)}`;
    setLeadRefId(refId);
    const vehicleTitle = `${car.brand} ${car.model} (${car.year})`;

    try {
      if (car.id) {
        const existingSaved = JSON.parse(localStorage.getItem("1stcars_saved_cars") || "[]");
        if (!existingSaved.includes(car.id)) {
          localStorage.setItem("1stcars_saved_cars", JSON.stringify([car.id, ...existingSaved]));
        }
        if (onSaveToggle && !savedCars?.includes(car.id)) onSaveToggle(car.id, car.model);
      }

      const leadRecord = {
        id: refId,
        created_at: new Date().toISOString(),
        name: "Buyer (Checkout)",
        city: selectedCity || car.cities?.[0] || car.location || "Surat",
        vehicle: vehicleTitle,
        car_id: car.id,
        car_brand: car.brand,
        car_model: car.model,
        price: car.price,
        type: "Buy Car / Reservation",
        status: "Pending",
        notes: `Booking token ${fmt(BOOKING_TOKEN)} | Total drive-away ${fmt(totalPrice)} | Ref: ${refId}`,
      };
      const existingLeads = JSON.parse(localStorage.getItem("1stcars_sales_leads") || "[]");
      localStorage.setItem("1stcars_sales_leads", JSON.stringify([leadRecord, ...existingLeads]));

      await supabase.from("sales_notifications").insert([
        {
          name: "Buyer (Checkout)",
          mobile: "N/A",
          city: selectedCity || car.cities?.[0] || car.location || "Surat",
          preferred_date: new Date().toISOString().split("T")[0],
          preferred_time: "Immediate Reservation",
          car_id: car.id,
          car_brand: car.brand,
          car_model: car.model,
          type: "buy_now",
          status: "pending",
          notes: `Token ${fmt(BOOKING_TOKEN)} | Total ${fmt(totalPrice)} | Ref ${refId}`,
        },
      ]);

      await notificationService.triggerCarReserved({
        buyerName: "Buyer (Checkout)",
        carTitle: vehicleTitle,
        price: car.price,
      });

      setIsSubmitted(true);
      toast.success("Reservation started! Our team will connect with you to complete the payment.");
    } catch (err) {
      console.error("Buy now checkout error:", err);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h3 className="text-xl font-black text-slate-900">Reservation Confirmed!</h3>
            <p className="text-sm text-slate-500 mt-1">Ref: <strong className="text-slate-800">{leadRefId}</strong></p>
            <p className="text-sm text-slate-500 mt-2">Our team will contact you shortly to complete the booking token payment of <strong className="text-[#2E7D32]">{fmt(BOOKING_TOKEN)}</strong>.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl font-bold text-xs uppercase tracking-wider h-11">Close</Button>
            <Button onClick={() => { onClose(); onNavigateToDashboard?.(); }} className="bg-[#2E7D32] hover:bg-[#25632a] text-white rounded-xl font-black text-xs uppercase tracking-wider h-11">Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout sheet
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Checkout
          </button>
          <button className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <Headphones className="h-5 w-5" />
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
              <span className="text-sm font-black text-slate-900">{fmt(BOOKING_TOKEN)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-8">Pay token to get priority assistance <button className="text-[#2E7D32] font-bold underline">Know more!</button></p>
          </div>

          {/* EMI + Price row */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">EMI starts at</p>
                <p className="text-lg font-black text-slate-900">{fmt(car.emi)}<span className="text-sm font-bold text-slate-500">/mo</span></p>
              </div>
              <button className="text-sm font-bold text-amber-600 flex items-center gap-1 cursor-pointer">Check eligibility <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
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

          {/* Trust badges */}
          <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl px-4 py-4">
            <p className="text-sm font-black text-slate-900 text-center mb-3">Save the hassle, let us take care of that</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { icon: <ShieldCheck className="h-5 w-5 mx-auto text-slate-700" />, label: "120+ Quality checks" },
                { icon: <RotateCcw className="h-5 w-5 mx-auto text-slate-700" />, label: "30-day return" },
                { icon: <Home className="h-5 w-5 mx-auto text-slate-700" />, label: "Free home delivery" },
                { icon: <BadgeCheck className="h-5 w-5 mx-auto text-slate-700" />, label: "1 month warranty" },
              ].map((b, i) => (
                <div key={i} className="space-y-1.5">
                  {b.icon}
                  <p className="text-[10px] font-bold text-slate-600 leading-tight">{b.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs font-bold text-[#2E7D32]">Your token is 100% refundable</p>
        </div>

        {/* Sticky bottom CTA */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-4 bg-white">
          <div>
            <p className="text-xl font-black text-slate-900">{fmt(BOOKING_TOKEN)}</p>
          </div>
          <Button
            onClick={handleContinueToPay}
            disabled={isSubmitting}
            className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-sm uppercase tracking-wider h-12 rounded-2xl shadow-md shadow-[#2E7D32]/20 cursor-pointer"
          >
            {isSubmitting ? "Processing..." : "Continue to pay"}
          </Button>
        </div>
      </div>
    </div>
  );

}
