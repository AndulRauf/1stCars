import * as React from "react";
import { Heart, ShieldCheck, Fuel, Gauge, Award, MapPin, Calendar, User, ChevronLeft, ChevronRight, Eye, Share2 } from "lucide-react";
import { Car } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { cn } from "@/src/lib/utils";
import { toast } from "@/src/lib/toast";

interface CarCardProps {
  key?: string | number;
  car: Car;
  isSaved?: boolean;
  onSaveToggle?: (id: string, model: string) => void;
  onViewDetails?: (id: string) => void;
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
      text: `${car.brand} ${car.model} — Three-Quarter Front View`
    },
    {
      title: "Rear & Aggressive Lines",
      bgClass: `bg-gradient-to-tr ${gradient}`,
      text: `${car.brand} ${car.model} — Sleek Rear Fastback View`
    },
    {
      title: "Luxury Cabin Interior",
      bgClass: `bg-gradient-to-b ${gradient}`,
      text: `${car.brand} ${car.model} — Cockpit & Premium Infotainment`
    }
  ];
};

const getCarPhotos = (car: Car) => {
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

export function CarCard({
  car,
  isSaved = false,
  onSaveToggle,
  onViewDetails,
  isListView = false,
}: CarCardProps) {
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const angles = (getCarPhotos(car) || getCarAngleImages(car)) as Array<{ title: string; text: string; url?: string; bgClass?: string }>;

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % angles.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + angles.length) % angles.length);
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
  }).format(car.emi);

  // Stats Grid items
  const stats = [
    { label: "Year", value: car.year, icon: Calendar },
    { label: "Fuel", value: car.fuel, icon: Fuel },
    { label: "Transmission", value: car.transmission, icon: Award },
    { label: "KM Driven", value: `${(car.mileage * 1.609).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} km`, icon: Gauge },
    { label: "Owner", value: car.owners === 1 ? "1st Owner" : `${car.owners}nd Owner`, icon: User },
    { label: "City", value: car.cities?.[0] || "Los Angeles", icon: MapPin },
  ];

  return (
    <div
      id={`car-card-${car.id}`}
      className={cn(
        "group relative bg-white border border-[#2E7D32]/10 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-[#2E7D32]/5 hover:-translate-y-1 flex flex-col",
        isListView ? "md:flex-row md:min-h-[290px]" : "w-full"
      )}
    >
      {/* Premium Image Gallery Panel */}
      <div className={cn(
        "relative overflow-hidden flex-shrink-0 select-none",
        isListView ? "w-full md:w-2/5 min-h-[220px]" : "w-full h-60"
      )}>
        {/* Dynamic Angle Gradient Background */}
        <div 
          className={cn(
            "w-full h-full flex flex-col justify-between p-5 text-white transition-all duration-500",
            !angles[activeImageIndex].url && angles[activeImageIndex].bgClass
          )}
          style={angles[activeImageIndex].url ? {
            backgroundImage: `url(${angles[activeImageIndex].url})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : undefined}
        >
          {/* Top Bar inside Gallery */}
          <div className="flex items-center justify-between z-10 w-full">
            {car.certified ? (
              <Badge className="bg-[#2E7D32] hover:bg-[#2E7D32] text-white border-none px-3 py-1 text-[10px] font-bold tracking-widest uppercase shadow-md shadow-[#2E7D32]/30 flex items-center gap-1.5 animate-pulse">
                <ShieldCheck className="h-3.5 w-3.5 fill-white/10" /> 1stMark Certified
              </Badge>
            ) : <div />}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}/cars/${car.id}`;
                  if (navigator.share) {
                    navigator.share({
                      title: `${car.brand} ${car.model} | 1stCars`,
                      text: `Check out this 1stCars Certified ${car.year} ${car.brand} ${car.model}!`,
                      url: shareUrl
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      toast.success(`Copied share link for ${car.brand} ${car.model}!`);
                    }).catch(() => {});
                  }
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/30 hover:bg-[#2E7D32] border border-white/20 text-white backdrop-blur-md transition-all duration-300 cursor-pointer shadow-md"
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
                  "w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 border cursor-pointer shadow-md",
                  isSaved 
                    ? "bg-rose-500 border-rose-400 text-white" 
                    : "bg-black/30 hover:bg-black/50 border-white/20 text-white"
                )}
                aria-label="Add to wishlist"
              >
                <Heart className={cn("h-4.5 w-4.5", isSaved && "fill-current")} />
              </button>
            </div>
          </div>

          {/* Aesthetic Mock Vector Vehicle Silhouette Overlay */}
          {!angles[activeImageIndex].url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none p-8 select-none">
              <svg viewBox="0 0 100 50" className="w-10/12 text-white fill-current">
                <path d="M15 35 L12 35 C10 35 8 33 8 31 L8 25 C8 22 10 20 12 18 L25 10 C28 8 32 7 35 7 L65 7 C69 7 73 9 75 12 L85 22 C88 24 90 27 90 31 L90 35 C88 35 86 35 85 35 C82 32 78 32 75 35 C72 38 75 42 78 42 C81 42 84 39 85 37 L90 37 L92 37 C94 37 95 36 95 34 L95 28 C95 24 93 21 90 19 L82 10 C79 6 74 4 69 4 L31 4 C26 4 21 6 18 10 L8 21 C6 23 5 26 5 29 L5 34 C5 36 6 37 8 37 L15 37 C16 39 19 42 22 42 C25 42 28 38 25 35 Z" />
                <circle cx="22" cy="35" r="5" />
                <circle cx="78" cy="35" r="5" />
              </svg>
            </div>
          )}

          {/* Label indicating Angle */}
          <div className="z-10 mt-auto text-left bg-black/20 p-2 rounded-xl backdrop-blur-xs border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2E7D32]/40 text-emerald-400">
              {angles[activeImageIndex].title}
            </p>
            <p className="text-[11px] font-medium text-slate-200 line-clamp-1">
              {angles[activeImageIndex].text}
            </p>
          </div>
        </div>

        {/* Gallery Navigation Controls */}
        <button
          onClick={handlePrevImage}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
          aria-label="Previous angle"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={handleNextImage}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
          aria-label="Next angle"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
          {angles.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex(idx);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                activeImageIndex === idx ? "bg-[#2E7D32] w-4" : "bg-white/45 hover:bg-white/70"
              )}
              aria-label={`Go to angle ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Content Panel */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          {/* Header & Title */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                {car.brand}
              </p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-[#2E7D32] transition-colors">
                {car.model}
              </h3>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-black text-[#2E7D32] tracking-tight">
                {formattedPrice}
              </span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1">
                EMI from {formattedEmi}/mo
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-4" />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-y-3.5 gap-x-2 text-left my-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#2E7D32]/5 text-[#2E7D32]">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                      {stat.label}
                    </span>
                    <span className="block text-xs font-extrabold text-slate-800 tracking-tight truncate">
                      {stat.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Panel */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(car.id)}
            className="flex-1 hover:bg-[#2E7D32]/5 hover:text-primary text-[#2E7D32] border-[#2E7D32]/20 font-bold uppercase tracking-wider text-[11px] h-10 rounded-xl"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Quick View
          </Button>
          <Button
            size="sm"
            onClick={() => onViewDetails?.(car.id)}
            className="flex-1 bg-[#2E7D32] text-white hover:bg-[#25632a] font-bold uppercase tracking-wider text-[11px] h-10 rounded-xl shadow-md shadow-[#2E7D32]/10"
          >
            Details & Book
          </Button>
        </div>
      </div>
    </div>
  );
}
