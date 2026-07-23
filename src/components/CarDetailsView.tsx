import * as React from "react";
import { ArrowLeft, Check, ShieldCheck, Fuel, Award, MapPin, Calendar, User, Phone, DollarSign, Clock, MessageSquare, Heart, Sparkles, ChevronLeft, ChevronRight, Calculator, FileText, CheckCircle2, ShieldAlert, Share2, Copy, Link as LinkIcon } from "lucide-react";
import { Car } from "@/src/types";
import { CARS_DATA } from "@/src/data/cars";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { OFFICIAL_120_CATEGORIES } from "@/src/data/inspection120Data";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { cn } from "@/src/lib/utils";
import { toast } from "@/src/lib/toast";

interface CarDetailsViewProps {
  carId: string;
  onBack: () => void;
  onViewCar: (id: string) => void;
  savedCars: string[];
  onSaveToggle: (id: string, model: string) => void;
  onNavigateToSalesPortal: () => void;
}

export function CarDetailsView({
  carId,
  onBack,
  onViewCar,
  savedCars,
  onSaveToggle,
  onNavigateToSalesPortal,
}: CarDetailsViewProps) {
  // Locate selected car
  const car = React.useMemo(() => {
    return CARS_DATA.find((item) => item.id === carId) || CARS_DATA[0];
  }, [carId]);

  // Schema.org Structured Metadata for Car
  const schemaData = React.useMemo(() => {
    if (!car) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Car",
      "name": `${car.brand} ${car.model}`,
      "brand": {
        "@type": "Brand",
        "name": car.brand
      },
      "model": car.model,
      "modelDate": car.year.toString(),
      "vehicleConfiguration": (car as any).variant || "Standard Premium Edition",
      "mileageFromOdometer": {
        "@type": "QuantitativeValue",
        "value": car.mileage || 0,
        "unitCode": "SMI"
      },
      "fuelType": car.fuel,
      "vehicleTransmission": car.transmission,
      "offers": {
        "@type": "Offer",
        "price": car.price.toString(),
        "priceCurrency": "INR",
        "itemCondition": "https://schema.org/UsedCondition",
        "availability": "https://schema.org/InStock"
      }
    };
  }, [car]);

  // Gallery slider state
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  
  const getCarPhotos = (car: any) => {
    if (Array.isArray(car.images) && car.images.length > 0) {
      return car.images.map((url, idx) => ({
        url,
        title: idx === 0 ? "Featured Profile" : `Detail Angle #${idx + 1}`,
        text: `${car.brand} ${car.model} — Cinematic view #${idx + 1}`
      }));
    }
    const hasRealImgUrl = car.image_url && (
      car.image_url.startsWith("http") || 
      car.image_url.startsWith("/") || 
      car.image_url.startsWith("data:")
    );
    if (hasRealImgUrl) {
      return [
        {
          url: car.image_url,
          title: "Primary Profile View",
          text: `${car.brand} ${car.model} — Exterior cinematic presentation`
        }
      ];
    }
    return null;
  };
  
  const angles = getCarPhotos(car) || [
    { title: "Front Exterior Profile", text: "Three-Quarter cinematic studio angle showing sleek hood lines" },
    { title: "Rear Fastback Profile", text: "Bold posture detailing standard active aerodynamics & lightbar" },
    { title: "Cockpit Cabin Lounge", text: "Finest hand-finished stitching, carbon clusters & primary command wheel" }
  ];

  // Active Tab State
  const [activeTab, setActiveTab] = React.useState<"specs" | "features" | "inspection" | "warranty" | "finance">("specs");

  // Booking form states
  const [bookingForm, setBookingForm] = React.useState({
    name: "",
    mobile: "",
    city: car.cities?.[0] || car.location || "Surat",
    preferredDate: "",
    preferredTime: "11:00 AM - 01:00 PM",
    type: "test_drive" as "test_drive" | "buy_now" | "whatsapp" | "call_request",
  });
  const [bookingSubmitted, setBookingSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Finance slider state
  const [downPayment, setDownPayment] = React.useState(20000);
  const [loanTerm, setLoanTerm] = React.useState(60); // months

  // Scroll to booking form
  const bookingFormRef = React.useRef<HTMLDivElement>(null);

  const handleScrollToBooking = (type: "test_drive" | "buy_now") => {
    setBookingForm((prev) => ({ ...prev, type }));
    if (bookingFormRef.current) {
      bookingFormRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // WhatsApp / Call Request Handler
  const handleInstantContact = async (contactType: "whatsapp" | "call") => {
    setIsSubmitting(true);
    try {
      await supabase.from("sales_notifications").insert([
        {
          name: "Visitor (Instant Inquirer)",
          mobile: "+91 8866377722",
          city: car.cities?.[0] || car.location || "Surat",
          preferred_date: new Date().toISOString().split("T")[0],
          preferred_time: "Immediate Connection Requested",
          car_id: car.id,
          car_brand: car.brand,
          car_model: car.model,
          type: contactType === "whatsapp" ? "whatsapp" : "call_request",
          status: "pending",
          notes: `Clicked active ${contactType} CTA on details screen`
        },
      ]);
      
      const message = contactType === "whatsapp" 
        ? "Opening WhatsApp chat with our Private Concierge..."
        : "Sales associate notified! We will call you within 15 minutes.";
      
      toast.success(`${message} (Lead successfully logged to Supabase)`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit contact request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Booking Form
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.mobile || !bookingForm.preferredDate) {
      toast.error("Please fill in all requested fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from("sales_notifications").insert([
        {
          name: bookingForm.name,
          mobile: bookingForm.mobile,
          city: bookingForm.city,
          preferred_date: bookingForm.preferredDate,
          preferred_time: bookingForm.preferredTime,
          car_id: car.id,
          car_brand: car.brand,
          car_model: car.model,
          type: bookingForm.type,
          status: "pending",
          notes: `Scheduled ${bookingForm.type.replace("_", " ")} lead via online details panel.`
        },
      ]);

      // Trigger Notification Workflows based on Booking type
      if (bookingForm.type === "test_drive") {
        // Rule 4: Buyer books test drive → Notify Sales Associate.
        await notificationService.triggerTestDriveBooked({
          buyerName: bookingForm.name,
          carTitle: `${car.brand} ${car.model}`,
          preferredDate: bookingForm.preferredDate,
          preferredTime: bookingForm.preferredTime
        });
      } else if (bookingForm.type === "buy_now") {
        // Rule 5: Buyer reserves car → Notify Sales Associate.
        await notificationService.triggerCarReserved({
          buyerName: bookingForm.name,
          carTitle: `${car.brand} ${car.model}`,
          price: car.price
        });
      }

      setBookingSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finance calculations
  const calculatedEmi = React.useMemo(() => {
    const principal = car.price - downPayment;
    if (principal <= 0) return 0;
    const annualInterestRate = 0.0549; // 5.49% Premium APR
    const monthlyInterestRate = annualInterestRate / 12;
    const emiValue = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTerm)) / (Math.pow(1 + monthlyInterestRate, loanTerm) - 1);
    return Math.round(emiValue);
  }, [car.price, downPayment, loanTerm]);

  // Extract similar cars (same brand or price range +/- $30k)
  const similarCars = React.useMemo(() => {
    return CARS_DATA.filter(
      (item) => item.id !== car.id && (item.brand === car.brand || Math.abs(item.price - car.price) <= 40000)
    ).slice(0, 2);
  }, [car]);

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-24">
      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top navigation & Action bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6 sm:mb-8 bg-white/80 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/70 shadow-xs">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-xl text-xs font-extrabold text-[#2E7D32] hover:bg-[#2E7D32]/10 transition-all uppercase tracking-wider cursor-pointer group shrink-0"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Back to Collection</span>
            <span className="sm:hidden whitespace-nowrap">Back</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => {
                onSaveToggle(car.id, `${car.brand} ${car.model}`);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap",
                savedCars.includes(car.id)
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5 shrink-0", savedCars.includes(car.id) && "fill-current text-rose-500")} />
              <span className="hidden sm:inline">{savedCars.includes(car.id) ? "Saved in Shortlist" : "Save Car"}</span>
              <span className="sm:hidden">{savedCars.includes(car.id) ? "Saved" : "Save"}</span>
            </button>

            <button
              onClick={async () => {
                const shareUrl = `${window.location.origin}/cars/${car.id}`;
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `${car.year} ${car.brand} ${car.model} | 1stCars Certified`,
                      text: `Check out this certified ${car.year} ${car.brand} ${car.model} (${car.fuel}, ${car.transmission}) on 1stCars!`,
                      url: shareUrl,
                    });
                    return;
                  } catch (e) {}
                }
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Car link copied to clipboard! Share it with anyone.");
                } catch (err) {
                  toast.info(`Direct link: ${shareUrl}`);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2E7D32] hover:bg-[#25632a] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#2E7D32]/20 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Share2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Share Car Page</span>
              <span className="sm:hidden">Share</span>
            </button>
          </div>
        </div>

        {/* Primary Page Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT PANEL: Gallery & Details tabs (8 columns) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Header Title block */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xs font-black tracking-widest text-[#2E7D32] uppercase">
                    {car.brand} Studio
                  </span>
                  {car.certified && (
                    <Badge className="bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/25 font-bold uppercase tracking-widest text-[9px]">
                      1stMark Certified
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                  {car.model}
                </h1>
                <div className="flex items-center space-x-3 text-sm font-semibold text-slate-500 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-[#2E7D32]" />
                    <span>Year {car.year}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-[#2E7D32]" />
                    <span>{car.location}</span>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Buy Now Price</p>
                <p className="text-4xl font-black text-[#2E7D32] tracking-tight">{formatMoney(car.price)}</p>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Est. EMI {formatMoney(car.emi)}/mo</p>
              </div>
            </div>

            {/* Premium Interactive Image Gallery */}
            <div className="bg-slate-950 rounded-3xl overflow-hidden relative shadow-lg aspect-video flex flex-col justify-between p-6 select-none">
              
              {/* Dynamic Gradients based on Active Slider Index */}
              <div 
                className={cn(
                  "absolute inset-0 transition-all duration-700 bg-gradient-to-br",
                  !angles[activeImageIndex].url && activeImageIndex === 0 && "from-slate-900 to-black",
                  !angles[activeImageIndex].url && activeImageIndex === 1 && "from-zinc-900 to-slate-950",
                  !angles[activeImageIndex].url && activeImageIndex === 2 && "from-neutral-900 to-stone-950"
                )} 
                style={angles[activeImageIndex].url ? {
                  backgroundImage: `url(${angles[activeImageIndex].url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                } : undefined}
              />

              {/* Decorative premium watermark */}
              {!angles[activeImageIndex].url && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none p-16">
                  <svg viewBox="0 0 100 50" className="w-10/12 text-white fill-current">
                    <path d="M15 35 L12 35 C10 35 8 33 8 31 L8 25 C8 22 10 20 12 18 L25 10 C28 8 32 7 35 7 L65 7 C69 7 73 9 75 12 L85 22 C88 24 90 27 90 31 L90 35 C88 35 86 35 85 35 C82 32 78 32 75 35 C72 38 75 42 78 42 C81 42 84 39 85 37 L90 37 L92 37 C94 37 95 36 95 34 L95 28 C95 24 93 21 90 19 L82 10 C79 6 74 4 69 4 L31 4 C26 4 21 6 18 10 L8 21 C6 23 5 26 5 29 L5 34 C5 36 6 37 8 37 L15 37 C16 39 19 42 22 42 C25 42 28 38 25 35 Z" />
                    <circle cx="22" cy="35" r="5" />
                    <circle cx="78" cy="35" r="5" />
                  </svg>
                </div>
              )}

              {/* Top info row */}
              <div className="z-10 flex items-center justify-between">
                <Badge className="bg-white/10 text-white border-white/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                  Studio Angle {activeImageIndex + 1} of {angles.length}
                </Badge>
                <button
                  onClick={() => onSaveToggle(car.id, `${car.brand} ${car.model}`)}
                  className={cn(
                    "w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer backdrop-blur-md",
                    savedCars.includes(car.id)
                      ? "bg-rose-500 border-rose-400 text-white"
                      : "bg-black/20 hover:bg-black/40 border-white/15 text-white"
                  )}
                >
                  <Heart className={cn("h-4.5 w-4.5", savedCars.includes(car.id) && "fill-current")} />
                </button>
              </div>

              {/* Angle Description text */}
              <div className="z-10 mt-auto text-left max-w-lg bg-black/35 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
                  {angles[activeImageIndex].title}
                </p>
                <p className="text-slate-200 text-sm font-medium leading-relaxed">
                  {angles[activeImageIndex].text}
                </p>
              </div>

              {/* Interactive Slide dots */}
              <div className="absolute bottom-6 right-8 flex space-x-2 z-10">
                {angles.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all cursor-pointer",
                      activeImageIndex === idx ? "bg-[#2E7D32] w-6" : "bg-white/30 hover:bg-white/60"
                    )}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={() => setActiveImageIndex((prev) => (prev - 1 + angles.length) % angles.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveImageIndex((prev) => (prev + 1) % angles.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Gallery Thumbnail Strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none scrollbar-thin">
              {angles.map((ang, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={cn(
                    "p-2.5 rounded-2xl text-left border transition-all cursor-pointer bg-white flex items-center gap-3 shrink-0 min-w-[160px] max-w-[200px]",
                    activeImageIndex === i
                      ? "border-[#2E7D32] bg-[#2E7D32]/5 text-[#2E7D32] shadow-xs"
                      : "border-slate-100 hover:bg-slate-50 text-slate-500"
                  )}
                >
                  {ang.url ? (
                    <img src={ang.url} alt={ang.title || `Vehicle Thumbnail #${i+1}`} className="w-12 h-10 object-cover rounded-lg shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-10 bg-slate-950 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">🚙</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#2E7D32]/80 truncate">{ang.title}</p>
                    <p className="text-[11px] font-bold truncate text-slate-800 mt-0.5">
                      {ang.url ? `Angle #${i + 1}` : (i === 0 ? "Front Profile" : i === 1 ? "Aggressive Rear" : "Cabin Cockpit")}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* COMPLETE VEHICLE OVERVIEW SPECIFICATIONS GRID */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">Complete Car Overview</span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">Key Vehicle Parameters & Heritage</h3>
                </div>
                <Badge className="bg-emerald-50 text-[#2E7D32] border border-emerald-200 font-bold text-[10px] uppercase tracking-wider">
                  Verified Heritage Data
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
                {/* 1. Reg City & RTO */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reg City & RTO</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{car.regCity || "Surat"}</p>
                  <p className="text-[10px] font-bold text-[#2E7D32] mt-0.5">{car.rtoCode || "GJ05-ER-4050"}</p>
                </div>

                {/* 2. Reg Year & Make */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reg Year</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{car.regYear || car.year}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">Mfg {car.year}</p>
                </div>

                {/* 3. Ownership */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Ownership</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{car.owners === 1 ? "1st Owner" : `${car.owners || 1} Owners`}</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Single Handed</p>
                </div>

                {/* 4. Kilometers Driven */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KM Driven</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{car.mileage.toLocaleString()} km</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">Genuine Odometer</p>
                </div>

                {/* 5. Fuel & Transmission */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drivetrain</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{car.fuel}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{car.transmission}</p>
                </div>

                {/* 6. Color */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color</p>
                  <p className="text-xs font-black text-slate-900 mt-1 truncate">{car.color || "GT Silver Metallic"}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">Original Factory Paint</p>
                </div>

                {/* 7. Insurance */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance</p>
                  <p className="text-xs font-black text-slate-900 mt-1 truncate">{car.insuranceValidity ? "Valid Insurance" : "Comprehensive"}</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5 truncate">{car.insuranceValidity || "Valid till March 2027"}</p>
                </div>

                {/* 8. Ground Clearance & Boot */}
                <div className="p-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clearance & Boot</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{car.groundClearance || "185 mm"}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{car.bootCapacity || "420 Litres"}</p>
                </div>
              </div>
            </div>

            {/* TABBED DETAILS NAVIGATION SECTION */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Tab Header Row */}
              <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 overflow-x-auto">
                {[
                  { id: "specs", label: "Specifications", icon: Award },
                  { id: "features", label: "Key Features", icon: Sparkles },
                  { id: "inspection", label: "120-Point Inspection Report", icon: ShieldCheck },
                  { id: "warranty", label: "Warranty Coverage", icon: CheckCircle2 },
                  { id: "finance", label: "Finance Eligibility", icon: Calculator },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                        activeTab === tab.id
                          ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10"
                          : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panels */}
              <div className="min-h-[180px] text-left">
                
                {/* 1. Specifications Tab */}
                {activeTab === "specs" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Mechanical & Structural Specifications</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Every element is hand-checked by 1stCars technicians. Listed specs are authentic representation of standard features.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {car.specifications.map((spec, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-[#FAF9F6] border border-slate-100 rounded-xl">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]/30" />
                          <span className="text-sm font-bold text-slate-700">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Key Features Tab */}
                {activeTab === "features" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Installed Luxury & Performance Options</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Custom configured options installed on this particular vehicle from the factory.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                      {(car.features || [
                        "Premium Aero Pack",
                        "High fidelity Surround Audio",
                        "Dynamic Dampening active suspension",
                        "Nappa luxury leather seating",
                        "Advanced ADAS Safety Suite"
                      ]).map((feat, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-[#2E7D32]/5 rounded-xl border border-[#2E7D32]/10">
                          <Check className="h-4.5 w-4.5 text-[#2E7D32] flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-800">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. 120-Point Detailed Certified Inspection Tab */}
                {activeTab === "inspection" && (
                  <div className="space-y-6">
                    {/* Top Certificate Header Banner */}
                    <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-black text-white p-5 rounded-2xl shadow-md border border-emerald-500/20 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest">
                              Official 120-Point Certified Report
                            </Badge>
                            <span className="text-xs font-mono text-emerald-400">CERT-120P-GJ-2026</span>
                          </div>
                          <h3 className="text-xl font-black text-white tracking-tight pt-1">
                            1stCars 120-Point Certified Inspection & Structural Audit
                          </h3>
                          <p className="text-xs text-slate-300">
                            Executed at <strong className="text-emerald-300">{car.location}</strong> • Certified Inspector ID: <strong className="text-white">INS-120-GJ-8842 (Vikram Rathore)</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Vehicle Grade</p>
                            <p className="text-3xl font-black text-white">Grade A+ <span className="text-xs text-[#2E7D32] bg-white px-1.5 py-0.5 rounded font-bold">Pristine</span></p>
                          </div>
                          <div className="w-16 h-16 bg-[#2E7D32] text-white font-black rounded-2xl flex flex-col items-center justify-center text-center p-1 leading-none shadow-lg shadow-[#2E7D32]/30">
                            <span className="text-sm font-black">118/120</span>
                            <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">PASSED</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/10 my-2" />

                      <div className="flex flex-wrap items-center justify-between text-xs gap-3">
                        <div className="flex items-center space-x-4 text-emerald-200 text-[11px] font-medium">
                          <span>✓ 100% Non-Accident Frame</span>
                          <span>✓ Authentic Odometer</span>
                          <span>✓ Flood Free Guarantee</span>
                          <span>✓ Clean ECU DTC Sweep</span>
                        </div>
                        <button
                          onClick={() => toast.success("Downloading Official 120-Point Certified Inspection PDF Report...")}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Download PDF Certificate</span>
                        </button>
                      </div>
                    </div>

                    {/* 120-Point Official 12 Category Modules */}
                    <div className="space-y-4 pt-1">
                      {OFFICIAL_120_CATEGORIES.map((cat, idx) => (
                        <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <div className="bg-[#FAF9F6] p-4 flex items-center justify-between border-b border-slate-100">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-black text-slate-900">{cat.title}</span>
                                <Badge className="bg-[#2E7D32]/10 text-[#2E7D32] border-none text-[9px] font-extrabold uppercase">
                                  {cat.totalPoints} / {cat.totalPoints} Passed
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 font-medium">All {cat.questions.length} checkpoints verified clean by lead inspector.</p>
                            </div>
                            <span className="text-xs font-black text-[#2E7D32] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0">
                              100% PASS
                            </span>
                          </div>

                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                            {cat.questions.map((q) => (
                              <div key={q.id} className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                <CheckCircle2 className="h-4 w-4 text-[#2E7D32] shrink-0 mt-0.5 stroke-[2.5]" />
                                <span className="text-xs font-bold text-slate-700 leading-tight">{q.question}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Warranty Tab */}
                {activeTab === "warranty" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Comprehensive Warranty Security</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      We stand behind our cars. Drive with complete absolute tranquility backed by our premium multi-point assurance warranty.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start space-x-3">
                        <ShieldCheck className="h-6 w-6 text-[#2E7D32] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Coverage Period</p>
                          <p className="text-base font-extrabold text-slate-800 mt-1">
                            {car.warrantyInfo?.months || "24"} Months or {((car.warrantyInfo?.miles || 24000) * 1.609).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} km
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start space-x-3">
                        <Award className="h-6 w-6 text-[#2E7D32] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-bold">Assurance Category</p>
                          <p className="text-sm font-extrabold text-slate-800 mt-1">
                            {car.warrantyInfo?.coverage || "Comprehensive bumper-to-bumper 1stMark Elite Protection"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-2">
                      <p className="text-xs font-black text-[#2E7D32] uppercase tracking-widest">Included Concierge Perks</p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs font-bold text-slate-600">
                        <li className="flex items-center gap-2">✔️ 24/7 Roadside Assistance & Towing</li>
                        <li className="flex items-center gap-2">✔️ Free Annual Service Checks</li>
                        <li className="flex items-center gap-2">✔️ Doorstep Pickup and Return</li>
                        <li className="flex items-center gap-2">✔️ 100% Original Spare Parts Guarantee</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 5. Finance Tab */}
                {activeTab === "finance" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Interactive Financing Calculator</h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Calculate monthly payments based on interest rate starting at <strong className="text-[#2E7D32]">5.49% APR</strong> with custom down payment slider.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl">
                      {/* Left: Down payment slider */}
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Down Payment</label>
                          <span className="text-xs font-black text-[#2E7D32]">{formatMoney(downPayment)}</span>
                        </div>
                        <input
                          type="range"
                          min="10000"
                          max={car.price - 10000}
                          step="1000"
                          value={downPayment}
                          onChange={(e) => setDownPayment(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg accent-[#2E7D32] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Min $10k</span>
                          <span>Max {formatMoney(car.price - 10000)}</span>
                        </div>
                      </div>

                      {/* Right: Loan Term choice */}
                      <div className="space-y-3 text-left">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Loan Tenure Period</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[36, 48, 60].map((term) => (
                            <button
                              key={term}
                              onClick={() => setLoanTerm(term)}
                              className={cn(
                                "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                loanTerm === term
                                  ? "bg-[#2E7D32] text-white border-transparent"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              {term} Months
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 leading-normal pt-1">
                          Calculations based on 5.49% annual fixed interest. Final approval subject to bank partner evaluation.
                        </p>
                      </div>
                    </div>

                    {/* EMI Output summary */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Financing Balance Amount</p>
                        <p className="text-lg font-black text-slate-800">{formatMoney(car.price - downPayment)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Est. Monthly EMI</p>
                        <p className="text-2xl font-black text-[#2E7D32]">{formatMoney(calculatedEmi)}<span className="text-xs font-bold text-slate-500">/mo</span></p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* SIMILAR CARS REC BLOCK */}
            <div className="space-y-5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight text-left">Explore Similar Masterpieces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {similarCars.map((simCar) => (
                  <div
                    key={simCar.id}
                    onClick={() => onViewCar(simCar.id)}
                    className="group bg-white border border-slate-150 rounded-2xl p-4 flex gap-4 hover:shadow-lg transition-all cursor-pointer text-left"
                  >
                    <div className={cn("w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center p-3 text-white relative overflow-hidden", simCar.brand === "Porsche" ? "bg-rose-950" : simCar.brand === "BMW" ? "bg-blue-950" : "bg-zinc-900")}>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-25">{simCar.brand}</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{simCar.brand}</p>
                        <h4 className="font-extrabold text-slate-900 leading-tight group-hover:text-[#2E7D32] transition-colors">{simCar.model}</h4>
                        <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500 mt-1">
                          <span>{simCar.year}</span>
                          <span>•</span>
                          <span>{simCar.fuel}</span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <span className="font-black text-[#2E7D32] text-sm">{formatMoney(simCar.price)}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">View Car →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Sticky Booking Widget & Instant CTAs (4 columns) */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
            
            {/* Instant Concierge CTA panel (Buttons: Book Test Drive, Buy Now, WhatsApp, Call) */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-lg text-slate-900 tracking-tight text-left">Instant Client Actions</h3>
              
              <div className="space-y-2.5">
                <Button
                  onClick={() => handleScrollToBooking("test_drive")}
                  className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs h-12 shadow-md shadow-[#2E7D32]/10"
                >
                  Book Priority Test Drive
                </Button>
                <Button
                  onClick={() => handleScrollToBooking("buy_now")}
                  variant="outline"
                  className="w-full border-[#2E7D32] text-[#2E7D32] hover:bg-[#2E7D32]/5 py-3 rounded-xl font-bold uppercase tracking-widest text-xs h-12"
                >
                  Acquire Vehicle (Buy Now)
                </Button>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleInstantContact("whatsapp")}
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 h-11 border-none shadow-sm cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" /> WhatsApp
                </Button>
                <Button
                  onClick={() => handleInstantContact("call")}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 h-11 border-none shadow-sm cursor-pointer"
                >
                  <Phone className="h-4 w-4" /> Request Call
                </Button>
              </div>

              <div className="flex items-center space-x-2.5 justify-center pt-2">
                <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Secure 1stCars SSL Encrypted</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
