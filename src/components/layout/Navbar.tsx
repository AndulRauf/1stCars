import * as React from "react";
import { Menu, X, Car, Heart, Search, ChevronRight, User, MapPin, Check, LocateFixed, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn, isHiddenPage } from "@/src/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";

interface NavbarProps {
  savedCount?: number;
  onSavedClick?: () => void;
  onAuthClick?: (mode: "login" | "register") => void;
  onSearchClick?: () => void;
  currentView?: "home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards" | "firstmark_certification" | "custom_page" | "about" | "error_404" | "error_500";
  onViewChange?: (view: any, carId?: string) => void;
  currentUser?: any;
  onLoginSuccess?: (user: any) => void;
  onLogout?: () => void;
  selectedCity?: string;
  onCityChange?: (city: string) => void;
}

export function Navbar({
  savedCount = 0,
  onSavedClick,
  onAuthClick,
  onSearchClick,
  currentView = "home",
  onViewChange,
  currentUser,
  onLoginSuccess,
  onLogout,
  selectedCity,
  onCityChange,
}: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = React.useState(false);
  const [citySearchTerm, setCitySearchTerm] = React.useState("");
  const [isScrolled, setIsScrolled] = React.useState(false);

  const CITY_LANDMARKS = [
    {
      id: "Surat",
      label: "Surat",
      svg: (
        <svg className="w-6 h-6 stroke-slate-700 fill-none" viewBox="0 0 64 64" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 52h40M16 52V30l6-4 6 4v22M36 52V30l6-4 6 4v22M22 52v-8a6 6 0 0112 0v8M18 20h8v6h-8zM38 20h8v6h-8zM20 20l2-6h4l2 6M40 20l2-6h4l2 6M8 38h4v14H8zM52 38h4v14h-4z" />
        </svg>
      )
    },
    {
      id: "Bharuch",
      label: "Bharuch",
      svg: (
        <svg className="w-6 h-6 stroke-slate-700 fill-none" viewBox="0 0 64 64" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 44c8-4 16-4 24 0s16 4 24 0M8 50c8-4 16-4 24 0s16 4 24 0M10 40V24M24 40V20M38 40V20M52 40V24M10 24s7-8 14 0 14 0 14 0 14-8 14 0M6 24h52" />
        </svg>
      )
    },
    {
      id: "Vadodara",
      label: "Vadodara",
      svg: (
        <svg className="w-6 h-6 stroke-slate-700 fill-none" viewBox="0 0 64 64" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M32 12c-6 0-10 6-10 12h20c0-6-4-12-10-12zM32 8v4M12 52h40M16 52V36M24 52V36M32 52V36M40 52V36M48 52V36M12 36h40M22 24h20" />
        </svg>
      )
    },
    {
      id: "Vapi",
      label: "Vapi",
      svg: (
        <svg className="w-6 h-6 stroke-slate-700 fill-none" viewBox="0 0 64 64" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 52h40M18 52V22l14-6 14 6v30M26 52v-12a6 6 0 0112 0v12M22 28h4v4h-4zM38 28h4v4h-4zM22 36h4v4h-4zM38 36h4v4h-4z" />
        </svg>
      )
    },
    {
      id: "All Cities",
      label: "All Gujarat",
      svg: (
        <svg className="w-6 h-6 stroke-slate-700 fill-none" viewBox="0 0 64 64" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 52h44M14 52V34l8-6 8 6v18M34 52V28l10-8 10 8v24M28 20l4-8 4 8-8 0z" />
        </svg>
      )
    }
  ];

  const filteredCityItems = CITY_LANDMARKS.filter(city => 
    city.label.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
    city.id.toLowerCase().includes(citySearchTerm.toLowerCase())
  );
  const [settings, setSettings] = React.useState({
    logoUrl: "/logo.svg",
    logoSize: 150,
    brandSlogan: "Premium Selection"
  });

  const [customPages, setCustomPages] = React.useState<any[]>([]);

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return url.startsWith("data:image/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") || url.includes("supabase-storage") || url.match(/\.(jpeg|jpg|gif|png|svg|webp)/i) !== null;
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    const loadCustomPages = async () => {
      const { data } = await supabase.from("pages").select();
      if (data) {
        setCustomPages(data.filter((p: any) => !isHiddenPage(p)));
      }
    };
    loadCustomPages();

    // Load dynamic brand settings
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.logoUrl || parsed.logoUrl === "🏎️ 1stCars" || parsed.logoUrl === "⭐") {
            parsed.logoUrl = "/logo.svg";
          }
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse website settings in Navbar", e);
        }
      }
    }

    // Live update listener for changes from Admin CMS
    const handleReloadSettings = () => {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.logoUrl || parsed.logoUrl === "🏎️ 1stCars" || parsed.logoUrl === "⭐") {
            parsed.logoUrl = "/logo.svg";
          }
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
      loadCustomPages();
    };
    window.addEventListener("1stcars_settings_updated", handleReloadSettings);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("1stcars_settings_updated", handleReloadSettings);
    };
  }, []);

  const navLinks: {
    label: string;
    view: "home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards" | "firstmark_certification" | "about";
    href: string;
    isSpecial?: boolean;
    requiresAuth?: boolean;
  }[] = [
    { label: "Buy Cars", view: "buy_cars" as const, href: "/buy-cars" },
    { label: "Sell Car", view: "sell_car" as const, href: "/sell-car" },
    { label: "1stMark Certification", view: "firstmark_certification" as const, href: "/certification" },
    { label: "About Us", view: "about" as const, href: "/about" },
  ];

  // "about us" is always hidden from the nav menu because the dedicated /about
  // page now covers it — the legacy CMS page remains usable via the footer /
  // admin but never shows in the header.
  const hiddenNavPageLabels = new Set(["about us"]);
  const sectionLinkLabels = new Set(hiddenNavPageLabels);
  const isDuplicateOfSectionLink = (title: string) => {
    const t = title.toLowerCase();
    return sectionLinkLabels.has(t) || sectionLinkLabels.has(t.endsWith("s") ? t.slice(0, -1) : t);
  };
  const visibleCustomPages = customPages.filter(
    (page) => !page.is_footer && !isDuplicateOfSectionLink(page.title || "")
  );

  const handleLinkClick = (e: React.MouseEvent, view: any, href: string) => {
    e.preventDefault();
    if (view === "sell_car" || view === "role_dashboards") {
      if (view === "role_dashboards" && !currentUser) {
        onAuthClick?.("login");
        return;
      }
      onViewChange?.(view);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (onViewChange) {
      onViewChange(view);
      
      // If it's a subsection on home, scroll to it
      if (view === "home" && href.startsWith("#") && href !== "#") {
        setTimeout(() => {
          const el = document.getElementById(href.substring(1));
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full",
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg shadow-[#2E7D32]/5 border-b border-[#2E7D32]/10 py-4"
            : "bg-[#F8F6F0]/80 backdrop-blur-md border-b border-[#2E7D32]/10 py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <a 
              href="/" 
              onClick={(e) => {
                e.preventDefault();
                onViewChange?.("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center space-x-3 group"
            >
              {isImageUrl(settings.logoUrl) ? (
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.brandSlogan || "1stCars Logo"} 
                    className="object-contain h-8 sm:h-10 w-8 sm:w-10 rounded-lg select-none pointer-events-none border border-slate-100 bg-white shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.endsWith("/logo.svg")) {
                        img.src = "/logo.svg";
                      }
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#2E7D32] flex items-center leading-none">
                      1stCars
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:rotate-45 shadow-lg shadow-[#2E7D32]/20 shrink-0">
                    <div className="w-4 h-4 border-2 border-white rotate-45"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#2E7D32] flex items-center leading-none">
                      {settings.logoUrl || "1stCars"}
                    </span>
                  </div>
                </>
              )}
            </a>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navLinks.filter(l => !l.requiresAuth || currentUser).map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.view, link.href)}
                  className={cn(
                    "text-[13px] font-bold uppercase tracking-widest transition-colors duration-200 relative py-1",
                    link.isSpecial 
                      ? "bg-[#2E7D32]/10 text-[#2E7D32] px-3 py-1 rounded-full hover:bg-[#2E7D32] hover:text-white"
                      : "text-[#2E7D32]/75 hover:text-[#2E7D32] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#2E7D32] after:transition-all after:duration-300 hover:after:w-full",
                    currentView === link.view && !link.isSpecial && "text-[#2E7D32] after:w-full",
                    currentView === link.view && link.isSpecial && "bg-[#2E7D32] text-white"
                  )}
                >
                  {link.label}
                </a>
              ))}
              {visibleCustomPages.map((page) => (
                <a
                  key={page.id}
                  href={`#page-${page.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onViewChange?.("custom_page", page.id);
                  }}
                  className={cn(
                    "text-[13px] font-bold uppercase tracking-widest transition-colors duration-200 relative py-1 text-[#2E7D32]/75 hover:text-[#2E7D32] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#2E7D32] after:transition-all after:duration-300 hover:after:w-full",
                    currentView === "custom_page" && "text-[#2E7D32] after:w-full"
                  )}
                >
                  {page.title}
                </a>
              ))}
            </div>

            {/* Quick Actions (Desktop) */}
            <div className="hidden lg:flex items-center space-x-4">
              <button
                aria-label="Saved Cars"
                onClick={onSavedClick}
                className="p-2.5 rounded-full text-[#2E7D32] hover:bg-[#2E7D32]/5 transition-colors duration-200 relative cursor-pointer"
              >
                <Heart className="h-4.5 w-4.5" />
                {savedCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#2E7D32] text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-xs">
                    {savedCount}
                  </span>
                )}
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1" />

              {/* City Filter Menu on Header */}
              <button
                type="button"
                onClick={() => setIsCityModalOpen(true)}
                className="bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 border border-[#2E7D32]/25 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider px-3.5 py-2 flex items-center gap-2 cursor-pointer transition-all shadow-2xs group"
                title="Select City Hub"
              >
                <MapPin className="h-4 w-4 text-[#2E7D32] shrink-0" />
                <span>{selectedCity === "All Cities" ? "📍 All Gujarat" : (selectedCity || "Surat")}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#2E7D32]/70 rotate-90 ml-0.5 group-hover:translate-y-0.5 transition-transform" />
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1" />

              {currentUser ? (
                <div className="flex items-center space-x-2">
                  {currentUser.role === "Admin" && (
                    <button
                      onClick={() => onViewChange?.("role_dashboards")}
                      className="text-xs font-black uppercase tracking-widest text-white bg-[#2E7D32] hover:bg-[#25632a] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#2E7D32]/20"
                      title="Open Admin Panel (https://1stcars.in/admin)"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  <button
                    onClick={() => onViewChange?.("role_dashboards")}
                    className="text-xs font-black uppercase tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 hover:bg-[#2E7D32]/25 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    <span>{currentUser.name.split(" ")[0]} ({currentUser.role})</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="text-rose-600 hover:bg-rose-50 font-bold uppercase tracking-wider text-xs px-2"
                  >
                    Logout
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Mobile Actions Header */}
            <div className="flex items-center space-x-2 lg:hidden">
              <button
                type="button"
                onClick={() => setIsCityModalOpen(true)}
                className="bg-[#2E7D32]/10 border border-[#2E7D32]/20 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                title="Select City Hub"
              >
                <MapPin className="h-3.5 w-3.5 text-[#2E7D32] shrink-0" />
                <span className="text-[11px] font-extrabold">{selectedCity === "All Cities" ? "All Gujarat" : (selectedCity || "Surat")}</span>
                <ChevronRight className="h-3 w-3 text-[#2E7D32]/70 rotate-90" />
              </button>

              <button
                aria-label="Toggle Mobile Menu"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-md hover:bg-muted text-foreground focus:outline-hidden cursor-pointer"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          "fixed top-0 bottom-0 right-0 z-50 w-full max-w-sm bg-white p-6 shadow-2xl lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col justify-between",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div>
          <div className="flex items-center justify-between mb-8">
            <a href="/" className="flex items-center space-x-2.5">
              {isImageUrl(settings.logoUrl) ? (
                <div className="flex items-center space-x-2.5">
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.brandSlogan || "Logo"} 
                    className="object-contain h-8 w-8 rounded-lg select-none pointer-events-none border border-slate-100 bg-white shadow-xs"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.endsWith("/logo.svg")) {
                        img.src = "/logo.svg";
                      }
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-lg font-black tracking-tighter text-[#2E7D32] leading-none">
                      1stCars
                    </span>
                    <span className="text-[8px] font-bold tracking-widest text-[#2E7D32]/60 uppercase">
                      {settings.brandSlogan || "Premium Selection"}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-6 h-6 bg-[#2E7D32] rounded flex items-center justify-center shadow-md shadow-[#2E7D32]/20">
                    <div className="w-3 h-3 border-2 border-white rotate-45"></div>
                  </div>
                  <span className="text-xl font-black tracking-tighter text-[#2E7D32]">{settings.logoUrl || "1stCars"}</span>
                </>
              )}
            </a>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-muted text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Links */}
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  setIsOpen(false);
                  handleLinkClick(e, link.view, link.href);
                }}
                className={cn(
                  "flex items-center justify-between text-sm font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition-colors",
                  currentView === link.view
                    ? "bg-[#2E7D32] text-white"
                    : "hover:bg-[#2E7D32]/5 hover:text-primary text-slate-800"
                )}
              >
                {link.label}
                <ChevronRight className={cn("h-4 w-4", currentView === link.view ? "text-white" : "text-slate-400")} />
              </a>
            ))}
            {visibleCustomPages.map((page) => (
              <a
                key={page.id}
                href={`#page-${page.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  onViewChange?.("custom_page", page.id);
                }}
                className={cn(
                  "flex items-center justify-between text-sm font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition-colors",
                  currentView === "custom_page"
                    ? "bg-[#2E7D32] text-white"
                    : "hover:bg-[#2E7D32]/5 hover:text-primary text-slate-800"
                )}
              >
                {page.title}
                <ChevronRight className={cn("h-4 w-4", currentView === "custom_page" ? "text-white" : "text-slate-400")} />
              </a>
            ))}
          </div>
        </div>

        {/* Mobile Quick Action Buttons footer */}
        <div className="border-t border-slate-100 pt-6 flex flex-col space-y-3">
          {/* Mobile City Selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Operational Region (Gujarat Only)
            </label>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCityModalOpen(true);
              }}
              className="w-full h-12 bg-[#2E7D32]/5 hover:bg-[#2E7D32]/10 border border-[#2E7D32]/15 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider px-4 flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#2E7D32] shrink-0" />
                <span>{selectedCity === "All Cities" || !selectedCity ? "📍 All Gujarat" : selectedCity}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#2E7D32]/70 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Saved Cars */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSavedClick?.();
            }}
            className="w-full h-12 bg-[#2E7D32]/5 hover:bg-[#2E7D32]/10 border border-[#2E7D32]/15 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider px-4 flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="h-4 w-4 text-[#2E7D32] shrink-0 fill-[#2E7D32]/10" />
              <span>Saved Cars</span>
            </div>
            {savedCount > 0 && (
              <span className="bg-[#2E7D32] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                {savedCount} {savedCount === 1 ? "Car" : "Cars"}
              </span>
            )}
          </button>

          {currentUser && (
            <div className="grid grid-cols-2 gap-3">
              {currentUser.role === "Admin" && (
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    onViewChange?.("role_dashboards");
                  }}
                  className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider h-12 rounded-xl shadow-xs"
                >
                  Admin Panel
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  onViewChange?.("role_dashboards");
                }}
                className="w-full text-[10px] font-black uppercase tracking-wider h-12 rounded-xl"
              >
                Dashboard
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  onLogout?.();
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider h-12 rounded-xl shadow-xs"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Custom City Selector Popover Modal (v3cars style) */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
            
            {/* Top Search & Detect Header Area */}
            <div className="bg-[#FFFDF7] p-3.5 rounded-2xl border border-amber-200/80 relative">
              {/* Close Button X */}
              <button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-md transition-all z-10"
                aria-label="Close City Modal"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                {/* Search Input Field */}
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={citySearchTerm}
                    onChange={(e) => setCitySearchTerm(e.target.value)}
                    placeholder="Enter City Name"
                    className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] shadow-2xs"
                  />
                  {citySearchTerm && (
                    <button
                      type="button"
                      onClick={() => setCitySearchTerm("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Detect Button */}
                <button
                  type="button"
                  onClick={() => {
                    onCityChange?.("Surat");
                    setIsCityModalOpen(false);
                  }}
                  className="bg-white border border-slate-200/90 hover:border-[#2E7D32] hover:text-[#2E7D32] text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  <LocateFixed className="h-4 w-4 text-[#2E7D32]" />
                  <span>Detect</span>
                </button>
              </div>
            </div>

            {/* Section Header with Vertical Yellow Bar */}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full inline-block" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                POPULAR CITIES
              </h4>
            </div>

            {/* City Grid Cards with Landmark Line Art */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {filteredCityItems.length > 0 ? (
                filteredCityItems.map((city) => {
                  const isSelected = (selectedCity || "Surat") === city.id;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        onCityChange?.(city.id);
                        setIsCityModalOpen(false);
                      }}
                      className={cn(
                        "p-2 py-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative group min-h-[58px]",
                        isSelected
                          ? "bg-amber-50/70 border-[#2E7D32] ring-2 ring-[#2E7D32]/20 shadow-xs"
                          : "bg-[#FAF9F5] hover:bg-white border-slate-200/80 hover:border-[#2E7D32]/40 shadow-2xs"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-[#2E7D32] text-white">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <div className="h-6 w-full flex items-center justify-center text-slate-700 transition-transform group-hover:scale-105">
                        {city.svg}
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-800 tracking-tight leading-none">
                        {city.label}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-slate-400 font-bold text-xs">
                  No city matches "{citySearchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
