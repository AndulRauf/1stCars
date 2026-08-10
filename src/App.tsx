import * as React from "react";
import { toast } from "@/src/lib/toast";
import { Navbar } from "@/src/components/layout/Navbar";
import { CarCard } from "@/src/components/CarCard";
import { cn } from "@/src/lib/utils";
import { Footer } from "@/src/components/layout/Footer";
import { WhatsAppFloatingButton } from "@/src/components/WhatsAppFloatingButton";
import { Button } from "@/src/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { Input } from "@/src/components/ui/Input";
import { Section } from "@/src/components/ui/Section";
import { 
  Check, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  DollarSign, 
  Search, 
  Heart, 
  Info,
  SlidersHorizontal,
  Mail,
  ChevronRight,
  Gauge,
  Calendar,
  Fuel,
  Star,
  Layers,
  Palette,
  Layout,
  Accessibility,
  CheckCircle2,
  Phone,
  Shield,
  Clock,
  Car as CarIcon,
  ChevronDown,
  Wrench,
  ThumbsUp,
  MapPin,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Sliders
} from "lucide-react";
import { FAMOUS_BRANDS, BUDGET_RANGES } from "@/src/data/cars";
import { Car } from "@/src/types";
import { Profile } from "@/src/lib/db";
import { AuthModal } from "@/src/components/AuthModal";
import { supabase } from "@/src/lib/supabaseClient";
import { parseCurrentUrl, navigateTo, getPageTitle, ViewType } from "@/src/lib/router";
import { maybeAutoSeedDatabase } from "@/src/lib/seeder";
import { useCatalogCars } from "@/src/lib/useCatalogCars";
// ErrorPages is statically imported by ErrorBoundary (it's the crash fallback),
// so it always lives in the main chunk. Import it statically here too to avoid
// a redundant dynamic chunk.
import { Error404Page, Error500Page } from "@/src/components/ErrorPages";


// Route-level views are code-split via React.lazy so the initial bundle only
// ships the home page. Each view (and its heavy deps like AdminCMS or
// react-markdown) is fetched on demand when the user navigates to it.
const BuyCarsView = React.lazy(() => import("@/src/components/BuyCarsView").then(m => ({ default: m.BuyCarsView })));
const CarDetailsView = React.lazy(() => import("@/src/components/CarDetailsView").then(m => ({ default: m.CarDetailsView })));
const SalesDashboardView = React.lazy(() => import("@/src/components/SalesDashboardView").then(m => ({ default: m.SalesDashboardView })));
const SellCarView = React.lazy(() => import("@/src/components/SellCarView").then(m => ({ default: m.SellCarView })));
const RoleDashboards = React.lazy(() => import("@/src/components/RoleDashboards").then(m => ({ default: m.RoleDashboards })));
const FirstMarkCertification = React.lazy(() => import("@/src/components/FirstMarkCertification").then(m => ({ default: m.FirstMarkCertification })));
const CustomPageView = React.lazy(() => import("@/src/components/CustomPageView").then(m => ({ default: m.CustomPageView })));
const AboutUsView = React.lazy(() => import("@/src/components/AboutUsView").then(m => ({ default: m.AboutUsView })));
const FAQView = React.lazy(() => import("@/src/components/FAQView").then(m => ({ default: m.FAQView })));


// Lightweight fallback shown while a lazily-loaded view chunk is downloading.
function ViewLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 rounded-full border-4 border-[#2E7D32]/20 border-t-[#2E7D32] animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading…</p>
    </div>
  );
}


export default function App() {
  // Navigation & interaction states
  const [currentView, setCurrentView] = React.useState<ViewType>("home");
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
  const [activeCarId, setActiveCarId] = React.useState<string>("car-1");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("");
  const [selectedModel, setSelectedModel] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState<string | undefined>(undefined);
  const [savedCars, setSavedCars] = React.useState<string[]>(["car-1", "car-3"]); // pre-saved for delightful onboarding
  const [currentUser, setCurrentUser] = React.useState<Profile | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string>("Surat");

  // Live catalog = static curated list + cars uploaded/published via the CMS
  // (they live in the Supabase "cars" table, so they must be merged in here).
  const catalogCars = useCatalogCars();

  // Keep a stable ref so navigation callbacks (used by many children) can read
  // the latest catalog without changing identity on every inventory refresh.
  const catalogCarsRef = React.useRef(catalogCars);
  catalogCarsRef.current = catalogCars;

  // Central Navigation handler that keeps URL in sync
  const handleNavigate = React.useCallback((
    view: ViewType,
    params?: { carId?: string; pageId?: string; brand?: string; model?: string; variant?: string; city?: string; search?: string },
    options?: { replace?: boolean }
  ) => {
    setCurrentView(view);
    if (params?.carId) setActiveCarId(params.carId);
    if (params?.pageId) setSelectedPageId(params.pageId);
    if (params?.brand !== undefined) setSelectedBrand(params.brand);
    if (params?.model !== undefined) setSelectedModel(params.model);
    if (params?.search !== undefined) setSearchQuery(params.search);

    navigateTo(view, params, options);

    const car = catalogCarsRef.current.find(c => c.id === (params?.carId || activeCarId));
    const carName = car ? `${car.year} ${car.brand} ${car.model}` : undefined;
    document.title = getPageTitle(view, carName);
  }, [activeCarId]);

  // Sync route on mount and browser back/forward (popstate)
  React.useEffect(() => {
    const syncRouteFromUrl = () => {
      const route = parseCurrentUrl();
      setCurrentView(route.view);
      if (route.carId) setActiveCarId(route.carId);
      if (route.pageId) setSelectedPageId(route.pageId);
      if (route.brand) setSelectedBrand(route.brand);
      if (route.model) setSelectedModel(route.model);
      if (route.search) setSearchQuery(route.search);

      const car = catalogCarsRef.current.find(c => c.id === (route.carId || activeCarId));
      const carName = car ? `${car.year} ${car.brand} ${car.model}` : undefined;
      document.title = getPageTitle(route.view, carName);
    };

    syncRouteFromUrl();
    window.addEventListener("popstate", syncRouteFromUrl);
    return () => {
      window.removeEventListener("popstate", syncRouteFromUrl);
    };
  }, []);

  React.useEffect(() => {
    // Listen to Supabase auth events (works with both mock and live Supabase clients)
    let disposed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session?.user) {
        // Cast or shape the Supabase user object into the Profile interface
        const user = session.user;

        // The ROLE lives authoritatively in the profiles table (admins are
        // promoted there via the Supabase Table Editor). user_metadata.role is
        // only the signup default, so fetch the profile to pick up promotions.
        let role: string = user.user_metadata?.role || user.role || "Buyer";
        let name: string = user.user_metadata?.name || user.name || user.email?.split("@")[0] || "User";
        let mobile: string = user.user_metadata?.mobile || user.mobile || "";
        let city: string = user.user_metadata?.city || user.city || "Mumbai";
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, email, mobile, role, city")
            .eq("id", user.id)
            .maybeSingle();
          if (profile) {
            role = profile.role || role;
            name = profile.name || name;
            mobile = profile.mobile || mobile;
            city = profile.city || city;
          }
        } catch (e) {
          // Profile lookup is best-effort; fall back to token metadata.
        }
        if (disposed) return;
        setCurrentUser({
          id: user.id,
          name,
          email: user.email || "",
          mobile,
          role,
          city,
          created_at: user.created_at || new Date().toISOString()
        } as any);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      disposed = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Auto-seed the catalog once per staff member when the real Supabase
  // database is empty, so the marketplace never launches with zero inventory.
  React.useEffect(() => {
    if (currentUser) {
      maybeAutoSeedDatabase(currentUser as any);
    }
  }, [currentUser]);

  // Dynamic website configuration states from Admin CMS settings
  const [websiteSettings, setWebsiteSettings] = React.useState({
    logoUrl: "/logo.png",
    logoSize: 150,
    favicon: "⭐",
    primaryColor: "#2E7D32",
    accentColor: "#FAF9F6",
    buttonColor: "#2E7D32",
    fontFamily: "Inter",
    heroTitle: "Certified Cars",
          heroSubtitle: "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
    showPopularBrands: true,
    showLatestArrivals: true,
    showHowItWorks: true,
    showTestimonials: true,
    footerText: "© 2026 1stCars Marketplace. All rights reserved.",
    facebook: "https://facebook.com/1stcars",
    instagram: "https://instagram.com/1stcars",
    youtube: "https://youtube.com/1stcars",
    supportEmail: "support@1stcars.com",
    supportPhone: "+91 8866377722",
    supportAddress: "1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India",
    brandSlogan: "The Premium Pre-Owned Hub",
    brandDescription: "We curate only top-tier premium, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute premium service.",
    highlight1Title: "Single Owned",
    highlight1Desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation.",
    highlight2Title: "Non Accident Trusted",
    highlight2Desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics.",
    highlight3Title: "Genuine KM",
    highlight3Desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs.",
    seoTitle: "1stCars - Certified Car Marketplace",
    seoDescription: "The premier platform to buy and sell certified pre-owned vehicles with a 120-Point Certificate.",
    googleAnalyticsId: "G-1STCARS2026",
    buyButtonText: "Buy Certified Cars",
    sellButtonText: "Sell Your Car",
    filterHeadingText: "Refine Selection",
    searchButtonText: "Search Fleet",
    buyCarsHeadingText: "Explore Our Handpicked Certified Fleet",
    buyCarsSubheadingText: "1stCars is Gujarat's premier aggregator platform connecting Car Buyers, Sellers, and Dealers. Every vehicle undergoes strict 1stMark certification for Single Owned status, Non-Accident trusted frame, and Genuine KM verification.",
    detailsButtonText: "Details & Booking",
    inspectionButtonText: "Book Showroom Inspection",
    valuationButtonText: "Calculate Valuation",
    sellCarBannerTitle: "Sell Your Car Instantly From Home",
    sellCarBannerDesc: "Book a 100% free home inspection, receive live bids from our verified dealer network, and complete the sale in 24 hours with free RC transfer.",
    sellCarFormHeading: "Get Your Car Valued",
    sellCarFormSubheading: "Fill in your car details and we'll get back to you with a competitive cash quote",
    certifiedBadgeText: "THE TRUST BLUEPRINT",
    certifiedHeadingText: "Why Choose 1stMark Certified?",
    certifiedSubheadingText: "We engineered a rigorous quality benchmark to remove the friction, anxiety, and guesswork of buying pre-owned cars.",
    testimonialBadgeText: "VIP CLUB FEEDBACK",
    testimonialHeadingText: "Loved By Drivers & Collectors",
    testimonialSubheadingText: "We have completed over 4,500 doorstep premium deliveries. Read reviews from verified car owners.",
    ctaBadgeText: "REQUEST ACCESS NOW",
    ctaHeadingText: "Ready to Drive Your Certified Vehicle?",
    ctaSubheadingText: "Contact our Surat flagship concierge center to schedule a private showroom tour, request home evaluation, or register for rare car arrivals.",
    otpProvider: "simulated",
    customOtpUrl: "",
    customOtpHeaders: "",
    customOtpPayload: ""
  });

  const [testimonials, setTestimonials] = React.useState<any[]>([]);

  const loadSettingsAndCMSData = React.useCallback(async () => {
    if (typeof window !== "undefined") {
      // Normalize demo placeholders that must never render on the live site.
      const sanitize = (parsed: any) => {
        const isDemoAddress = !parsed.supportAddress || parsed.supportAddress.includes("Los Angeles") || parsed.supportAddress.includes("Greenwood") || parsed.supportAddress.includes("722") || parsed.supportAddress.includes("Bhatar");
        if (isDemoAddress) {
          parsed.supportAddress = "1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India";
          parsed.supportPhone = "+91 8866377722";
          parsed.supportEmail = "support@1stcars.com";
        }
        if (!parsed.logoUrl || parsed.logoUrl === "🏎️ 1stCars" || parsed.logoUrl === "⭐") {
          parsed.logoUrl = "/logo.png";
        }
        // Restore canonical homepage copy. These exact strings are demo/admin
        // defaults that were written to the settings row by older saves or the
        // legacy footer migration rule; they must never render on the site.
        const canonicalCopy: Record<string, string> = {
    heroSubtitle: "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
          highlight1Title: "Single Owned",
          highlight1Desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation.",
          highlight2Title: "Non Accident Trusted",
          highlight2Desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics.",
          highlight3Title: "Genuine KM",
          highlight3Desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs.",
        };
        const nonCanonical: Record<string, string> = {
          heroSubtitle: "Inspired by rigorous standards, reimagined for ultimate convenience.",
          highlight1Title: "120-Point Inspection",
          highlight2Title: "Single Owned, Non Accident Trusted*",
          highlight3Title: "Aggregator Marketplace",
        };
        for (const key of Object.keys(nonCanonical)) {
          if (parsed[key] === nonCanonical[key]) {
            parsed[key] = canonicalCopy[key];
            const descKey = key.replace("Title", "Desc");
            if (canonicalCopy[descKey]) parsed[descKey] = canonicalCopy[descKey];
          }
        }
        // Lock the hero heading and subtitle to the canonical copy regardless
        // of stored DB/CMS values.
        parsed.heroTitle = "Certified Cars";
        parsed.heroSubtitle = "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.";
        // Force canonical marketing copy so legacy stored values can never
        // re-introduce the "luxury" wording on the live site.
        parsed.footerText = "© 2026 1stCars Marketplace. All rights reserved.";
        parsed.brandSlogan = "The Premium Pre-Owned Hub";
        parsed.brandDescription = "We curate only top-tier premium, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute premium service.";
        parsed.seoTitle = "1stCars - Certified Car Marketplace";
        parsed.seoDescription = "The premier platform to buy and sell certified pre-owned vehicles with a 120-Point Certificate.";
        parsed.certifiedSubheadingText = "We engineered a rigorous quality benchmark to remove the friction, anxiety, and guesswork of buying pre-owned cars.";
        parsed.testimonialSubheadingText = "We have completed over 4,500 doorstep premium deliveries. Read reviews from verified car owners.";
        parsed.ctaSubheadingText = "Contact our Surat flagship concierge center to schedule a private showroom tour, request home evaluation, or register for rare car arrivals.";
        return parsed;
      };
      const apply = (parsed: any) => {
        setWebsiteSettings(prev => ({ ...prev, ...parsed }));
        if (parsed.primaryColor) {
          document.documentElement.style.setProperty("--primary-theme-color", parsed.primaryColor);
        }
        if (parsed.buttonColor) {
          document.documentElement.style.setProperty("--button-theme-color", parsed.buttonColor);
        }
      };

      // 1. Supabase `settings` table is the source of truth (the Admin CMS Text
      //    Editor upserts it there). Fetch it so edits made in the admin panel
      //    appear on the live site on every device, not just the editor's
      //    browser. Cache it in localStorage, then nudge the other components
      //    (Navbar / Footer / BuyCarsView / SellCarView) to re-read the cache.
      try {
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "website_settings")
          .maybeSingle();
        if (data?.value) {
          const parsed = sanitize(JSON.parse(data.value));
          const next = JSON.stringify(parsed);
          const previous = localStorage.getItem("1stcars_cms_website_settings");
          localStorage.setItem("1stcars_cms_website_settings", next);
          apply(parsed);
          if (previous !== next) {
            window.dispatchEvent(new Event("1stcars_settings_updated"));
          }
        }
      } catch (e) {
        console.error("Failed to load website settings from Supabase:", e);
      }

      // 2. Local cache fallback (covers offline or identical-to-server reloads).
      const storedSettings = localStorage.getItem("1stcars_cms_website_settings");
      if (storedSettings) {
        try {
          apply(sanitize(JSON.parse(storedSettings)));
        } catch (e) {
          console.error("Failed to parse website settings:", e);
        }
      }

      // Testimonials: Supabase `testimonials` is the source of truth (edited
      // in Admin CMS → Reviews), so the home page and admin panel always agree.
      const defaultTestimonials = [
        { id: "t-1", name: "Arthur H. Sterling", role: "Purchased: Porsche 911 Carrera S", rating: 5, content: "Buying my Porsche Carrera S from 1stCars was an absolute joy. The 120-point report card was extremely thorough, and they delivered the vehicle in a fully closed transport direct to my estate. Top tier service.", photo: "👤" },
        { id: "t-2", name: "Dr. Melissa Duarte", role: "Sold: Mercedes-Benz G 63 AMG", rating: 5, content: "I was initially nervous about trade-ins, but 1stCars calculated an instant offer on my G 63, did the doorstep evaluation check next morning, and transferred funds to my Chase account that exact afternoon. Exceptional speed.", photo: "👤" },
        { id: "t-3", name: "Harish Kotian", role: "Dealer Partner", rating: 5, content: "The B2B live dealer bidding is completely transparent and incredibly fast. Picked up 3 pristine Porsche models already. Sourced perfect specifications.", photo: "👤" }
      ];
      try {
        const { data: tData } = await supabase.from("testimonials").select();
        let deleted: string[] = [];
        try {
          deleted = JSON.parse(localStorage.getItem("1stcars_cms_testimonials_deleted") || "[]");
        } catch (e) {
          deleted = [];
        }
        const dbRows = (tData || [])
          .map((t: any) => ({
            id: t.id,
            name: t.author_name,
            role: t.author_role || "Private Buyer",
            rating: t.rating,
            content: t.comment,
            photo: t.photo || "👤"
          }))
          .filter((t: any) => !deleted.includes(String(t.name || "").trim().toLowerCase()));
        if (dbRows.length > 0) {
          localStorage.setItem("1stcars_cms_testimonials", JSON.stringify(dbRows));
          setTestimonials(dbRows);
        }
      } catch (e) {
        console.error("Failed to load testimonials from Supabase:", e);
      }

      // Fallback cache (used only while the Supabase table is empty).
      const rawTestimonials = localStorage.getItem("1stcars_cms_testimonials");
      if (rawTestimonials) {
        try {
          setTestimonials(JSON.parse(rawTestimonials));
        } catch (e) {
          console.error("Failed to parse testimonials", e);
        }
      } else {
        setTestimonials(defaultTestimonials);
        localStorage.setItem("1stcars_cms_testimonials", JSON.stringify(defaultTestimonials));
      }
    }
  }, []);

  React.useEffect(() => {
    loadSettingsAndCMSData();

    // Listen to changes from AdminCMS
    window.addEventListener("1stcars_settings_updated", loadSettingsAndCMSData);
    return () => {
      window.removeEventListener("1stcars_settings_updated", loadSettingsAndCMSData);
    };
  }, [loadSettingsAndCMSData]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedBudget, setSelectedBudget] = React.useState(0);

  // Lead capture / Book inspection states
  const [bookPhone, setBookPhone] = React.useState("");
  const [bookDate, setBookDate] = React.useState("");
  const [bookName, setBookName] = React.useState("");
  const [bookSuccess, setBookSuccess] = React.useState(false);

  // Valuation Calculator states
  const [calcBrand, setCalcBrand] = React.useState("");
  const [calcYear, setCalcYear] = React.useState("2021");
  const [calcMileage, setCalcMileage] = React.useState("");
  const [calcEstimatedValue, setCalcEstimatedValue] = React.useState<number | null>(null);
  const [calcError, setCalcError] = React.useState("");

  // Auth Modals state
  const [authModal, setAuthModal] = React.useState<{ isOpen: boolean; mode: "login" | "register"; email?: string }>({
    isOpen: false,
    mode: "login"
  });
  const [authEmail, setAuthEmail] = React.useState("");
  const [authPassword, setAuthPassword] = React.useState("");
  const [authSuccess, setAuthSuccess] = React.useState(false);

  // General Notification Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [toastType, setToastType] = React.useState<"success" | "info" | "error">("success");

  // Global simulated SMS state
  const [globalSimulatedSms, setGlobalSimulatedSms] = React.useState<{ mobile: string; body: string; code: string } | null>(null);

  React.useEffect(() => {
    const handleSimSms = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setGlobalSimulatedSms({
          mobile: customEvent.detail.mobile,
          body: `[1stCars] Your premium selection gateway secure login OTP is ${customEvent.detail.code}. Please do not share this with anyone. Valid for 5 minutes.`,
          code: customEvent.detail.code
        });
      }
    };
    
    window.addEventListener("1stcars_simulate_sms", handleSimSms);
    return () => {
      window.removeEventListener("1stcars_simulate_sms", handleSimSms);
    };
  }, []);

  // Subscribe to global toast emitter
  React.useEffect(() => {
    let timeoutId: any = null;
    const unsubscribe = toast.subscribe((event) => {
      setToastMessage(event.message);
      setToastType(event.type);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    });
    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Scroll references
  const featuredCarsRef = React.useRef<HTMLDivElement>(null);
  const sellStepsRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const triggerToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Saved cars interaction
  const toggleSaveCar = (id: string, carModel: string) => {
    if (savedCars.includes(id)) {
      setSavedCars(savedCars.filter(item => item !== id));
      triggerToast(`Removed ${carModel} from your saved inventory`);
    } else {
      setSavedCars([...savedCars, id]);
      triggerToast(`Saved ${carModel} to your wishlist!`);
    }
  };

  // Scroll Actions
  const scrollToInventory = () => {
    featuredCarsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToSell = () => {
    handleNavigate("sell_car");
  };

  const focusSearchInput = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Calculate Instant Offer Valuation logic
  const handleCalculateValuation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcBrand) {
      setCalcError("Please select or enter your vehicle brand.");
      return;
    }
    const mileageNum = parseInt(calcMileage);
    if (isNaN(mileageNum) || mileageNum < 0) {
      setCalcError("Please enter a valid mileage.");
      return;
    }
    setCalcError("");

    // Calculate realistic premium used car price anchor
    // Base anchor values in INR (₹) for the Indian pre-owned market
    let baseValue = 1800000;
    if (calcBrand.toLowerCase().includes("porsche") || calcBrand.toLowerCase().includes("ferrari") || calcBrand.toLowerCase().includes("lamborghini") || calcBrand.toLowerCase().includes("bentley")) {
      baseValue = 9000000;
    } else if (calcBrand.toLowerCase().includes("mercedes") || calcBrand.toLowerCase().includes("bmw") || calcBrand.toLowerCase().includes("audi")) {
      baseValue = 3500000;
    }

    const age = 2026 - parseInt(calcYear);
    const ageDepreciation = Math.max(0.1, 1 - (age * 0.08));
    const mileageDepreciation = Math.max(0.2, 1 - (mileageNum * 0.000005));
    
    const finalValue = Math.round(baseValue * ageDepreciation * mileageDepreciation);
    setCalcEstimatedValue(Math.max(50000, finalValue));
    triggerToast(`Instant valuation compiled for your ${calcBrand}!`);
  };

  // Book free inspection submission
  const handleBookInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookPhone || !bookDate || !bookName) {
      triggerToast("Please fill in all inspection details.");
      return;
    }
    setBookSuccess(true);
    triggerToast("Free evaluation booked successfully! Our concierge will call you shortly.");
  };

  // Auth submission
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthSuccess(true);
    setTimeout(() => {
      setAuthModal({ isOpen: false, mode: "login" });
      setAuthSuccess(false);
      setAuthEmail("");
      setAuthPassword("");
      triggerToast("Welcome back! Authenticated successfully.");
    }, 1500);
  };

  // Filter listings
  const filteredCars = catalogCars.filter(car => {
    const matchesSearch = searchTerm === "" || 
      car.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
      car.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBrand = selectedBrand === "" || car.brand === selectedBrand;
    
    const matchesBudget = selectedBudget === 0 || car.price <= selectedBudget;
    
    const selectedCityLower = selectedCity.toLowerCase();
    const matchesCity = selectedCity === "All Cities" || 
      car.cities?.some(c => c.toLowerCase() === selectedCityLower) || 
      car.regCity?.toLowerCase() === selectedCityLower || 
      car.location?.toLowerCase().includes(selectedCityLower);

    return matchesSearch && matchesBrand && matchesBudget && matchesCity;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedBrand("");
    setSelectedBudget(0);
    triggerToast("All filters reset");
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col font-sans selection:bg-[#2E7D32]/20 selection:text-[#2E7D32] pt-20 overflow-x-hidden">
      
      {/* Dynamic Toast Message */}
      {toastMessage && (
        <div
          role={toastType === "error" ? "alert" : "status"}
          aria-live={toastType === "error" ? "assertive" : "polite"}
          className={cn(
            // z-[200] keeps the toast ABOVE modal backdrops (z-50) and the SMS
            // banner (z-[100]) so it can never be covered / blurred by a
            // backdrop-filter overlay. Opaque backgrounds + subtle slide-in
            // (instead of the jittery continuous bounce) keep text crisp.
            "fixed bottom-6 right-6 z-[200] px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm border-2 animate-in fade-in slide-in-from-bottom-4 duration-300",
            toastType === "error"
              ? "bg-rose-600 border-rose-400 text-white"
              : toastType === "info"
                ? "bg-slate-900 border-slate-600 text-white"
                : "bg-[#1B5E20] border-[#2E7D32] text-white"
          )}
        >
          <Sparkles className={cn(
            "h-5 w-5 shrink-0",
            toastType === "error"
              ? "text-white"
              : toastType === "info"
                ? "text-slate-300"
                : "text-emerald-200"
          )} />
          <p className="text-sm font-bold leading-snug">{toastMessage}</p>
        </div>
      )}


      {/* Global Simulated SMS Notification Banner */}
      {globalSimulatedSms && (
        <div className="fixed top-24 right-6 z-[100] w-full max-w-sm px-4">
          <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-[#2E7D32]/25 flex flex-col gap-2 animate-bounce">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                💬 Messages • SMS Gateway Mock
              </span>
              <button 
                onClick={() => setGlobalSimulatedSms(null)}
                className="text-white/40 hover:text-white/80 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] leading-relaxed font-semibold text-slate-100">
              <strong className="text-white">+91 {globalSimulatedSms.mobile}</strong>: {globalSimulatedSms.body}
            </div>
            <button
              onClick={() => {
                if (!authModal.isOpen) {
                  setAuthModal({ isOpen: true, mode: "login" });
                  // small timeout to let AuthModal mount event listener
                  setTimeout(() => {
                    const event = new CustomEvent("1stcars_autofill_otp", {
                      detail: { code: globalSimulatedSms.code }
                    });
                    window.dispatchEvent(event);
                  }, 150);
                } else {
                  const event = new CustomEvent("1stcars_autofill_otp", {
                    detail: { code: globalSimulatedSms.code }
                  });
                  window.dispatchEvent(event);
                }
                setGlobalSimulatedSms(null);
              }}
              className="mt-1 bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider rounded-lg py-2 transition-all cursor-pointer shadow-lg shadow-[#2E7D32]/20"
            >
              ⚡ {!authModal.isOpen ? "Autofill & Sign In:" : "Autofill OTP Code:"} {globalSimulatedSms.code}
            </button>
          </div>
        </div>
      )}

      {/* Custom Auth Modal Component */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        initialMode={authModal.mode}
        initialEmail={authModal.email}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          triggerToast(`Welcome back, ${user.name}!`);
          navigateTo("role_dashboards", undefined, { replace: true });
          setCurrentView("role_dashboards");
          setAuthModal({ ...authModal, isOpen: false });
        }}
      />

      {/* 1. STICKY NAVBAR */}
      <Navbar 
        savedCount={savedCars.length} 
        onSavedClick={() => {
          if (currentView !== "home") {
            handleNavigate("home");
            setTimeout(scrollToInventory, 150);
          } else {
            scrollToInventory();
          }
        }}
        onSearchClick={() => {
          handleNavigate("buy_cars");
        }}
        onAuthClick={(mode) => setAuthModal({ isOpen: true, mode })}
        currentView={currentView}
        onViewChange={(view, pageId) => {
          handleNavigate(view, { pageId });
        }}
        currentUser={currentUser}
        onLoginSuccess={(user) => setCurrentUser(user)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setCurrentUser(null);
          handleNavigate("home");
          triggerToast("Logged out successfully");
        }}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
      />

      <React.Suspense fallback={<ViewLoader />}>
      {currentView === "buy_cars" ? (
        <BuyCarsView

          onViewDetails={(id) => {
            handleNavigate("car_details", { carId: id });
          }}
          savedCars={savedCars}
          onSaveToggle={toggleSaveCar}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          initialBrand={selectedBrand}
          initialModel={selectedModel}
          initialSearch={searchQuery}
        />
      ) : currentView === "car_details" ? (
        <CarDetailsView
          key={activeCarId}
          carId={activeCarId}
          onBack={() => {
            handleNavigate("buy_cars");
          }}
          onViewCar={(id) => {
            handleNavigate("car_details", { carId: id });
          }}
          savedCars={savedCars}
          onSaveToggle={toggleSaveCar}
          onNavigateToSalesPortal={() => {
            handleNavigate("sales_dashboard");
          }}
          onNavigateToDashboard={() => {
            handleNavigate("role_dashboards");
          }}
        />
      ) : currentView === "sales_dashboard" ? (
        <SalesDashboardView
          onBackToInventory={() => {
            handleNavigate("buy_cars");
          }}
        />
      ) : currentView === "sell_car" ? (
        <SellCarView
          onNavigateToDashboard={(profile) => {
            // The seller flow resolves the authoritative profile (fresh role)
            // after auto sign-in/role promotion; push it into App state so the
            // Seller dashboard renders immediately.
            if (profile) setCurrentUser(profile);
            handleNavigate("role_dashboards");
          }}
          onBackToHome={() => {
            handleNavigate("buy_cars");
          }}
        />
      ) : currentView === "role_dashboards" ? (
        currentUser ? (
          <RoleDashboards
            currentUser={currentUser}
            onLogout={async () => {
              await supabase.auth.signOut();
              setCurrentUser(null);
              handleNavigate("home");
              triggerToast("Logged out successfully");
            }}
            onNavigateToInventory={() => {
              handleNavigate("buy_cars");
            }}
            onReloadAllData={loadSettingsAndCMSData}
          />
        ) : (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl max-w-md mx-auto border border-slate-100 my-12 shadow-sm">
            <Shield className="h-16 w-16 text-[#2E7D32] mb-4 animate-pulse" />
            <h3 className="text-2xl font-black text-slate-900">Access Restricted</h3>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              You must be signed in to access the private user & staff dashboards or Admin CMS.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl py-3.5 shadow-md"
              >
                Sign In To Continue
              </Button>
            </div>
          </div>
        )
      ) : currentView === "firstmark_certification" ? (
        <FirstMarkCertification
          onBackToHome={() => {
            handleNavigate("home");
          }}
          onNavigateToInventory={() => {
            handleNavigate("buy_cars");
          }}
        />
      ) : currentView === "custom_page" ? (
        <CustomPageView
          pageId={selectedPageId}
          onBackToHome={() => {
            handleNavigate("home");
          }}
        />
      ) : currentView === "about" ? (
        <AboutUsView
          onBackToHome={() => {
            handleNavigate("home");
          }}
          onNavigateToInventory={() => {
            handleNavigate("buy_cars");
          }}
        />
      ) : currentView === "faq" ? (
        <FAQView
          onBackToHome={() => {
            handleNavigate("home");
          }}
          onNavigateToInventory={() => {
            handleNavigate("buy_cars");
          }}
        />
      ) : currentView === "error_404" ? (
        <Error404Page onGoHome={() => handleNavigate("home")} />
      ) : currentView === "error_500" ? (
        <Error500Page 
          onGoHome={() => handleNavigate("home")} 
          onRetry={() => handleNavigate("home")}
        />
      ) : (
        <>
          {/* 2. HERO SECTION */}
      <Section className="bg-gradient-to-b from-emerald-50 to-emerald-100 border-b border-[#2E7D32]/20 relative pt-12 sm:pt-16 md:pt-20 pb-8 md:pb-12 lg:pb-16 overflow-hidden">
        {/* Background elegance accents */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Hero Content */}
          <div className="flex flex-col items-center justify-center space-y-5 max-w-4xl mx-auto">
            <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 leading-[0.95] text-center">
              {websiteSettings.heroTitle && websiteSettings.heroTitle !== "Certified Cars" ? (
                websiteSettings.heroTitle
              ) : (
                <>
                  Buy & Sell <br className="sm:hidden" />
                  <span className="text-[#2E7D32] relative">
                    Certified Cars 
                    <span className="absolute left-0 bottom-1 w-full h-[6px] bg-[#2E7D32]/10 -z-10 rounded"></span>
                  </span> <br />
                  With Total Confidence.
                </>
              )}
            </h1>
            
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-medium text-center">
              {websiteSettings.heroSubtitle || "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center w-full max-w-md mx-auto">
              <Button 
                onClick={() => {
                  handleNavigate("buy_cars");
                }}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold px-8 py-4 text-xs tracking-wider uppercase shadow-xl shadow-[#2E7D32]/25 group flex items-center justify-center rounded-full w-full sm:w-auto"
              >
                {websiteSettings.buyButtonText || "Buy Certified Cars"}
              </Button>
              <Button 
                variant="secondary"
                onClick={scrollToSell}
                className="bg-white border border-slate-200/80 text-slate-900 font-extrabold px-8 py-4 text-xs tracking-wider uppercase hover:bg-slate-50 shadow-sm flex items-center justify-center rounded-full w-full sm:w-auto"
              >
                {websiteSettings.sellButtonText || "Sell Your Car"}
              </Button>
            </div>

            {/* Micro Trust points */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/60 w-full max-w-md justify-center">
              <div className="flex flex-col items-center">
                <span className="text-xl font-black text-[#2E7D32] tracking-tighter shrink-0">{websiteSettings.highlight1Title || "1st-Owner"}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight mt-0.5 text-center" title={websiteSettings.highlight1Desc}>1 Premium Owner</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-black text-[#2E7D32] tracking-tighter shrink-0">{websiteSettings.highlight2Title || "Accident-Free"}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight mt-0.5 text-center" title={websiteSettings.highlight2Desc}>Trusted Frame</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-black text-[#2E7D32] tracking-tighter shrink-0">{websiteSettings.highlight3Title || "Genuine"}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight mt-0.5 text-center" title={websiteSettings.highlight3Desc}>KM Guaranteed</span>
              </div>
            </div>
          </div>
        </div>

      </Section>

      {/* 3. FEATURED CARS */}
      <Section ref={featuredCarsRef} bg="white" id="featured-cars" padding="lg" className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              {websiteSettings.buyCarsHeadingText || "Explore Our Handpicked Certified Fleet"}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {websiteSettings.buyCarsSubheadingText || "Every vehicle on this list is fully vetted and owned directly by 1stCars. Enjoy straightforward pricing, single-owner status, certified non-accident frames, and instant deliveries."}
            </p>
          </div>

          {/* Grid of Listings */}
          {filteredCars.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {filteredCars.slice(0, 8).map((car) => {
                  const isSaved = savedCars.includes(car.id);

                  return (
                    <CarCard
                      key={car.id}
                      car={car}
                      isSaved={isSaved}
                      onSaveToggle={toggleSaveCar}
                      onViewDetails={(id) => handleNavigate("car_details", { carId: id })}
                    />
                  );
                })}
              </div>

              {filteredCars.length > 8 && (
                <div className="text-center pt-4">
                  <Button
                    onClick={() => handleNavigate("buy_cars")}
                    className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl shadow-lg shadow-[#2E7D32]/20 cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>View All {filteredCars.length} Cars in Inventory</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl p-12 text-center max-w-xl mx-auto border border-slate-200">
              <CarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Vehicles Found in {selectedCity}</h3>
              <p className="text-sm text-slate-500 mt-2">
                We have new arrivals in Surat daily. Try clearing your search parameters, selecting "All body types," or resetting filters.
              </p>
              <Button onClick={clearFilters} className="mt-6 bg-[#2E7D32] text-white font-extrabold text-xs tracking-wider uppercase rounded-full">
                Show Surat Inventory
              </Button>
            </div>
          )}
        </div>
      </Section>



      {/* 5. WHY CHOOSE 1STMARK CERTIFIED */}
      <Section id="certified-benefits" bg="white" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="premium">{websiteSettings.certifiedBadgeText || "THE TRUST BLUEPRINT"}</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              {websiteSettings.certifiedHeadingText || "Why Choose 1stMark Certified?"}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {websiteSettings.certifiedSubheadingText || "We engineered a rigorous quality benchmark to remove the friction, anxiety, and guesswork of buying pre-owned cars."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto gap-8 text-left">
            
            {/* Benefit 1 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">120+ Point Certificate</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Rigorous diagnostic scans, structural integrity checks, road testing, and detail evaluation. If it does not pass flawlessly, we will not list it.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Mechanical & Powertrain OK</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Diagnostic Scan Clearance</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Exterior Refinement Certified</div>
                </div>
                <div className="pt-4 mt-2 border-t border-slate-100 flex">
                  <button
                    onClick={() => {
                      handleNavigate("firstmark_certification");
                    }}
                    className="text-[#2E7D32] hover:text-[#25632a] text-xs font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                  >
                    View Certification Process <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>

            {/* Benefit 3 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Verified & Clean History</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  We verify ownership history, insurance claims, odometer readings, and past service logs through trusted verification partners so there are no surprise skeletons.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Certified Clean Titles Only</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> No Accidental History</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Transparent Log Reports</div>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </Section>

      {/* 6. TESTIMONIALS */}
      <Section bg="muted" padding="lg" className="border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="secondary">{websiteSettings.testimonialBadgeText || "VIP CLUB FEEDBACK"}</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              {websiteSettings.testimonialHeadingText || "Loved By Drivers & Collectors"}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {websiteSettings.testimonialSubheadingText || "We have completed over 4,500 doorstep premium deliveries. Read reviews from verified car owners."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {testimonials.map((t, idx) => (
              <Card key={t.id || idx} hoverEffect={false} className="bg-white border border-slate-100 rounded-3xl p-8 relative shadow-lg shadow-slate-200/30 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex text-amber-500 space-x-0.5">
                    {[...Array(Number(t.rating) || 5)].map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 font-semibold italic leading-relaxed">
                    "{t.content}"
                  </p>
                </div>
                <div className="flex items-center space-x-3.5 pt-6 mt-6 border-t border-slate-100">
                  <div className="h-10 w-10 bg-primary/10 text-[#2E7D32] font-black rounded-full flex items-center justify-center text-xs">
                    {t.photo && t.photo !== "👤" ? t.photo : (t.name || "U").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">{t.name}</h4>
                    <p className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* 7. CTA SECTION */}
      <Section id="contact-section" bg="dark" className="relative py-10 md:py-16 bg-linear-to-b from-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#2E7D32]/5 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="premium" className="bg-[#2E7D32] text-white border-none shadow-md shadow-[#2E7D32]/25">
              {websiteSettings.ctaBadgeText || "REQUEST ACCESS NOW"}
            </Badge>
            <h2 className="font-sans text-3xl md:text-5xl font-black tracking-tighter text-white leading-none">
              {websiteSettings.ctaHeadingText || "Ready to Drive Your Certified Vehicle?"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold max-w-lg mx-auto leading-relaxed">
              {websiteSettings.ctaSubheadingText || "Contact our Surat flagship concierge center to schedule a private showroom tour, request home evaluation, or register for rare car arrivals."}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 max-w-2xl mx-auto text-left">
            <h3 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest mb-4 text-center">
              Concierge Call-Back Request
            </h3>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                triggerToast("Concierge call-back request received! Specialist will contact you within 10 minutes.");
              }} 
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <input 
                type="text" 
                placeholder="Full Name" 
                className="bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:bg-white/20"
                required
              />
              <input 
                type="tel" 
                placeholder="Mobile Number" 
                className="bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:bg-white/20"
                required
              />
              <Button type="submit" className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase py-3 rounded-xl shadow-lg shadow-[#2E7D32]/20">
                Call Me Back
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-extrabold text-slate-300">
            <span className="flex items-center"><CheckCircle className="h-4.5 w-4.5 text-[#2E7D32] mr-2 shrink-0" /> Zero Obligations</span>
            <span className="flex items-center"><CheckCircle className="h-4.5 w-4.5 text-[#2E7D32] mr-2 shrink-0" /> No High-pressure Sales</span>
            <span className="flex items-center"><CheckCircle className="h-4.5 w-4.5 text-[#2E7D32] mr-2 shrink-0" /> Fast DMV title preparation</span>
          </div>

        </div>
      </Section>
        </>
      )}
      </React.Suspense>

      {/* 9. PREMIUM FOOTER */}

      <Footer 
        currentView={currentView}
        onViewChange={(view, pageId) => {
          handleNavigate(view, { pageId });
        }} 
        onAuthClick={(mode) => {
          setAuthModal({ isOpen: true, mode });
        }}
      />

      {/* Floating WhatsApp Widget with page-aware greeting */}
      <WhatsAppFloatingButton view={currentView} />

    </div>
  );
}
