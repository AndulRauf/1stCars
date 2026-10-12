import * as React from "react";
import { Heart, ShieldCheck, Fuel, Gauge, Award, MapPin, Calendar, ChevronLeft, ChevronRight, Share2, CalendarCheck, MessageCircle } from "lucide-react";
import { Car } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { cn } from "@/src/lib/utils";
import { calculateListingEmi } from "@/src/lib/finance";
import { toast } from "@/src/lib/toast";
import { buildCarShareMessage, buildCarShareFullMessage, carShareLink } from "@/src/lib/carShare";
import { trackShareEvent } from "@/src/lib/analytics";

interface CarCardProps {
  key?: string | number;
  car: Car;
  isSaved?: boolean;
  onSaveToggle?: (id: string, model: string) => void;
  onViewDetails?: (id: string) => void;
  onTestDrive?: (car: Car) => void;
  onWhatsApp?: (car: Car) => void;
  isListView?: boolean;
}

// Generate stylized premium gradient representation for each car angle
const getCarAngleImages = (car: Car) => {
  const brandColorMap: Record<string, string> = {
    "Porsche": "from-rose-950/80 to-slate-900",
    "Land Rover": "from-emerald-950/80 to-zinc-900",
    "BMW": "from-blue-950/80 to-stone-900",
    "Audi": "from-slate-800/80 to-slate-950",
    "Mercedes-Benz": "from-[#1B5E20]/50 to-neutral-900",
    "Tesla": "from-red-950/40 to-neutral-950"
  };

  const gradient = brandColorMap[car.brand] || "from-slate-900 to-slate-950";

  return [
    {
      title: "Front Profile",
      bgClass: `bg-gradient-to-br ${gradient}`,
      text: `${car.brand} ${car.model}, Three-Quarter Front View`
    },
    {
      title: "Rear & Aggressive Lines",
      bgClass: `bg-gradient-to-tr ${gradient}`,
      text: `${car.brand} ${car.model}, Sleek Rear Fastback View`
    },
    {
      title: "Premium Cabin Interior",
      bgClass: `bg-gradient-to-b ${gradient}`,
      text: `${car.brand} ${car.model}, Cockpit & Premium Infotainment`
    }
  ];
};

const getCarPhotos = (car: Car) => {
  if (Array.isArray(car.images) && car.images.length > 0) {
    return car.images.map((url, idx) => ({
      url,
      title: idx === 0 ? "Featured Profile" : `Detail Angle #${idx + 1}`,
      text: `${car.brand} ${car.model}, Cinematic view #${idx + 1}`
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
        text: `${car.brand} ${car.model}, Exterior cinematic presentation`
      }
    ];
  }
  return null;
};

export function CarCard({
  car,
  isSaved = false,
  onSaveToggle,
  onViewDetails,
  onTestDrive,
  onWhatsApp,
  isListView = false,
}: CarCardProps) {
  // FIX: buttons must work even when parent forgets handlers (home grid did).
  // Internal fallbacks: Test Drive navigates to the car page with booking open,
  // WhatsApp opens a pre-filled chat. Parent-passed handlers still win.
  const handleTestDrive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTestDrive) { onTestDrive(car); return; }
    if (typeof window !== "undefined") {
      window.location.href = `/cars/${car.id}?open_booking=1`;
    }
  };
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWhatsApp) { onWhatsApp(car); return; }
    if (typeof window !== "undefined") {
      const price = Number(car.price || 0).toLocaleString("en-IN");
      const msg = `Hi 1stCars! I'm interested in ${car.year} ${car.brand} ${car.model} (Rs.${price}, ${car.fuel || "Petrol"}, ${car.location || "Surat"}). ID: ${car.id}. Please share test drive slots.`;
      window.open(`https://wa.me/918866377722?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  // A photo URL that fails to load (broken storage link) falls back to the
  // stylized gradient placeholder instead of showing a broken image.
  const [imageFailed, setImageFailed] = React.useState(false);
  // Tracks whether the current photo has finished decoding so a subtle skeleton
  // shimmer can show until then (avoids a blank flash while the image loads).
  const [imageLoaded, setImageLoaded] = React.useState(false);
  React.useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [activeImageIndex, car.id]);
  const touchStartX = React.useRef<number | null>(null);
  const angles = (getCarPhotos(car) || getCarAngleImages(car)) as Array<{ title: string; text: string; url?: string; bgClass?: string }>;

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % angles.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + angles.length) % angles.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) {
      setActiveImageIndex((prev) => (prev + 1) % angles.length);
    } else {
      setActiveImageIndex((prev) => (prev - 1 + angles.length) % angles.length);
    }
  };

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(car.price);

  const formattedEmi = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(calculateListingEmi(car.price));

  // Stats — rendered as an even 2-column grid (Year, Fuel, KM, Transmission,
  // City). City doubles as the single location display (no separate pill).
  const stats = [
    { label: "Year", value: car.year, icon: Calendar },
    { label: "Fuel", value: car.fuel, icon: Fuel },
    { label: "KM Driven", value: `${car.mileage.toLocaleString("en-IN")} km`, icon: Gauge },
    { label: "Transmission", value: car.transmission, icon: Award },
    { label: "City", value: car.cities?.[0] || car.location || "Surat", icon: MapPin },
  ];

  return (
    <div
      id={`car-card-${car.id}`}
      className={cn(
        "group relative bg-white border border-[#2E7D32]/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm sm:shadow-xs transition-all duration-300 hover:shadow-xl hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 flex flex-col min-w-0",
        isListView ? "md:flex-row md:min-h-[250px]" : "w-full"
      )}
    >
      {/* Premium Image Gallery Panel */}
      <div
        className={cn(
          "relative overflow-hidden flex-shrink-0 select-none w-full bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200",
          isListView && "md:w-2/5 md:min-h-[160px]"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {angles[activeImageIndex].url && !imageFailed ? (
          /* Fixed 4:3 aspect (matches placeholder) so cards never shift or make
             uneven grid rows on small phones. object-contain keeps the WHOLE car
             visible (no crop). A shimmer shows until the image decodes. */
          <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden flex items-center justify-center">
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200" aria-hidden="true" />
            )}
            <img
              src={angles[activeImageIndex].url}
              alt={`${car.brand} ${car.model}`}
              className={cn(
                "block w-full h-full object-contain transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              draggable={false}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          /* No photo uploaded: stylized gradient placeholder panel */
          <div
            className={cn(
              "relative w-full aspect-[4/3] text-white",
              isListView && "md:h-auto md:aspect-[4/3]",
              angles[activeImageIndex].bgClass
            )}
          >
            {/* Aesthetic Mock Vector Vehicle Silhouette Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none p-8 select-none">
              <svg viewBox="0 0 100 50" className="w-10/12 text-white fill-current">
                <path d="M15 35 L12 35 C10 35 8 33 8 31 L8 25 C8 22 10 20 12 18 L25 10 C28 8 32 7 35 7 L65 7 C69 7 73 9 75 12 L85 22 C88 24 90 27 90 31 L90 35 C88 35 86 35 85 35 C82 32 78 32 75 35 C72 38 75 42 78 42 C81 42 84 39 85 37 L90 37 L92 37 C94 37 95 36 95 34 L95 28 C95 24 93 21 90 19 L82 10 C79 6 74 4 69 4 L31 4 C26 4 21 6 18 10 L8 21 C6 23 5 26 5 29 L5 34 C5 36 6 37 8 37 L15 37 C16 39 19 42 22 42 C25 42 28 38 25 35 Z" />
                <circle cx="22" cy="35" r="5" />
                <circle cx="78" cy="35" r="5" />
              </svg>
            </div>
          </div>
        )}

        {/* Overlay: badges & actions (top) + angle caption (bottom) */}
        <div className="absolute inset-0 flex flex-col justify-between p-2.5 sm:p-5 pointer-events-none z-10">
          {/* Top Bar inside Gallery */}
          <div className="flex items-center justify-between w-full">
            {car.status === "sold" ? (
              <Badge className="bg-rose-600 hover:bg-rose-600 text-white border-none px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase shadow-md flex items-center gap-1">
                Sold
              </Badge>
            ) : car.status === "reserved" ? (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-none px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase shadow-md flex items-center gap-1">
                Reserved
              </Badge>
            ) : (
              /* No CERTIFIED badge on the image — the trust pill below the
                 image is the single source of truth (avoids duplication). */
              <div />
            )}

            <div className="flex items-center gap-1 ml-auto pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const message = buildCarShareMessage(car);
                  if (navigator.share) {
                    trackShareEvent("whatsapp", "car_card", `${car.brand} ${car.model}`);
                    navigator.share({
                      title: `${car.brand} ${car.model} | 1stCars`,
                      text: message,
                      url: carShareLink(car)
                    }).catch(() => {});
                  } else {
                    trackShareEvent("copy", "car_card", `${car.brand} ${car.model}`);
                    navigator.clipboard.writeText(buildCarShareFullMessage(car)).then(() => {
                      toast.success(`Car card copied. Paste it in WhatsApp!`);
                    }).catch(() => {});
                  }
                }}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-black/30 hover:bg-[#2E7D32] border border-white/20 text-white backdrop-blur-md transition-all duration-300 cursor-pointer shadow-md"
                title="Share Car Page"
                aria-label="Share Car"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveToggle?.(car.id, `${car.brand} ${car.model}`);
                }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 border cursor-pointer shadow-md",
                  isSaved 
                    ? "bg-rose-500 border-rose-400 text-white" 
                    : "bg-black/30 hover:bg-black/50 border-white/20 text-white"
                )}
                aria-label="Add to wishlist"
              >
                <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
              </button>
            </div>
          </div>

          {/* Label indicating Angle */}
          <div className="text-left bg-black/30 px-2 py-1 rounded-lg backdrop-blur-xs border border-white/10 hidden sm:block">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
              {angles[activeImageIndex].title}
            </p>
            <p className="text-[10px] font-medium text-slate-200 line-clamp-1">
              {angles[activeImageIndex].text}
            </p>
          </div>
        </div>

        {/* Gallery Navigation Controls — hidden on mobile where swipe + dots
            already navigate the gallery (reduces clutter); desktop keeps
            44px touch targets. */}
        <button
          onClick={handlePrevImage}
          className="hidden sm:flex absolute z-20 left-2 sm:left-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 items-center justify-center text-white transition-colors cursor-pointer"
          aria-label="Previous angle"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleNextImage}
          className="hidden sm:flex absolute z-20 right-2 sm:right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 items-center justify-center text-white transition-colors cursor-pointer"
          aria-label="Next angle"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-1 z-20">
          {angles.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex(idx);
              }}
              className={cn(
                "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300",
                activeImageIndex === idx ? "bg-[#2E7D32] w-3 sm:w-4" : "bg-white/45 hover:bg-white/70"
              )}
              aria-label={`Go to angle ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Content Panel — one font family, 16px padding, 12px section gaps */}
      <div className="flex-1 p-4 flex flex-col gap-3 font-sans text-[#111827]">
        <div className="flex flex-col gap-3">
          {/* Header row — left: brand•year + model(+variant); right: price + EMI.
              align-items:flex-start keeps the two blocks top-aligned. */}
          <div className="flex justify-between items-start gap-3 min-w-0">
            {/* Left cluster */}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase text-[#6B7280] tracking-[0.05em] truncate">
                {car.brand} • {car.year}
              </p>
              <h3
                title={`${car.brand} ${car.model}`}
                className="mt-0.5 text-[20px] font-bold leading-tight tracking-tight text-[#111827] line-clamp-2 group-hover:text-[#2E7D32] transition-colors"
              >
                {car.model}
                {car.variant ? (
                  <span className="ml-1.5 text-[14px] font-medium text-[#6B7280] align-baseline">
                    {car.variant}
                  </span>
                ) : null}
              </h3>
            </div>
            {/* Right cluster — price + EMI, right-aligned */}
            <div className="text-right shrink-0">
              <span className="block text-[22px] font-bold text-[#2E7D32] leading-none tracking-tight whitespace-nowrap tabular-nums">
                {formattedPrice}
              </span>
              <span className="block mt-1 text-[12px] font-medium text-[#6B7280] whitespace-nowrap tabular-nums">
                EMI {formattedEmi}/mo
              </span>
            </div>
          </div>

          {/* Trust row — only the 1stMark certification pill (location moved
              into the specs grid below so it appears exactly once). */}
          {car.certified && (
            <div className="flex items-center min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 rounded-full px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> 1stMark Certified
              </span>
            </div>
          )}

          {/* Specs — 2-column grid so the 5 facts never wrap unevenly.
              Uniform icon (16px, green) + value (14px, gray), nowrap. */}
          <div
            className="grid grid-cols-2 text-left min-w-0"
            style={{ gap: "10px 12px" }}
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-4 w-4 text-[#2E7D32] shrink-0" />
                  <span className="text-[14px] font-medium text-[#6B7280] whitespace-nowrap truncate">
                    {stat.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Panel — Details + Test Drive share an equal-width 48px row,
            full-width WhatsApp below (no repeated price). Consistent height. */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 mt-auto">
          <Button
            type="button"
            onClick={() => {
              if (onViewDetails) { onViewDetails(car.id); return; }
              if (typeof window !== "undefined") {
                window.location.href = `/cars/${car.id}`;
              }
            }}
            className="h-12 rounded-xl bg-[#111827] text-white hover:bg-[#2E7D32] font-bold uppercase tracking-wider text-[12px] shadow-sm transition-colors"
          >
            Details
          </Button>
          <button
            type="button"
            onClick={handleTestDrive}
            aria-label={`Book test drive for ${car.brand} ${car.model}`}
            className="h-12 rounded-xl bg-[#2E7D32] text-white hover:bg-[#25632a] font-bold uppercase tracking-wider text-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-[#2E7D32]/20"
          >
            <CalendarCheck className="h-4 w-4 shrink-0" />
            Test Drive
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            aria-label={`Chat on WhatsApp about ${car.brand} ${car.model}`}
            title={`Chat on WhatsApp about ${car.brand} ${car.model}`}
            className="col-span-2 h-12 rounded-xl bg-[#25D366]/10 text-[#0d7a3f] hover:bg-[#25D366] hover:text-white font-bold text-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#25D366]/25"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            WhatsApp Us
          </button>
        </div>
      </div>
    </div>
  );
}
