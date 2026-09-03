import * as React from "react";
import { toast } from "@/src/lib/toast";
import { Navbar } from "@/src/components/layout/Navbar";
import { CarCard } from "@/src/components/CarCard";
import { cn } from "@/src/lib/utils";
import { normalizeWebsiteSettings } from "@/src/lib/pageContentDefaults";
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
import { supabase, isRealSupabase, isProdMockBlocked } from "@/src/lib/supabaseClient";
import { parseCurrentUrl, navigateTo, getPageTitle, ViewType } from "@/src/lib/router";
import { captureUtm, trackPageView } from "@/src/lib/analytics";
import { trackMetaPageView } from "@/src/lib/metaPixel";
import { maybeAutoSeedDatabase } from "@/src/lib/seeder";
import { useCatalogCars } from "@/src/lib/useCatalogCars";
import { estimateCarValue } from "@/src/lib/valuation";
import { getConsentStatus, setConsentStatus } from "@/src/lib/consent";
import { auctionService } from "@/src/lib/auctions";
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
const CareersView = React.lazy(() => import("@/src/components/CareersView").then(m => ({ default: m.CareersView })));


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
  const { cars: catalogCars, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } = useCatalogCars();

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

  // GA4 + UTM tracking: capture campaign params on arrival, then emit exactly
  // one page_view per SPA route change (pushState navigation, back/forward, and
  // direct URL loads). captureUtm() reads any utm_* params from the URL and
  // persists first-touch (localStorage) / latest-touch (sessionStorage) so the
  // campaign attribution survives in-app navigation.
  React.useEffect(() => {
    captureUtm();
    trackPageView();

    const handleHistory = () => {
      captureUtm();
      trackPageView();
      trackMetaPageView();
    };

    // pushState/replaceState don't fire popstate, so hook the router's history
    // writes and treat each as a route change for analytics.
    const patchHistory = (method: "pushState" | "replaceState") => {
      const original = window.history[method].bind(window.history);
      window.history[method] = function (...args: any[]) {
        const result = original(...args);
        window.dispatchEvent(new Event("1stcars:routechange"));
        return result;
      };
    };
    patchHistory("pushState");
    patchHistory("replaceState");

    window.addEventListener("1stcars:routechange", handleHistory);
    window.addEventListener("popstate", handleHistory);
    return () => {
      window.removeEventListener("1stcars:routechange", handleHistory);
      window.removeEventListener("popstate", handleHistory);
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
        let approvalState: { is_approved?: boolean; status?: string } | null = null;
        try {
          const applyProfile = (profile: any) => {
            role = profile.role || role;
            name = profile.name || name;
            mobile = profile.mobile || mobile;
            city = profile.city || city;
            approvalState = {
              is_approved: profile.is_approved,
              status: profile.status
            };
          };
          const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("id, name, email, mobile, role, city, is_approved, status")
            .eq("id", user.id)
            .maybeSingle();
          if (profile) {
            applyProfile(profile);
          } else if (profileErr) {
            // Older databases predate the is_approved / status columns
            // (PostgREST 400 PGRST205). Retry with base columns so login still
            // resolves the profile and only the approval gate stays unknown.
            const { data: base } = await supabase
              .from("profiles")
              .select("id, name, email, mobile, role, city")
              .eq("id", user.id)
              .maybeSingle();
            if (base) applyProfile(base);
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
          is_approved: approvalState?.is_approved,
          status: approvalState?.status,
          created_at: user.created_at || new Date().toISOString()
        } as any);

        // Gmail → Sell Car fallback: the Sell Car form's "Sign in with Gmail"
        // button passes redirectTo=/sell-car (no query params — see
        // buildOAuthRedirectUrl). If that path is missing from the Supabase
        // Auth → URL Configuration → Redirect URLs allowlist, Supabase ignores
        // it and falls back to the default Site URL (e.g. http://localhost:3000/),
        // which strands the saved wizard state in sessionStorage. When a
        // session shows up while that state is pending and the seller isn't
        // already on the sell car page, bounce them back to /sell-car where
        // SellCarView restores the wizard.
        if (!disposed) {
          try {
            if (
              typeof window !== "undefined" &&
              sessionStorage.getItem("1stcars_sell_car_form_state") &&
              parseCurrentUrl().view !== "sell_car"
            ) {
              setCurrentView("sell_car");
              navigateTo("sell_car");
            }
          } catch (e) {
            // best-effort redirect only — never break the auth flow
          }
        }
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

  // Auction engine maintenance poller: starts SCHEDULED auctions at their
  // starts_at and auto-closes LIVE/EXTENDED ones whose ends_at has passed.
  // Without this nothing ever moves an auction off LIVE (CRIT-01).
  React.useEffect(() => {
    const tick = async () => {
      try {
        const res = await auctionService.runMaintenance();
        if (res && (res.started > 0 || res.closed > 0)) {
          console.info(`[auctions] maintenance: ${res.started} started, ${res.closed} closed`);
        }
      } catch (err) {
        console.warn("[auctions] maintenance tick failed:", err);
      }
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

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
    brandDescription: "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
    highlight1Title: "Single Owned",
    highlight1Desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation.",
    highlight2Title: "Non Accident Trusted",
    highlight2Desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics.",
    highlight3Title: "Genuine KM",
    highlight3Desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs.",
    seoTitle: "1stCars - Certified Car Marketplace",
    seoDescription: "The premier platform to buy and sell certified pre-owned vehicles with a 120-Point Certificate.",
    googleAnalyticsId: "",
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
    testimonialSubheadingText: "We have completed over 280+ deliveries. Read reviews from verified car owners.",
    ctaBadgeText: "REQUEST ACCESS NOW",
    ctaHeadingText: "Ready to Drive Your Certified Vehicle?",
    ctaSubheadingText: "Please contact our Surat sell car hub to request a home evaluation, or register for rare car arrivals.",
    otpProvider: "simulated",
    customOtpUrl: "",
    customOtpHeaders: "",
    customOtpPayload: ""
  });

  const [testimonials, setTestimonials] = React.useState<any[]>([]);

  const loadSettingsAndCMSData = React.useCallback(async () => {
    if (typeof window !== "undefined") {
      // Normalize demo placeholders / legacy demo copy. Genuine AdminCMS edits
      // are preserved (only exact legacy/demo values are swapped for canonical
      // copy), so CMS-driven text now survives refreshes.
      const sanitize = (parsed: any) => {
        return normalizeWebsiteSettings(parsed);
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
  const [conciergeName, setConciergeName] = React.useState("");
  const [conciergeMobile, setConciergeMobile] = React.useState("");

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

  // General Notification Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [toastType, setToastType] = React.useState<"success" | "info" | "error">("success");

  // Analytics consent (GA4 / Meta Pixel are only loaded after explicit opt-in)
  const [consentStatus, setConsentStatusState] = React.useState<"granted" | "denied" | "undecided">(() =>
    getConsentStatus()
  );
  const handleConsentChoice = (choice: "granted" | "denied") => {
    setConsentStatus(choice);
    setConsentStatusState(choice);
  };

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

  // Instant valuation — single honest heuristic shared with the Sell Car form
  // (src/lib/valuation.ts): brand-class anchor + age/km depreciation. Clearly
  // an estimate: the on-site 120-point inspection produces the final quote.
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
    const yearNum = parseInt(calcYear);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > new Date().getFullYear() + 1) {
      setCalcError("Please enter a valid manufacturing year.");
      return;
    }
    setCalcError("");
    setCalcEstimatedValue(estimateCarValue(calcBrand, yearNum, mileageNum));
    triggerToast(`Instant valuation compiled for your ${calcBrand}!`);
  };

  // Concierge call-back lead — persisted to sales_notifications so it reaches
  // the Sales Associate dashboard instead of being silently dropped.
  const handleConciergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeName.trim() || !conciergeMobile.trim()) {
      triggerToast("Please enter your name and mobile number.", "error");
      return;
    }
    try {
      const { error } = await supabase.from("sales_notifications").insert({
        name: conciergeName.trim(),
        mobile: conciergeMobile.trim().replace(/\D/g, "").slice(-10),
        type: "call_back",
        status: "pending",
        notes: "Homepage concierge call-back request",
        city: selectedCity
      });
      if (error) throw error;
      setConciergeName("");
      setConciergeMobile("");
      triggerToast("Concierge call-back request received! Specialist will contact you within 10 minutes.");
    } catch (err: any) {
      triggerToast("Could not save your request. Please call us at +91 8866377722.", "error");
    }
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

  // Production misconfiguration: if the build ships without Supabase env vars,
  // the local mock database would otherwise become the production data source.
  // Refuse to run with demo data instead of silently serving it.
  if (isProdMockBlocked) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-rose-200 p-8 max-w-md text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-rose-600" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Misconfigured Deployment</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            This production build is missing the Supabase environment variables
            (<code className="bg-rose-50 px-1 py-0.5 rounded text-rose-700 font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="bg-rose-50 px-1 py-0.5 rounded text-rose-700 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>).
            The app refuses to fall back to local demo data in production.
          </p>
          <p className="text-xs text-slate-400 mt-3 font-semibold">
            Set both variables in the deployment platform and redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-[#2E7D32]/20 selection:text-[#2E7D32] pt-20 overflow-x-hidden">
      
      {/* Dynamic Toast Message */}
      {toastMessage && (
        <div
          role={toastType === "error" ? "alert" : "status"}
          aria-live={toastType === "error" ? "assertive" : "polite"}
          className={cn(
            // z-[200] keeps the toast ABOVE modal backdrops (z-50) and the SMS
            // banner (z-[100]) so it can never be covered / blurred by a
            // backdrop-filter overlay. Light backgrounds + dark high-contrast
            // text (instead of the jittery continuous bounce) keep copy crisp
            // and readable on any screen.
            "fixed bottom-6 right-6 z-[200] px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm border-2 animate-in fade-in slide-in-from-bottom-4 duration-300",
            toastType === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : toastType === "info"
                ? "bg-slate-100 border-slate-300 text-slate-800"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
          )}
        >
          <Sparkles className={cn(
            "h-5 w-5 shrink-0",
            toastType === "error"
              ? "text-rose-500"
              : toastType === "info"
                ? "text-slate-500"
                : "text-emerald-600"
          )} />
          <p className="text-sm font-bold leading-snug">{toastMessage}</p>
        </div>
      )}


      {/* Global Simulated SMS Notification Banner — mock mode ONLY. Production
          never shows a simulated OTP (real OTPs are delivered via the real
          gateway; see BookingModal / BuyNowCheckout). */}
      {globalSimulatedSms && !isRealSupabase && (
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

      {/* Tracking Consent Banner — GA4 / Meta Pixel stay dormant until the
          visitor accepts (DPDP/GDPR-aligned). */}
      {consentStatus === "undecided" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-lg px-5 py-4">
          <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/10 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-slate-200 font-medium">
              We use cookies and analytics (Google Analytics, Meta Pixel) to understand how visitors use
              1stCars and improve your experience. Tracking is on by default — you can turn it off anytime.
              Your choice is saved locally.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConsentChoice("granted")}
                className="px-4 py-2 bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Keep On
              </button>
              <button
                type="button"
                onClick={() => handleConsentChoice("denied")}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Turn Off
              </button>
            </div>
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
          currentUserId={currentUser?.id}
          userRole={currentUser?.role}
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
          onNavigateToSell={() => {
            handleNavigate("sell_car");
          }}
        />
      ) : currentView === "faq" ? (
        <CustomPageView
          pageId="p-faq"
          onBackToHome={() => {
            handleNavigate("home");
          }}
          onNavigateToInventory={() => {
            handleNavigate("buy_cars");
          }}
          onNavigateToSell={() => {
            handleNavigate("sell_car");
          }}
        />
      ) : currentView === "careers" ? (
        <CareersView
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
          {catalogLoading && filteredCars.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 text-left">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-3xl bg-white border border-slate-100 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-slate-200" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-6 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : catalogError && filteredCars.length === 0 ? (
            <div className="bg-rose-50 rounded-3xl p-10 text-center max-w-xl mx-auto border border-rose-200">
              <Info className="h-10 w-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Could Not Load Inventory</h3>
              <p className="text-sm text-slate-500 mt-2">{catalogError}</p>
              <Button onClick={() => refreshCatalog()} className="mt-5 bg-[#2E7D32] text-white font-extrabold text-xs tracking-wider uppercase rounded-full">
                Try Again
              </Button>
            </div>
          ) : filteredCars.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 text-left">
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
                    <span>View All</span>
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



      {/* 5. TESTIMONIALS */}
      <Section bg="muted" padding="lg" className="border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="secondary">{websiteSettings.testimonialBadgeText || "VIP CLUB FEEDBACK"}</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              {websiteSettings.testimonialHeadingText || "Loved By Drivers & Collectors"}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {websiteSettings.testimonialSubheadingText || "We have completed over 280+ deliveries. Read reviews from verified car owners."}
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
              {websiteSettings.ctaSubheadingText || "Please contact our Surat sell car hub to request a home evaluation, or register for rare car arrivals."}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 max-w-2xl mx-auto text-left">
            <h3 className="text-xs font-black text-[#2E7D32] uppercase tracking-widest mb-4 text-center">
              Concierge Call-Back Request
            </h3>
            
            <form 
              onSubmit={handleConciergeSubmit} 
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <input 
                type="text" 
                placeholder="Full Name" 
                value={conciergeName}
                onChange={(e) => setConciergeName(e.target.value)}
                className="bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:bg-white/20"
                required
              />
              <input 
                type="tel" 
                placeholder="Mobile Number" 
                value={conciergeMobile}
                onChange={(e) => setConciergeMobile(e.target.value)}
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

      {/* Floating WhatsApp Widget — home page only (removed from all user
          dashboards and inner pages) */}
      {currentView === "home" && (
        <WhatsAppFloatingButton view={currentView} />
      )}

    </div>
  );
}
