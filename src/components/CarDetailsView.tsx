import * as React from "react";
import { ArrowLeft, Check, ShieldCheck, Fuel, Award, MapPin, Calendar, User, Phone, Clock, MessageSquare, Heart, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Calculator, FileText, CheckCircle2, ShieldAlert, Share2, Copy, Link as LinkIcon, Car as CarIcon } from "lucide-react";
import { Car } from "@/src/types";
import { OFFICIAL_120_CATEGORIES } from "@/src/data/inspection120Data";

import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { cn } from "@/src/lib/utils";
import { toast } from "@/src/lib/toast";
import { BookingModal } from "@/src/components/BookingModal";
import { BuyNowCheckout } from "@/src/components/BuyNowCheckout";
import { useCatalogCars } from "@/src/lib/useCatalogCars";
import { applyCarOgMeta, resetCarOgMeta, buildCarShareMessage, buildCarShareFullMessage, carShareLink } from "@/src/lib/carShare";
import { trackMetaEvent } from "@/src/lib/metaPixel";
import { trackShareEvent } from "@/src/lib/analytics";


interface CarDetailsViewProps {
  carId: string;
  onBack: () => void;
  onViewCar: (id: string) => void;
  savedCars: string[];
  onSaveToggle: (id: string, model: string) => void;
  onNavigateToSalesPortal: () => void;
  onNavigateToDashboard?: () => void;
}

export function CarDetailsView({
  carId,
  onBack,
  onViewCar,
  savedCars,
  onSaveToggle,
  onNavigateToSalesPortal,
  onNavigateToDashboard,
}: CarDetailsViewProps) {
  const { cars: catalogCars } = useCatalogCars();

  // 120-Point checklist totals computed from the official inspection data so
  // the certificate banner always matches the module breakdown rendered below.
  const total120Points = React.useMemo(
    () => OFFICIAL_120_CATEGORIES.reduce((sum, cat) => sum + cat.questions.length, 0),
    []
  );
  const passed120Points = React.useMemo(
    () => OFFICIAL_120_CATEGORIES.reduce((sum, cat) => sum + cat.questions.filter((q) => q.passed).length, 0),
    []
  );

  // Locate selected car. Returns undefined when the car is missing (deleted or
  // unpublished) so the "Vehicle Not Available" state renders instead of
  // silently falling back to an unrelated vehicle.
  const car = React.useMemo(() => {
    return catalogCars.find((item) => item.id === carId);
  }, [carId, catalogCars]);

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
  const touchStartX = React.useRef<number | null>(null);
  
  const getCarPhotos = (car: any) => {
    if (Array.isArray(car.images) && car.images.length > 0) {
      return car.images.map((url: string, idx: number) => ({
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
  
  const angles = car ? getCarPhotos(car) || [
    { title: "Front Exterior Profile", text: "Three-Quarter cinematic studio angle showing sleek hood lines" },
    { title: "Rear Fastback Profile", text: "Bold posture detailing standard active aerodynamics & lightbar" },
    { title: "Cockpit Cabin Lounge", text: "Finest hand-stitched finishes, carbon clusters & primary command wheel" }
  ] : [];

  // Active Tab State
  const [activeTab, setActiveTab] = React.useState<"specs" | "features" | "inspection" | "finance">("specs");

  // 120-Point inspection accordion — keeps all 12 sections visible as compact
  // vertical rows so the report stays swipeable instead of one giant page.
  const [expandedCategory, setExpandedCategory] = React.useState<number | null>(0);

  // Booking Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
  const [bookingModalType, setBookingModalType] = React.useState<"test_drive" | "buy_now">("test_drive");

  // Buy Now / Reserve checkout sheet state
  const [isBuyNowOpen, setIsBuyNowOpen] = React.useState(false);

  // If the visitor arrived with a ?open_booking=1 deep link, open the booking
  // modal directly. (Google sign-in was removed from the booking modal.)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open_booking") === "1") {
      params.delete("open_booking");
      const nextSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
      );
      setBookingModalType("test_drive");
      setIsBookingModalOpen(true);
    }
  }, []);

  React.useEffect(() => {
    if (!car) return;
    trackMetaEvent("ViewContent", {
      content_name: `${car.brand} ${car.model} (${car.year})`,
      content_category: "Car Listing",
      content_ids: [car.id],
      value: car.price,
      currency: "INR",
      num_items: 1
    });
  }, [car]);


  // Finance slider state
  const [downPayment, setDownPayment] = React.useState(20000);
  const [loanTerm, setLoanTerm] = React.useState(60); // months

  const handleScrollToBooking = (type: "test_drive" | "buy_now") => {
    if (type === "buy_now") {
      setIsBuyNowOpen(true);
    } else {
      setBookingModalType("test_drive");
      setIsBookingModalOpen(true);
    }
  };

  // Finance calculations

  const calculatedEmi = React.useMemo(() => {
    if (!car) return 0;
    const principal = car.price - downPayment;
    if (principal <= 0) return 0;
    const annualInterestRate = 0.0549; // 5.49% Premium APR
    const monthlyInterestRate = annualInterestRate / 12;
    const emiValue = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTerm)) / (Math.pow(1 + monthlyInterestRate, loanTerm) - 1);
    return Math.round(emiValue);
  }, [car, downPayment, loanTerm]);

  // Extract similar cars (same brand or price range +/- $30k)
  const similarCars = React.useMemo(() => {
    if (!car) return [];
    return catalogCars.filter(
      (item) => item.id !== car.id && (item.brand === car.brand || Math.abs(item.price - car.price) <= 40000)
    ).slice(0, 2);
  }, [car, catalogCars]);

  // Publish the car's photo + title + price as Open Graph meta (and restore the
  // site defaults on unmount) so shared deep links preview like a car card in
  // JS-rendering crawlers. Complements the serverless api/car-preview page.
  React.useEffect(() => {
    if (!car) return;
    applyCarOgMeta(car);
    return () => resetCarOgMeta();
  }, [car]);

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Car not in the live catalog (deleted in Admin CMS or not published yet).
  if (!car) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center p-8">
        <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#2E7D32]/10 flex items-center justify-center">
            <CarIcon className="h-7 w-7 text-[#2E7D32]" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Vehicle Not Available</h2>
          <p className="text-sm text-slate-500 font-medium">
            This car is no longer in our live inventory. It may have been sold or removed by the admin.
          </p>
          <Button
            onClick={onBack}
            className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl px-6 h-11"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  // Generate and download a real (dependency-free) PDF certificate instead of
  // faking a download. A minimal single-page PDF is built by hand; only ASCII
  // text is used so the WinAnsi/Helvetica font renders it reliably.
  const downloadInspectionPdf = () => {
    const safe = (s: string) =>
      s.replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const lines = [
      "1stCars - Official 120-Point Certified Inspection Certificate",
      "",
      `Vehicle:  ${safe(`${car.brand} ${car.model}`)} (${car.year})`,
      `Location: ${safe(car.location || "N/A")}`,
      `Grade:    A+ (Pristine)  |  Passed ${passed120Points}/${total120Points} points`,
      `Inspector: Vikram Rathore (ID: INS-120-GJ-8842)`,
      "",
      "This vehicle has passed the full 1stMark 120-Point quality standard:",
      "non-accident frame, authentic odometer, flood-free history and clean ECU scan.",
    ];

    const streamContent =
      "BT\n/F1 14 Tf\n72 720 Td\n14 TL\n" +
      lines.map((line, i) => (i === 0 ? `(${line}) Tj` : `(${line}) Tj T*`)).join("\n") +
      "\nET\n";

    // Minimal valid PDF: catalog, pages, page, font, content stream.
    const parts: string[] = [];
    parts.push("%PDF-1.4\n");
    const objectOffsets: number[] = [];
    const addObject = (body: string) => {
      objectOffsets.push(parts.join("").length);
      parts.push(`${objectOffsets.length} 0 obj\n${body}\nendobj\n`);
    };

    addObject("<< /Type /Catalog /Pages 2 0 R >>");
    addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream`);

    const xrefOffset = parts.join("").length;
    const xref =
      "xref\n0 " + (objectOffsets.length + 1) + "\n" +
      "0000000000 65535 f \n" +
      objectOffsets.map((off) => String(off).padStart(10, "0") + " 00000 n \n").join("") +
      `trailer\n<< /Size ${objectOffsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    const blob = new Blob([parts.join(""), xref], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${car.brand}-${car.model}-1stcars-inspection-certificate.pdf`.replace(/\s+/g, "-").toLowerCase();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Official 120-Point Certified Inspection PDF downloaded!");
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-4 sm:pt-6 pb-10">


      {schemaData && (
        <script
          type="application/ld+json"
          // JSON is embedded inside a <script> element, so escape characters that
          // could terminate the tag (e.g. "</script>") or be ambiguous for the
          // HTML/JS parsers. Valid JSON survives these unicode escapes intact.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaData)
              .replace(/</g, "\\u003c")
              .replace(/>/g, "\\u003e")
              .replace(/&/g, "\\u0026")
              .replace(/\u2028/g, "\\u2028")
              .replace(/\u2029/g, "\\u2029"),
          }}
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
                const shareUrl = carShareLink(car);
                const message = buildCarShareMessage(car);
                if (navigator.share) {
                  trackShareEvent("whatsapp", "car_details", `${car.brand} ${car.model}`);
                  try {
                    await navigator.share({
                      title: `${car.year} ${car.brand} ${car.model} | 1stCars Certified`,
                      text: message,
                      url: shareUrl,
                    });
                    return;
                  } catch (e) {}
                }
                trackShareEvent("copy", "car_details", `${car.brand} ${car.model}`);
                try {
                  await navigator.clipboard.writeText(buildCarShareFullMessage(car));
                  toast.success("Car card copied! Paste it anywhere to share.");
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

        {/* HERO: Gallery + Key Info side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-6">

          {/* Gallery column */}
          <div className="lg:col-span-7 space-y-3">

            {/* Main image */}
            <div
              className="bg-slate-950 rounded-2xl overflow-hidden relative shadow-md select-none"
              style={{aspectRatio:"4/3"}}
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(deltaX) < 40) return;
                if (deltaX < 0) {
                  setActiveImageIndex((prev) => (prev + 1) % angles.length);
                } else {
                  setActiveImageIndex((prev) => (prev - 1 + angles.length) % angles.length);
                }
              }}
            >
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-700",
                  !angles[activeImageIndex].url && activeImageIndex === 0 && "bg-gradient-to-br from-slate-900 to-black",
                  !angles[activeImageIndex].url && activeImageIndex === 1 && "bg-gradient-to-br from-zinc-900 to-slate-950",
                  !angles[activeImageIndex].url && activeImageIndex === 2 && "bg-gradient-to-br from-neutral-900 to-stone-950"
                )}
                style={angles[activeImageIndex].url ? {
                  backgroundImage: `url(${angles[activeImageIndex].url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                } : undefined}
              />

              {/* Bottom gradient overlay — text never sits directly on image */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

              {/* Watermark for placeholder */}
              {!angles[activeImageIndex].url && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none p-16">
                  <svg viewBox="0 0 100 50" className="w-10/12 text-white fill-current">
                    <path d="M15 35 L12 35 C10 35 8 33 8 31 L8 25 C8 22 10 20 12 18 L25 10 C28 8 32 7 35 7 L65 7 C69 7 73 9 75 12 L85 22 C88 24 90 27 90 31 L90 35 C88 35 86 35 85 35 C82 32 78 32 75 35 C72 38 75 42 78 42 C81 42 84 39 85 37 L90 37 L92 37 C94 37 95 36 95 34 L95 28 C95 24 93 21 90 19 L82 10 C79 6 74 4 69 4 L31 4 C26 4 21 6 18 10 L8 21 C6 23 5 26 5 29 L5 34 C5 36 6 37 8 37 L15 37 C16 39 19 42 22 42 C25 42 28 38 25 35 Z" />
                    <circle cx="22" cy="35" r="5" />
                    <circle cx="78" cy="35" r="5" />
                  </svg>
                </div>
              )}

              {/* Top badge row */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
                <Badge className="bg-black/50 text-white border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                  {activeImageIndex + 1} / {angles.length}
                </Badge>
                <button
                  onClick={() => onSaveToggle(car.id, `${car.brand} ${car.model}`)}
                  className={cn(
                    "w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer backdrop-blur-md",
                    savedCars.includes(car.id)
                      ? "bg-rose-500 border-rose-400 text-white"
                      : "bg-black/30 hover:bg-black/50 border-white/20 text-white"
                  )}
                >
                  <Heart className={cn("h-4 w-4", savedCars.includes(car.id) && "fill-current")} />
                </button>
              </div>

              {/* Caption sits on gradient — not on image */}
              <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{angles[activeImageIndex].title}</p>
              </div>

              {/* Nav arrows */}
              <button
                onClick={() => setActiveImageIndex((prev) => (prev - 1 + angles.length) % angles.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all cursor-pointer z-10"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveImageIndex((prev) => (prev + 1) % angles.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all cursor-pointer z-10"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {angles.map((ang: { url?: string; title?: string; text?: string }, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={cn(
                    "rounded-xl border transition-all cursor-pointer shrink-0 overflow-hidden",
                    activeImageIndex === i ? "border-[#2E7D32] ring-2 ring-[#2E7D32]/30" : "border-slate-200 hover:border-slate-300"
                  )}
                  style={{width:72, height:52}}
                >
                  {ang.url ? (
                    <img src={ang.url} alt={ang.title || `Angle ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-xs font-black">
                      {i === 0 ? "🚗" : i === 1 ? "🔙" : "🪑"}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Key info column */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black tracking-widest text-[#2E7D32] uppercase">{car.brand}</span>
                {car.certified && (
                  <Badge className="bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/25 font-bold uppercase tracking-widest text-[9px]">
                    1stMark™ Certified
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {car.brand} {car.model}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 mt-2">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#2E7D32]" />{car.year}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#2E7D32]" />{car.location}</span>
              </div>
            </div>

            {/* Quick specs pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: car.fuel },
                { label: car.transmission },
                { label: `${car.mileage.toLocaleString()} km` },
                { label: `${car.owners === 1 ? "1st Owner" : `${car.owners || 1} Owners`}` },
              ].map((s) => (
                <span key={s.label} className="px-3 py-1.5 bg-[#2E7D32]/8 border border-[#2E7D32]/15 text-[#2E7D32] text-xs font-bold rounded-lg">
                  {s.label}
                </span>
              ))}
            </div>

            {/* Price block */}
            <div className="bg-[#2E7D32]/5 border border-[#2E7D32]/15 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buy Now Price</p>
              <p className="text-3xl font-black text-[#2E7D32] tracking-tight mt-0.5">{formatMoney(car.price)}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Est. EMI <span className="text-[#2E7D32]">{formatMoney(car.emi)}/mo</span></p>
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                onClick={() => handleScrollToBooking("test_drive")}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white py-3 rounded-xl font-black uppercase tracking-wider text-xs shadow-md shadow-[#2E7D32]/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Test Drive
              </Button>
              <Button
                onClick={() => handleScrollToBooking("buy_now")}
                className="bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black uppercase tracking-wider text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                Reserve Now
              </Button>
            </div>


            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#2E7D32] shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SSL Encrypted · 1stCars Verified</span>
            </div>
          </div>
        </div>

        {/* Primary Page Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT PANEL: Details tabs (8 columns) */}
          <div className="lg:col-span-8 space-y-8">


            {/* COMPLETE VEHICLE OVERVIEW SPECIFICATIONS GRID */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">Key Vehicle Parameters</h3>
                </div>
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
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Installed Premium & Performance Options</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Custom configured options installed on this particular vehicle from the factory.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                      {(car.features || [
                        "Premium Aero Pack",
                        "High fidelity Surround Audio",
                        "Dynamic Dampening active suspension",
                        "Nappa leather seating",
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
                    <div className="bg-gradient-to-r from-[#F1F6F1] to-white p-5 rounded-2xl shadow-md border border-[#2E7D32]/15 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 text-[9px] font-black uppercase tracking-widest">
                              Official 120-Point Certified Report
                            </Badge>
                            <span className="text-xs font-mono text-[#2E7D32]">CERT-120P-GJ-2026</span>
                          </div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight pt-1">
                            1stCars 120-Point Certified Inspection & Structural Audit
                          </h3>
                          <p className="text-xs text-slate-500">
                            Executed at <strong className="text-[#2E7D32]">{car.location}</strong> • Certified Inspector ID: <strong className="text-slate-800">INS-120-GJ-8842 (Vikram Rathore)</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-widest">Vehicle Grade</p>
                            <p className="text-3xl font-black text-slate-900">Grade A+ <span className="text-xs text-white bg-[#2E7D32] px-1.5 py-0.5 rounded font-bold">Pristine</span></p>
                          </div>
                          <div className="w-16 h-16 bg-[#2E7D32] text-white font-black rounded-2xl flex flex-col items-center justify-center text-center p-1 leading-none shadow-lg shadow-[#2E7D32]/30">
                            <span className="text-sm font-black">{passed120Points}/{total120Points}</span>
                            <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">PASSED</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-[#2E7D32]/10 my-2" />

                      <div className="flex flex-wrap items-center justify-between text-xs gap-3">
                        <div className="flex items-center space-x-4 text-emerald-800 text-[11px] font-medium">
                          <span>✓ 100% Non-Accident Frame</span>
                          <span>✓ Authentic Odometer</span>
                          <span>✓ Flood Free Guarantee</span>
                          <span>✓ Clean ECU DTC Sweep</span>
                        </div>
                        <button
                          onClick={downloadInspectionPdf}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Download PDF Certificate</span>
                        </button>
                      </div>
                    </div>

                    {/* 120-Point Official 12 Category Modules (vertical accordion) */}
                    <div className="space-y-2.5 pt-1">
                      {OFFICIAL_120_CATEGORIES.map((cat, idx) => {
                        const isOpen = expandedCategory === idx;
                        return (
                          <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setExpandedCategory(isOpen ? null : idx)}
                              className="w-full bg-[#FAF9F6] p-4 flex items-center justify-between gap-3 border-b border-slate-100 cursor-pointer hover:bg-emerald-50/40 transition-colors text-left"
                              aria-expanded={isOpen}
                            >
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-black text-slate-900">{cat.title}</span>
                                  <Badge className="bg-[#2E7D32]/10 text-[#2E7D32] border-none text-[9px] font-extrabold uppercase">
                                    {cat.totalPoints} / {cat.totalPoints} Passed
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">All {cat.questions.length} checkpoints verified clean by lead inspector.</p>
                              </div>
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs font-black text-[#2E7D32] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0">
                                  100% PASS
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                              </span>
                            </button>

                            {isOpen && (
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                                {cat.questions.map((q) => (
                                  <div key={q.id} className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <CheckCircle2 className="h-4 w-4 text-[#2E7D32] shrink-0 mt-0.5 stroke-[2.5]" />
                                    <span className="text-xs font-bold text-slate-700 leading-tight">{q.question}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                          <span>Min ₹10k</span>
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
            
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="font-black text-lg text-slate-900 tracking-tight text-left">Book This Car</h3>
              <Button
                onClick={() => handleScrollToBooking("test_drive")}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-md shadow-[#2E7D32]/20 cursor-pointer flex items-center justify-center gap-2"
              >
                Book Test Drive
              </Button>
              <Button
                onClick={() => handleScrollToBooking("buy_now")}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                Reserve Now
              </Button>
              <div className="flex items-center gap-2 pt-1">
                <ShieldCheck className="h-4 w-4 text-[#2E7D32] shrink-0" />
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Secure 1stCars SSL Encrypted</span>
              </div>
            </div>


          </div>

        </div>

      </div>

      {/* Booking Modal */}
      <BookingModal

        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        car={car}
        initialType={bookingModalType}
        selectedCity={car.cities?.[0] || car.location || "Surat"}
        savedCars={savedCars}
        onSaveToggle={onSaveToggle}
        onNavigateToDashboard={onNavigateToDashboard}
      />

      {/* Buy Now / Reserve Checkout Sheet */}
      <BuyNowCheckout
        isOpen={isBuyNowOpen}
        onClose={() => setIsBuyNowOpen(false)}
        car={car}
        selectedCity={car.cities?.[0] || car.location || "Surat"}
        savedCars={savedCars}
        onSaveToggle={onSaveToggle}
        onNavigateToDashboard={onNavigateToDashboard}
      />
    </div>
  );
}


