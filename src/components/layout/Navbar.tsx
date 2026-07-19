import * as React from "react";
import { Menu, X, Car, Heart, Search, ChevronRight, User, MapPin } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

interface NavbarProps {
  savedCount?: number;
  onSavedClick?: () => void;
  onAuthClick?: (mode: "login" | "register") => void;
  onSearchClick?: () => void;
  currentView?: "home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards";
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
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [settings, setSettings] = React.useState({
    logoUrl: "🏎️ 1stCars",
    logoSize: 150,
    brandSlogan: "Premium Selection"
  });

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") || url.includes("supabase-storage") || url.match(/\.(jpeg|jpg|gif|png|svg|webp)/i) !== null;
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    // Load dynamic brand settings
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
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
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
    };
    window.addEventListener("1stcars_settings_updated", handleReloadSettings);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("1stcars_settings_updated", handleReloadSettings);
    };
  }, []);

  const navLinks: {
    label: string;
    view: "home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards";
    href: string;
    isSpecial?: boolean;
    requiresAuth?: boolean;
  }[] = [
    { label: "Buy Cars", view: "buy_cars" as const, href: "#buy-cars" },
    { label: "Sell Car", view: "sell_car" as const, href: "#sell-car" },
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
                <img 
                  src={settings.logoUrl} 
                  alt={settings.brandSlogan || "Logo"} 
                  style={{ width: `${settings.logoSize || 150}px` }} 
                  className="object-contain h-10 select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:rotate-45 shadow-lg shadow-[#2E7D32]/20">
                    <div className="w-4 h-4 border-2 border-white rotate-45"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tighter text-[#2E7D32] flex items-center">
                      {settings.logoUrl || "1stCars"}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-[#2E7D32]/60 uppercase -mt-1.5">
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
              <div className="relative flex items-center">
                <MapPin className="h-4 w-4 text-[#2E7D32] absolute left-3 pointer-events-none" />
                <select
                  value={selectedCity || "All Cities"}
                  onChange={(e) => {
                    onCityChange?.(e.target.value);
                    if (onViewChange && currentView !== "buy_cars" && currentView !== "car_details") {
                      onViewChange("buy_cars");
                    }
                  }}
                  className="bg-[#2E7D32]/5 border border-[#2E7D32]/10 rounded-xl text-xs font-black text-[#2E7D32] uppercase tracking-wider pl-9 pr-8 py-2.5 outline-none cursor-pointer hover:bg-[#2E7D32]/10 transition-all appearance-none"
                >
                  <option value="All Cities">📍 All Gujarat</option>
                  <option value="Surat">Surat</option>
                  <option value="Bharuch">Bharuch</option>
                  <option value="Vadodara">Vadodara</option>
                  <option value="Vapi">Vapi</option>
                </select>
                <div className="pointer-events-none absolute right-3 flex items-center text-[#2E7D32]">
                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>

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
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAuthClick?.("login")}
                    className="hidden xl:inline-flex text-[#2E7D32]/85 hover:bg-[#2E7D32]/5 hover:text-primary font-bold uppercase tracking-wider text-xs"
                  >
                    <User className="h-4 w-4 mr-2" /> Login
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => onAuthClick?.("register")}
                    className="bg-primary text-white font-bold shadow-lg shadow-[#2E7D32]/20 hover:bg-[#25632a] uppercase tracking-wider text-xs"
                  >
                    Register
                  </Button>
                </>
              )}
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
                <img 
                  src={settings.logoUrl} 
                  alt={settings.brandSlogan || "Logo"} 
                  style={{ width: `${Math.min(settings.logoSize || 150, 120)}px` }} 
                  className="object-contain h-8 select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
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
          </div>
        </div>

        {/* Mobile Quick Action Buttons footer */}
        <div className="border-t border-slate-100 pt-6 flex flex-col space-y-4">
          {/* Mobile City Selector */}
          <div className="px-4 mb-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Operational Region (Gujarat Only)
            </label>
            <div className="relative flex items-center w-full">
              <MapPin className="h-4 w-4 text-[#2E7D32] absolute left-3 pointer-events-none" />
              <select
                value={selectedCity || "All Cities"}
                onChange={(e) => {
                  onCityChange?.(e.target.value);
                  setIsOpen(false);
                  if (onViewChange && currentView !== "buy_cars" && currentView !== "car_details") {
                    onViewChange("buy_cars");
                  }
                }}
                className="w-full bg-[#2E7D32]/5 border border-[#2E7D32]/10 rounded-xl text-xs font-black text-[#2E7D32] uppercase tracking-wider pl-9 pr-8 py-3 outline-none cursor-pointer appearance-none"
              >
                <option value="All Cities">📍 All Gujarat</option>
                <option value="Surat">Surat</option>
                <option value="Bharuch">Bharuch</option>
                <option value="Vadodara">Vadodara</option>
                <option value="Vapi">Vapi</option>
              </select>
              <div className="pointer-events-none absolute right-3 flex items-center text-[#2E7D32]">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                onAuthClick?.("login");
              }}
              className="w-full text-xs font-bold uppercase tracking-wider"
            >
              Login
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                onAuthClick?.("register");
              }}
              className="w-full bg-primary text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#2E7D32]/20 hover:bg-[#25632a]"
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
