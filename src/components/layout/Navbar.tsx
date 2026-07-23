import * as React from "react";
import { Menu, X, Car, Heart, Search, ChevronRight, User, MapPin, Check } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";

interface NavbarProps {
  savedCount?: number;
  onSavedClick?: () => void;
  onAuthClick?: (mode: "login" | "register") => void;
  onSearchClick?: () => void;
  currentView?: "home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards" | "firstmark_certification" | "custom_page" | "error_404" | "error_500";
  onViewChange?: (view: any, carId?: string) => void;
  currentUser?: any;
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
  onLogout,
  selectedCity,
  onCityChange,
}: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
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
        setCustomPages(data);
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
    view: "home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards" | "firstmark_certification";
    href: string;
    isSpecial?: boolean;
    requiresAuth?: boolean;
  }[] = [
    { label: "Buy Cars", view: "buy_cars" as const, href: "/buy-cars" },
    { label: "Sell Car", view: "sell_car" as const, href: "/sell-car" },
    { label: "1stMark Certification", view: "firstmark_certification" as const, href: "/certification" },
  ];

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
                    <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-[#2E7D32]/60 uppercase -mt-0.5 sm:-mt-1">
                      {settings.brandSlogan || "Premium Selection"}
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
                    <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-[#2E7D32]/60 uppercase -mt-0.5 sm:-mt-1">
                      {settings.brandSlogan || "Premium Selection"}
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
              {customPages.filter((page) => !page.is_footer).map((page) => (
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
                aria-label="Search Catalog"
                onClick={onSearchClick}
                className="p-2.5 rounded-full text-[#2E7D32] hover:bg-[#2E7D32]/5 transition-colors duration-200 cursor-pointer"
              >
                <Search className="h-4.5 w-4.5" />
              </button>

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
                className="bg-[#2E7D32]/5 hover:bg-[#2E7D32]/10 border border-[#2E7D32]/15 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider px-3.5 py-2 flex items-center gap-2 cursor-pointer transition-all shadow-2xs group"
                title="Select Gujarat City Hub"
              >
                <MapPin className="h-4 w-4 text-[#2E7D32] shrink-0" />
                <span>{selectedCity === "All Cities" || !selectedCity ? "📍 All Gujarat" : selectedCity}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#2E7D32]/70 rotate-90 ml-0.5 group-hover:translate-y-0.5 transition-transform" />
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1" />

              {currentUser ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewChange?.("role_dashboards")}
                    className="text-xs font-black uppercase tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 hover:bg-[#2E7D32]/25 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    <span>{currentUser.name.split(" ")[0]} ({currentUser.role})</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="text-rose-600 hover:bg-rose-50 font-bold uppercase tracking-wider text-xs"
                  >
                    Logout
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Mobile Actions Header */}
            <div className="flex items-center space-x-3 lg:hidden">
              <button
                aria-label="Search"
                onClick={onSearchClick}
                className="p-2 rounded-full hover:bg-muted text-foreground cursor-pointer"
              >
                <Search className="h-4.5 w-4.5" />
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
            {customPages.filter((page) => !page.is_footer).map((page) => (
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
        <div className="border-t border-slate-100 pt-6 flex flex-col space-y-4">
          {/* Mobile City Selector */}
          <div className="px-4 mb-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Operational Region (Gujarat Only)
            </label>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCityModalOpen(true);
              }}
              className="w-full bg-[#2E7D32]/5 hover:bg-[#2E7D32]/10 border border-[#2E7D32]/15 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider px-4 py-3 flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#2E7D32] shrink-0" />
                <span>{selectedCity === "All Cities" || !selectedCity ? "📍 All Gujarat" : selectedCity}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#2E7D32]/70 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-between px-4">
            <button
              onClick={() => {
                setIsOpen(false);
                onSavedClick?.();
              }}
              className="text-sm font-bold text-[#2E7D32] flex items-center hover:underline"
            >
              <Heart className="h-4 w-4 mr-2 fill-primary/10" /> Saved Cars
            </button>
            {savedCount > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {savedCount} {savedCount === 1 ? 'Car' : 'Cars'}
              </span>
            )}
          </div>

          {currentUser && (
            <div className="grid grid-cols-2 gap-3 px-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  onViewChange?.("role_dashboards");
                }}
                className="w-full text-[10px] font-black uppercase tracking-wider h-10 rounded-xl"
              >
                Dashboard
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  onLogout?.();
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider h-10 rounded-xl shadow-xs"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Custom City Selector Popover Modal */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Select Operational Region</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">1stCars Certified Hubs (Gujarat)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { id: "All Cities", label: "📍 All Gujarat", desc: "View certified fleet across all hubs in Gujarat" },
                { id: "Surat", label: "Surat", desc: "Main Flagship Experience Center & Hub" },
                { id: "Bharuch", label: "Bharuch", desc: "Highway Express Depot & Inspection Center" },
                { id: "Vadodara", label: "Vadodara", desc: "Alkapuri Luxury Collection Outlet" },
                { id: "Vapi", label: "Vapi", desc: "South Gujarat Collection Hub" },
              ].map((city) => {
                const isSelected = (selectedCity || "All Cities") === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onCityChange?.(city.id);
                      setIsCityModalOpen(false);
                      if (onViewChange && currentView !== "buy_cars" && currentView !== "car_details") {
                        onViewChange("buy_cars");
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                      isSelected
                        ? "bg-[#2E7D32]/10 border-[#2E7D32] text-[#2E7D32] shadow-xs"
                        : "bg-slate-50 hover:bg-emerald-50/60 border-slate-200/80 text-slate-800 hover:border-emerald-200"
                    )}
                  >
                    <div>
                      <p className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                        {city.label}
                      </p>
                      <p className={cn("text-[10px] font-semibold mt-0.5", isSelected ? "text-[#2E7D32]/80" : "text-slate-400")}>
                        {city.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-[#2E7D32] text-white shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <Button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs uppercase tracking-wider h-11 rounded-xl cursor-pointer shadow-md shadow-[#2E7D32]/20"
              >
                Apply Location Filter
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
