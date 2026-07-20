import * as React from "react";
import { toast } from "@/src/lib/toast";
import { Navbar } from "@/src/components/layout/Navbar";
import { cn } from "@/src/lib/utils";
import { Footer } from "@/src/components/layout/Footer";
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
  Award,
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
import { CARS_DATA, FAMOUS_BRANDS, BUDGET_RANGES } from "@/src/data/cars";
import { Car } from "@/src/types";
import { BuyCarsView } from "@/src/components/BuyCarsView";
import { CarDetailsView } from "@/src/components/CarDetailsView";
import { SalesDashboardView } from "@/src/components/SalesDashboardView";
import { Profile } from "@/src/lib/db";
import { AuthModal } from "@/src/components/AuthModal";
import { SellCarView } from "@/src/components/SellCarView";
import { RoleDashboards } from "@/src/components/RoleDashboards";
import { Error404Page, Error500Page } from "@/src/components/ErrorPages";
import { FirstMarkCertification } from "@/src/components/FirstMarkCertification";
import { CustomPageView } from "@/src/components/CustomPageView";
import { supabase } from "@/src/lib/supabaseClient";

export default function App() {
  // Navigation & interaction states
  const [currentView, setCurrentView] = React.useState<"home" | "buy_cars" | "car_details" | "sales_dashboard" | "sell_car" | "role_dashboards" | "error_404" | "error_500" | "firstmark_certification" | "custom_page">("home");
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
  const [activeCarId, setActiveCarId] = React.useState<string>("car-1");
  const [savedCars, setSavedCars] = React.useState<string[]>(["car-1", "car-3"]); // pre-saved for delightful onboarding
  const [currentUser, setCurrentUser] = React.useState<Profile | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string>("All Cities");

  React.useEffect(() => {
    // Listen to Supabase auth events (works with both mock and live Supabase clients)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Cast or shape the Supabase user object into the Profile interface
        const user = session.user;
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          mobile: user.user_metadata?.mobile || "",
          role: user.user_metadata?.role || "Buyer",
          city: user.user_metadata?.city || "Mumbai",
          created_at: user.created_at || new Date().toISOString()
        } as any);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Dynamic website configuration states from Admin CMS settings
  const [websiteSettings, setWebsiteSettings] = React.useState({
    logoUrl: "🏎️ 1stCars",
    logoSize: 150,
    favicon: "⭐",
    primaryColor: "#2E7D32",
    accentColor: "#FAF9F6",
    buttonColor: "#2E7D32",
    fontFamily: "Inter",
    heroTitle: "Certified Cars",
    heroSubtitle: "Inspired by rigorous pre-owned standards, reimagined for ultimate luxury. Explore 150-point inspected, hassle-free certified vehicles with single-owner pedigree, non-accident trust, and genuine km verification.",
    showPopularBrands: true,
    showLatestArrivals: true,
    showHowItWorks: true,
    showTestimonials: true,
    footerText: "© 2026 1stCars Luxury Marketplace. All rights reserved.",
    facebook: "https://facebook.com/1stcars",
    instagram: "https://instagram.com/1stcars",
    youtube: "https://youtube.com/1stcars",
    supportEmail: "concierge@1stcars.com",
    supportPhone: "+91 99999 99999",
    supportAddress: "722 S. Greenwood Avenue, Suite A, Los Angeles",
    brandSlogan: "The Luxury Pre-Owned Hub",
    brandDescription: "We curate only top-tier luxury, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute luxury service.",
    highlight1Title: "Single Owned",
    highlight1Desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation.",
    highlight2Title: "Non Accident Trusted",
    highlight2Desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics.",
    highlight3Title: "Genuine KM",
    highlight3Desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs.",
    seoTitle: "1stCars - Certified Luxury Car Marketplace",
    seoDescription: "The premier platform to buy and sell certified luxury pre-owned vehicles with a 150-Point Certificate.",
    googleAnalyticsId: "G-1STCARS2026",
    buyButtonText: "Buy Certified Cars",
    sellButtonText: "Sell Your Car",
    filterHeadingText: "Refine Selection",
    searchButtonText: "Search Fleet",
    buyCarsHeadingText: "Explore Our Handpicked Certified Fleet",
    buyCarsSubheadingText: "Every vehicle on this list is fully vetted and owned directly by 1stCars. Enjoy straightforward pricing, single-owner status, certified non-accident frames, and instant deliveries.",
    detailsButtonText: "Details & Booking",
    inspectionButtonText: "Book Showroom Inspection",
    valuationButtonText: "Calculate Valuation"
  });

  const [faqs, setFaqs] = React.useState<any[]>([]);
  const [testimonials, setTestimonials] = React.useState<any[]>([]);

  const loadSettingsAndCMSData = React.useCallback(() => {
    if (typeof window !== "undefined") {
      const storedSettings = localStorage.getItem("1stcars_cms_website_settings");
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          setWebsiteSettings(prev => ({ ...prev, ...parsed }));
          if (parsed.primaryColor) {
            document.documentElement.style.setProperty("--primary-theme-color", parsed.primaryColor);
          }
          if (parsed.buttonColor) {
            document.documentElement.style.setProperty("--button-theme-color", parsed.buttonColor);
          }
        } catch (e) {
          console.error("Failed to parse website settings:", e);
        }
      }

      // FAQs
      const rawFaqs = localStorage.getItem("1stcars_cms_faqs");
      if (rawFaqs) {
        try {
          setFaqs(JSON.parse(rawFaqs));
        } catch (e) {
          console.error("Failed to parse FAQs", e);
        }
      } else {
        const defaultFaqs = [
          { id: "fq-1", category: "Certification", question: "What is the 1stMark Certification process?", answer: "Every 1stCars vehicle undergoes our rigorous 150-Point Certificate inspection. This is conducted by elite technical experts and covers the powertrain, electrical diagnostics, structural chassis analysis, fluid qualities, and a complete road-test performance run. Only vehicles with flawless report cards receive 1stMark certification." },
          { id: "fq-2", category: "Trust", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification guarantees three core pillars for every luxury vehicle: 1) Single Owned: Every car is verified to have had only one previous owner; 2) Non-Accident Trusted: Strictly checked to have zero chassis frame damage or past accident repairs; 3) Genuine KM: Verified using advanced OBD diagnostics and complete historical service log sweeps so you can trust the mileage is 100% authentic." },
          { id: "fq-3", category: "Selling", question: "Can I sell my car instantly without purchasing another one?", answer: "Absolutely! We buy cars directly from collectors and private owners. You can use our online valuation calculator, book a free 30-minute doorstep or showroom inspection, and choose our Instant Offer to get paid on the exact same day. There is zero obligation to trade in or buy from us." },
          { id: "fq-4", category: "Financing", question: "Do you offer financing and home test drives?", answer: "Yes! We work with top-tier financial partners to offer low-interest elite finance programs and customizable EMI tenures. Plus, we provide home test drives and doorstep premium white-glove delivery in our private closed transports. Your security and convenience are our absolute priority." }
        ];
        setFaqs(defaultFaqs);
        localStorage.setItem("1stcars_cms_faqs", JSON.stringify(defaultFaqs));
      }

      // Testimonials
      const rawTestimonials = localStorage.getItem("1stcars_cms_testimonials");
      if (rawTestimonials) {
        try {
          setTestimonials(JSON.parse(rawTestimonials));
        } catch (e) {
          console.error("Failed to parse testimonials", e);
        }
      } else {
        const defaultTestimonials = [
          { id: "t-1", name: "Arthur H. Sterling", role: "Purchased: Porsche 911 Carrera S", rating: 5, content: "Buying my Porsche Carrera S from 1stCars was an absolute joy. The 150-point report card was extremely thorough, and they delivered the vehicle in a fully closed transport direct to my estate. Top tier service.", photo: "👤" },
          { id: "t-2", name: "Dr. Melissa Duarte", role: "Sold: Mercedes-Benz G 63 AMG", rating: 5, content: "I was initially nervous about trade-ins, but 1stCars calculated an instant offer on my G 63, did the doorstep evaluation check next morning, and transferred funds to my Chase account that exact afternoon. Exceptional speed.", photo: "👤" },
          { id: "t-3", name: "Harish Kotian", role: "Dealer Partner", rating: 5, content: "The B2B live dealer bidding is completely transparent and incredibly fast. Picked up 3 pristine Porsche models already. Sourced perfect specifications.", photo: "👤" }
        ];
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
  const [selectedBrand, setSelectedBrand] = React.useState("");
  const [selectedBudget, setSelectedBudget] = React.useState(0);
  const [selectedBodyType, setSelectedBodyType] = React.useState<string>("All");

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

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  // Auth Modals state
  const [authModal, setAuthModal] = React.useState<{ isOpen: boolean; mode: "login" | "register" }>({
    isOpen: false,
    mode: "login"
  });
  const [authEmail, setAuthEmail] = React.useState("");
  const [authPassword, setAuthPassword] = React.useState("");
  const [authSuccess, setAuthSuccess] = React.useState(false);

  // General Notification Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [toastType, setToastType] = React.useState<"success" | "info" | "error">("success");

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
    sellStepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    let baseValue = 65000;
    if (calcBrand.toLowerCase().includes("porsche") || calcBrand.toLowerCase().includes("ferrari")) {
      baseValue = 110000;
    } else if (calcBrand.toLowerCase().includes("mercedes") || calcBrand.toLowerCase().includes("bmw") || calcBrand.toLowerCase().includes("audi")) {
      baseValue = 55000;
    }

    const age = 2026 - parseInt(calcYear);
    const ageDepreciation = Math.max(0.1, 1 - (age * 0.08));
    const mileageDepreciation = Math.max(0.2, 1 - (mileageNum * 0.000005));
    
    const finalValue = Math.round(baseValue * ageDepreciation * mileageDepreciation);
    setCalcEstimatedValue(Math.max(12000, finalValue));
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
  const filteredCars = CARS_DATA.filter(car => {
    const matchesSearch = searchTerm === "" || 
      car.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
      car.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBrand = selectedBrand === "" || car.brand === selectedBrand;
    
    const matchesBudget = selectedBudget === 0 || car.price <= selectedBudget;
    
    const matchesBodyType = selectedBodyType === "All" || car.bodyType === selectedBodyType;

    return matchesSearch && matchesBrand && matchesBudget && matchesBodyType;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedBrand("");
    setSelectedBudget(0);
    setSelectedBodyType("All");
    triggerToast("All filters reset");
  };

  const faqData = faqs.map(f => ({
    q: f.question || f.q || "",
    a: f.answer || f.a || ""
  }));

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col font-sans selection:bg-[#2E7D32]/20 selection:text-[#2E7D32] pt-20 overflow-x-hidden">
      
      {/* Dynamic Toast Message */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm animate-bounce border",
          toastType === "error" 
            ? "bg-rose-950 border-rose-500/30 text-rose-100" 
            : toastType === "info" 
              ? "bg-slate-900 border-slate-700 text-slate-100" 
              : "bg-slate-950 border-[#2E7D32]/30 text-emerald-100"
        )}>
          <Sparkles className={cn(
            "h-5 w-5 shrink-0",
            toastType === "error" 
              ? "text-rose-400" 
              : toastType === "info" 
                ? "text-slate-400" 
                : "text-[#2E7D32]"
          )} />
          <p className="text-xs font-bold leading-tight">{toastMessage}</p>
        </div>
      )}

      {/* Custom Auth Modal Component */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        initialMode={authModal.mode}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          triggerToast(`Welcome back, ${user.name}!`);
          setCurrentView("role_dashboards");
          setAuthModal({ ...authModal, isOpen: false });
        }}
      />

      {/* 1. STICKY NAVBAR */}
      <Navbar 
        savedCount={savedCars.length} 
        onSavedClick={() => {
          if (currentView !== "home") {
            setCurrentView("home");
            setTimeout(scrollToInventory, 150);
          } else {
            scrollToInventory();
          }
        }}
        onSearchClick={() => {
          setCurrentView("buy_cars");
        }}
        onAuthClick={(mode) => setAuthModal({ isOpen: true, mode })}
        currentView={currentView}
        onViewChange={(view, pageId) => {
          setCurrentView(view);
          if (view === "custom_page" && pageId) {
            setSelectedPageId(pageId);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        currentUser={currentUser}
        onLogout={async () => {
          await supabase.auth.signOut();
          setCurrentUser(null);
          setCurrentView("home");
          triggerToast("Logged out successfully");
        }}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
      />

      {currentView === "buy_cars" ? (
        <BuyCarsView
          onViewDetails={(id) => {
            setActiveCarId(id);
            setCurrentView("car_details");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          savedCars={savedCars}
          onSaveToggle={toggleSaveCar}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
        />
      ) : currentView === "car_details" ? (
        <CarDetailsView
          carId={activeCarId}
          onBack={() => {
            setCurrentView("buy_cars");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onViewCar={(id) => {
            setActiveCarId(id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          savedCars={savedCars}
          onSaveToggle={toggleSaveCar}
          onNavigateToSalesPortal={() => {
            setCurrentView("sales_dashboard");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : currentView === "sales_dashboard" ? (
        <SalesDashboardView
          onBackToInventory={() => {
            setCurrentView("buy_cars");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : currentView === "sell_car" ? (
        <SellCarView
          onNavigateToDashboard={() => {
            if (currentUser) {
              setCurrentView("role_dashboards");
            } else {
              setAuthModal({ isOpen: true, mode: "login" });
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onBackToHome={() => {
            setCurrentView("buy_cars");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : currentView === "role_dashboards" ? (
        currentUser ? (
          <RoleDashboards
            currentUser={currentUser}
            onLogout={async () => {
              await supabase.auth.signOut();
              setCurrentUser(null);
              setCurrentView("home");
              triggerToast("Logged out successfully");
            }}
            onNavigateToInventory={() => {
              setCurrentView("buy_cars");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onReloadAllData={loadSettingsAndCMSData}
          />
        ) : (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl max-w-md mx-auto border border-slate-100 my-12">
            <Shield className="h-16 w-16 text-[#2E7D32] mb-4 animate-pulse" />
            <h3 className="text-2xl font-black text-slate-900">Access Restricted</h3>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              You must be signed in to access the private user & staff dashboards.
            </p>
            <Button
              onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
              className="bg-primary text-white font-extrabold text-xs tracking-wider uppercase rounded-full px-8 py-4"
            >
              Sign In To Continue
            </Button>
          </div>
        )
      ) : currentView === "firstmark_certification" ? (
        <FirstMarkCertification
          onBackToHome={() => {
            setCurrentView("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onNavigateToInventory={() => {
            setCurrentView("buy_cars");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : currentView === "custom_page" ? (
        <CustomPageView
          pageId={selectedPageId}
          onBackToHome={() => {
            setCurrentView("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : currentView === "error_404" ? (
        <Error404Page onGoHome={() => { setCurrentView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      ) : currentView === "error_500" ? (
        <Error500Page 
          onGoHome={() => { setCurrentView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
          onRetry={() => { setCurrentView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      ) : (
        <>
          {/* 2. HERO SECTION */}
      <Section bg="cream" className="relative py-8 md:py-12 lg:py-16 overflow-hidden">
        {/* Background elegance accents */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
            <div className="inline-flex">
              <Badge variant="premium" className="px-3.5 py-1 text-[11px] font-extrabold tracking-widest text-[#2E7D32] bg-[#2E7D32]/5 border border-[#2E7D32]/10 uppercase rounded-full">
                ★ {websiteSettings.brandSlogan || "1stMark Certified Luxury Marketplace"}
              </Badge>
            </div>
            
            <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 leading-[0.95]">
              {websiteSettings.heroTitle && websiteSettings.heroTitle !== "Certified Cars" ? (
                websiteSettings.heroTitle
              ) : (
                <>
                  Buy & Sell <br />
                  <span className="text-[#2E7D32] relative">
                    Certified Cars 
                    <span className="absolute left-0 bottom-1 w-full h-[6px] bg-[#2E7D32]/10 -z-10 rounded"></span>
                  </span> <br className="hidden sm:inline" />
                  With Total Confidence.
                </>
              )}
            </h1>
            
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-medium">
              {websiteSettings.heroSubtitle || "Inspired by rigorous pre-owned standards, reimagined for ultimate luxury. Explore 150-point inspected, hassle-free certified vehicles with single-owner pedigree, non-accident trust, and genuine km verification."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                onClick={() => {
                  setCurrentView("buy_cars");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold px-8 py-4 text-xs tracking-wider uppercase shadow-xl shadow-[#2E7D32]/25 group flex items-center justify-center rounded-full"
              >
                {websiteSettings.buyButtonText || "Buy Certified Cars"} 
                <ArrowRight className="h-4.5 w-4.5 ml-2.5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="secondary"
                onClick={scrollToSell}
                className="bg-white border border-slate-200/80 text-slate-900 font-extrabold px-8 py-4 text-xs tracking-wider uppercase hover:bg-slate-50 shadow-sm flex items-center justify-center rounded-full"
              >
                {websiteSettings.sellButtonText || "Sell Your Car"}
              </Button>
            </div>

            {/* Micro Trust points */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/60 max-w-lg">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[#2E7D32] tracking-tighter">1st-Owner</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Single Owned</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[#2E7D32] tracking-tighter">Accident-Free</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trusted Quality</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[#2E7D32] tracking-tighter">Genuine</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KM Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Hero Right Graphic */}
          <div className="lg:col-span-5 relative w-full flex items-center justify-center">
            {/* Elegant glassmorphism vehicle display box */}
            <div className="w-full max-w-md bg-white border border-white/90 shadow-2xl shadow-slate-200/60 rounded-[36px] p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#2E7D32]/10 rounded-full blur-2xl" />
              
              <div className="aspect-[4/3] w-full bg-slate-50 rounded-2xl flex flex-col justify-between p-6 relative overflow-hidden border border-slate-100">
                <div className="flex justify-between items-start z-10">
                  <Badge variant="premium" className="bg-[#2E7D32] text-white">1stMark Certified</Badge>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-white shadow-xs px-2.5 py-1 rounded-full">SPEC: ACTIVE</span>
                </div>

                {/* Minimalistic premium sports car silhouette mockup with pure SVG */}
                <div className="my-auto w-full max-w-[260px] mx-auto opacity-95 hover:scale-105 transition-transform duration-500">
                  <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-md">
                    {/* Car outline */}
                    <path d="M5 28C5 28 8 26 14 26C20 26 23 20 28 17C33 14 42 12 55 12C68 12 76 15 82 19C88 23 92 25 94 28C96 31 95 32 93 32H7" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    {/* Windshield */}
                    <path d="M54 13L68 19" stroke="#2E7D32" strokeWidth="1.2" strokeLinecap="round"/>
                    {/* Wheels */}
                    <circle cx="24" cy="30" r="6.5" fill="#FFFFFF" stroke="#2E7D32" strokeWidth="1.5" />
                    <circle cx="24" cy="30" r="2.5" fill="#2E7D32" />
                    <circle cx="74" cy="30" r="6.5" fill="#FFFFFF" stroke="#2E7D32" strokeWidth="1.5" />
                    <circle cx="74" cy="30" r="2.5" fill="#2E7D32" />
                    {/* Shadow underneath */}
                    <ellipse cx="49" cy="36" rx="42" ry="1.5" fill="#2E7D32" fillOpacity="0.12" />
                  </svg>
                </div>

                <div className="z-10 mt-auto flex justify-between items-end border-t border-slate-100 pt-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ASTON MARTIN</span>
                    <span className="text-lg font-black text-slate-900 tracking-tight">DB11 V8 Spec</span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-xs text-[#2E7D32] font-black tracking-tight">Est: ₹1,42,000/mo</span>
                    <span className="text-sm font-black text-slate-800">₹1,28,40,000</span>
                  </div>
                </div>
              </div>

              {/* Status checklist widget within right panel */}
              <div className="mt-5 space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-left text-xs font-semibold">
                <div className="flex items-center text-slate-700">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2E7D32] mr-2.5 shrink-0" />
                  <span>150-Point Inspection Checked & Approved</span>
                </div>
                <div className="flex items-center text-slate-700">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2E7D32] mr-2.5 shrink-0" />
                  <span>Verified History Reports Included</span>
                </div>
                <div className="flex items-center text-slate-700">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2E7D32] mr-2.5 shrink-0" />
                  <span>Includes 12-Month Mechanical Warranty</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE SEARCH BAR (Brand, Model, Budget) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-16">
          <div className="bg-white border border-slate-100/90 shadow-2xl shadow-slate-200/50 p-6 md:p-8 rounded-[32px] max-w-5xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#2E7D32]" />
            
            <div className="flex flex-col space-y-4 text-left">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 flex items-center">
                <Sliders className="h-4.5 w-4.5 mr-2 text-[#2E7D32]" /> {websiteSettings.filterHeadingText || "Find Your Certified Dream Car"}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Brand Selection */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Select Brand</label>
                  <select 
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      triggerToast(`Filtered listings to ${e.target.value || 'all brands'}`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider h-11 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all cursor-pointer"
                  >
                    <option value="">All Premium Brands</option>
                    {FAMOUS_BRANDS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Model / Keyword Search */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Search Model or Spec</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="e.g. Defender, e-tron, Carrera" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold pl-11 pr-4 h-11 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all"
                    />
                  </div>
                </div>

                {/* Budget Range Selection */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Max Budget</label>
                  <select 
                    value={selectedBudget}
                    onChange={(e) => {
                      setSelectedBudget(Number(e.target.value));
                      triggerToast(`Max budget filter updated`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold h-11 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all cursor-pointer"
                  >
                    <option value={0}>Any Price Point</option>
                    <option value={1500000}>Under ₹15 Lakhs</option>
                    <option value={3000000}>Under ₹30 Lakhs</option>
                    <option value={5000000}>Under ₹50 Lakhs</option>
                    <option value={10000000}>Under ₹1 Crore</option>
                  </select>
                </div>

                {/* CTA Action button */}
                <div className="md:col-span-2 pt-4 md:pt-0">
                  <label className="hidden md:block text-[10px] font-bold text-transparent mb-1.5">Search</label>
                  <Button 
                    onClick={() => {
                      setCurrentView("buy_cars");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full bg-[#2E7D32] text-white font-extrabold text-xs tracking-wider uppercase h-11 flex items-center justify-center rounded-xl"
                  >
                    {websiteSettings.searchButtonText || "Search"}
                  </Button>
                </div>
              </div>

              {/* Clear filters trigger if any is set */}
              {(searchTerm || selectedBrand || selectedBudget > 0) && (
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={clearFilters}
                    className="text-xs font-bold text-[#2E7D32] hover:underline flex items-center"
                  >
                    Reset Search Filters ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* 3. FEATURED CARS */}
      <Section ref={featuredCarsRef} bg="white" id="featured-cars" padding="lg" className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="premium">PREMIUM LIVE INVENTORY</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              {websiteSettings.buyCarsHeadingText || "Explore Our Handpicked Certified Fleet"}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {websiteSettings.buyCarsSubheadingText || "Every vehicle on this list is fully vetted and owned directly by 1stCars. Enjoy straightforward pricing, single-owner status, certified non-accident frames, and instant deliveries."}
            </p>
          </div>

          {/* Interactive Body Type Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto bg-slate-50 p-1.5 rounded-full border border-slate-200">
            {["All", "SUV", "Sedan", "Coupe"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedBodyType(type);
                  triggerToast(`Filtering by body type: ${type}`);
                }}
                className={`px-5 py-2 text-xs font-extrabold uppercase tracking-widest rounded-full transition-all cursor-pointer ${
                  selectedBodyType === type 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {type}s
              </button>
            ))}
          </div>

          {/* Grid of Listings */}
          {filteredCars.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {filteredCars.map((car) => {
                const isSaved = savedCars.includes(car.id);
                return (
                  <Card 
                    key={car.id} 
                    hoverEffect 
                    className="bg-white border border-white/80 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 flex flex-col justify-between"
                  >
                    {/* Upper Graphic Placeholder */}
                    <div className="relative aspect-video w-full bg-slate-100/80 flex items-center justify-center overflow-hidden group">
                      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent z-10" />
                      
                      {/* Certified Badge top left */}
                      <div className="absolute top-4 left-4 z-20">
                        <Badge variant="primary" className="bg-[#2E7D32] text-white font-extrabold text-[9px] uppercase shadow-md shadow-[#2E7D32]/20">
                          ✓ 1stMark Certified
                        </Badge>
                      </div>

                      {/* Heart Wishlist Trigger top right */}
                      <button
                        onClick={() => toggleSaveCar(car.id, `${car.brand} ${car.model}`)}
                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/95 text-slate-800 hover:text-red-500 hover:scale-110 shadow-md transition-all cursor-pointer"
                        aria-label="Save this Car"
                      >
                        <Heart className={`h-4.5 w-4.5 transition-colors ${isSaved ? "fill-red-500 text-red-500" : "text-slate-500"}`} />
                      </button>

                      {/* Custom styled mock-up background and outline rendering */}
                      <div className="w-full max-w-[180px] mx-auto z-10 group-hover:scale-105 transition-transform duration-500">
                        <svg viewBox="0 0 100 40" fill="none" className="w-full h-auto drop-shadow-md">
                          <path d="M5 28C5 28 8 26 14 26C20 26 23 20 28 17C33 14 42 12 55 12C68 12 76 15 82 19C88 23 92 25 94 28C96 31 95 32 93 32H7" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="24" cy="30" r="6.5" fill="#FFFFFF" stroke="#2E7D32" strokeWidth="1.5" />
                          <circle cx="74" cy="30" r="6.5" fill="#FFFFFF" stroke="#2E7D32" strokeWidth="1.5" />
                        </svg>
                      </div>

                      {/* Base Specifications label overlay */}
                      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                        <div className="text-white">
                          <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/80 uppercase">{car.brand}</span>
                          <h3 className="text-xl font-black tracking-tight">{car.model}</h3>
                        </div>
                        <span className="text-xs font-extrabold text-white/95 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                          {car.year}
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <CardHeader className="p-6 pb-0 space-y-3">
                      {/* Technical specifications blocks */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-100">
                        <div className="flex flex-col items-center">
                          <Gauge className="h-3.5 w-3.5 mb-1 text-[#2E7D32]/80" />
                          <span>{car.mileage.toLocaleString()} mi</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Fuel className="h-3.5 w-3.5 mb-1 text-[#2E7D32]/80" />
                          <span>{car.fuel}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Wrench className="h-3.5 w-3.5 mb-1 text-[#2E7D32]/80" />
                          <span className="truncate max-w-[65px]">{car.transmission}</span>
                        </div>
                      </div>

                      {/* Display pricing tags */}
                      <div className="flex justify-between items-end pt-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">EMI Starts From</span>
                          <span className="text-base font-black text-[#2E7D32] tracking-tight">₹{car.emi.toLocaleString("en-IN")}/mo</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Fixed Price</span>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tight">₹{car.price.toLocaleString("en-IN")}</h4>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Features checklist tags */}
                    <CardContent className="p-6 pt-4 space-y-3 flex-grow">
                      <div className="flex flex-wrap gap-1.5">
                        {car.specifications.map((spec, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            {spec}
                          </span>
                        ))}
                      </div>

                      {/* Location indicator */}
                      <div className="flex items-center text-xs text-slate-500 font-bold pt-2 border-t border-slate-100/80">
                        <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400 shrink-0" />
                        <span>{car.location}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 pt-0">
                      <Button 
                        onClick={() => {
                          setActiveCarId(car.id);
                          setCurrentView("car_details");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full bg-[#2E7D32] text-white hover:bg-[#25632a] font-extrabold text-xs tracking-wider uppercase py-3 rounded-xl flex items-center justify-center shadow-lg shadow-[#2E7D32]/10"
                      >
                        {websiteSettings.detailsButtonText || "Details & Booking"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl p-12 text-center max-w-xl mx-auto border border-slate-200">
              <HelpCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Vehicles Match Your Search</h3>
              <p className="text-sm text-slate-500 mt-2">
                We have new collector arrivals daily. Try clearing your search parameters, selecting "All body types," or resetting filters.
              </p>
              <Button onClick={clearFilters} className="mt-6 bg-[#2E7D32] text-white font-extrabold text-xs tracking-wider uppercase rounded-full">
                Show All Listings
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* 4. SELL IN 3 EASY STEPS */}
      <Section ref={sellStepsRef} id="sell-steps" bg="muted" padding="lg" className="border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-10">
            <Badge variant="secondary">SELL YOUR VEHICLE</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              Sell or Trade-In In 3 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              We leverage professional evaluators and an elite 1000+ dealer network. No listing hassle, no shady strangers, complete transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Steps & Direct Lead Form */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Step 1 Item */}
              <div className="flex items-start space-x-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
                <div className="h-12 w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-lg shrink-0">
                  01
                </div>
                <div className="space-y-3 flex-grow">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Book Free Online or Doorstep Inspection</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Fill out our micro evaluation form. Select your preferred date, time slot, and location (home, office, or our luxury inspection center).
                  </p>

                  {/* Inline Book Form */}
                  {bookSuccess ? (
                    <div className="bg-[#2E7D32]/5 border border-[#2E7D32]/15 p-4 rounded-2xl flex items-center space-x-3 text-[#2E7D32] animate-fade-in">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-bold">Successfully Scheduled! A concierge specialist will call you in 15 minutes.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleBookInspection} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input 
                          type="text" 
                          placeholder="Your Full Name" 
                          value={bookName}
                          onChange={(e) => setBookName(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                          required
                        />
                        <input 
                          type="tel" 
                          placeholder="Mobile Phone Number" 
                          value={bookPhone}
                          onChange={(e) => setBookPhone(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                          required
                        />
                        <input 
                          type="date" 
                          value={bookDate}
                          onChange={(e) => setBookDate(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-[#2E7D32] text-white hover:bg-[#25632a] text-[10px] font-extrabold uppercase tracking-widest py-2.5 rounded-xl shadow-md shadow-[#2E7D32]/10">
                        {websiteSettings.inspectionButtonText || "Book Instant Free Inspection"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Step 2 Item */}
              <div className="flex items-start space-x-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
                <div className="h-12 w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-lg shrink-0">
                  02
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Choose Your Sale Program</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Select your preferred way to sell:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-bold">
                    <li className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[#2E7D32] uppercase text-[10px] tracking-widest block mb-1">OPTION 1</span>
                      <span className="text-slate-800 block">Instant Offer</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-1">Direct cash purchase by 1stCars.</span>
                    </li>
                    <li className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[#2E7D32] uppercase text-[10px] tracking-widest block mb-1">OPTION 2</span>
                      <span className="text-slate-800 block">Dealer Auction</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-1">1,000+ premium dealers bid live.</span>
                    </li>
                    <li className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[#2E7D32] uppercase text-[10px] tracking-widest block mb-1">OPTION 3</span>
                      <span className="text-slate-800 block">Park & Sell</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-1">Consign securely in showroom.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 3 Item */}
              <div className="flex items-start space-x-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
                <div className="h-12 w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-lg shrink-0">
                  03
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Get Paid Instantly & Same-Day</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Once evaluation checks complete, you receive instant bank transfer, full loan settlement service, and zero liability transfer. We handle all complex DMV transfer paperwork free of charge!
                  </p>
                </div>
              </div>

            </div>

            {/* Instant Valuation Calculator Widget */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-white border border-slate-100/90 shadow-2xl shadow-slate-200/50 p-6 md:p-8 rounded-[36px] text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#2E7D32]/5 rounded-full blur-2xl" />
                
                <div className="space-y-4 mb-6">
                  <Badge variant="premium" className="bg-amber-500 text-white">VIP VALUATION LOGIC</Badge>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Instant Car Value Estimator</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Input your vehicle specification below to calculate our estimated initial trade-in value based on global live market auctions.
                  </p>
                </div>

                {calcError && (
                  <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-xl border border-red-100 mb-4">
                    ✕ {calcError}
                  </div>
                )}

                <form onSubmit={handleCalculateValuation} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Vehicle Brand / Model</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Porsche 911, Audi Q8" 
                        value={calcBrand}
                        onChange={(e) => setCalcBrand(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Model Year</label>
                        <select 
                          value={calcYear}
                          onChange={(e) => setCalcYear(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold h-10 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]/20 cursor-pointer"
                        >
                          {["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"].map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">KM / Miles Driven</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 15000" 
                          value={calcMileage}
                          onChange={(e) => setCalcMileage(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 h-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-[#2E7D32] text-white hover:bg-[#25632a] font-extrabold text-xs tracking-wider uppercase py-3.5 rounded-xl shadow-lg shadow-[#2E7D32]/10">
                    {websiteSettings.valuationButtonText || "Get Instant Valuation"}
                  </Button>
                </form>

                {calcEstimatedValue !== null && (
                  <div className="mt-6 bg-[#2E7D32]/5 border border-[#2E7D32]/15 p-5 rounded-3xl text-center space-y-2 animate-in slide-in-from-bottom-3 duration-300">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2E7D32]">Estimated Instant Offer Value</span>
                    <h4 className="text-3xl font-black text-[#2E7D32] tracking-tighter">₹{calcEstimatedValue.toLocaleString("en-IN")}</h4>
                    <p className="text-[10px] font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
                      This represents a high-grade trade-in estimate. Book your doorstep inspection today to lock in your live offer!
                    </p>
                    <div className="pt-2">
                      <Button 
                        onClick={() => {
                          setBookName(calcBrand ? `Owner of ${calcBrand}` : "");
                          triggerToast("Book inspection form pre-filled!");
                        }}
                        size="sm" 
                        className="bg-[#2E7D32] text-white text-[10px] font-extrabold px-4 py-2"
                      >
                        Lock In This Offer
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </Section>

      {/* 5. WHY CHOOSE 1STMARK CERTIFIED */}
      <Section id="certified-benefits" bg="white" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="premium">THE TRUST BLUEPRINT</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              Why Choose 1stMark Certified?
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              We engineered a rigorous quality benchmark to remove the friction, anxiety, and guesswork of buying pre-owned luxury.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            
            {/* Benefit 1 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">150+ Point Certificate</h3>
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
                      setCurrentView("firstmark_certification");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-[#2E7D32] hover:text-[#25632a] text-xs font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                  >
                    View Certification Process <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>

            {/* Benefit 2 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">12-Month Premium Warranty</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Every 1stMark Certified vehicle includes complimentary 1-Year/15,000-mile comprehensive mechanical breakdown coverage for peace of mind.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Complimentary Coverage</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Engine & Gearbox Protection</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Roadside Assistance Included</div>
                </div>
              </div>
            </Card>

            {/* Benefit 3 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">DMV & RC Transfer Assistance</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  We assign a dedicated concierge agent who processes all ownership, DMV registration, transfer titles, and custom license plates on your behalf.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> 100% Free Processing</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Zero DMV Queue Anxiety</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Pre-approved Finance Titles</div>
                </div>
              </div>
            </Card>

            {/* Benefit 4 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Verified & Clean History</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  We verify ownership history, insurance claims, odometer readings, and past service logs with CARFAX so there are no surprise skeletons.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Certified Clean Titles Only</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> No Accidental History</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Transparent Log Reports</div>
                </div>
              </div>
            </Card>

            {/* Benefit 5 */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Elite Finance & Low EMI</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Pre-approved corporate loans, flexible high-tenure repayment structures, and quick 30-minute approval with tier-1 partner banks.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Low 4.2% Interest Rates</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Instant Online Approvals</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Flexible Zero Downpayment options</div>
                </div>
              </div>
            </Card>

            {/* Benefit 6 (Sourcing Concept to complete the layout grid beautifully) */}
            <Card hoverEffect className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-slate-200/40">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Exclusive Concierge Hub</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Can't find a vehicle in our current live fleet? Our private sourcing brokers scour dealer networks nationwide to locate your exact requested specification.
                </p>
                <div className="pt-2 space-y-1.5 text-[11px] font-extrabold text-slate-600">
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Global Luxury Sourcing</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Private Dealer Network</div>
                  <div className="flex items-center"><Check className="h-3.5 w-3.5 text-[#2E7D32] mr-2" /> Custom Interior & Color Match</div>
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
            <Badge variant="secondary">VIP CLUB FEEDBACK</Badge>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              Loved By Drivers & Collectors
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              We have completed over 4,500 doorstep premium deliveries. Read reviews from verified luxury car owners.
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

      {/* 7. FAQ */}
      <Section id="about-section" bg="white" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* FAQ Left Column */}
            <div className="lg:col-span-4 text-left space-y-4">
              <Badge variant="premium">COMMONLY ASKED</Badge>
              <h2 className="font-sans text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight">
                Got Questions? We Have Vetted Answers.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Learn more about our pre-owned certifications, trade-in programs, delivery schedules, and transparent luxury transaction details.
              </p>
              <div className="pt-4">
                <a 
                  href="#contact-section" 
                  className="inline-flex items-center text-xs font-black uppercase tracking-wider text-[#2E7D32] hover:underline"
                >
                  Still Unsure? Contact Concierge <ArrowRight className="h-4 w-4 ml-1.5" />
                </a>
              </div>
            </div>

            {/* FAQ Accordions Right Column */}
            <div className="lg:col-span-8 space-y-4 text-left">
              {faqData.map((faq, idx) => {
                const isExpanded = expandedFaq === idx;
                return (
                  <div 
                    key={idx}
                    className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden transition-all duration-300"
                  >
                    <button
                      onClick={() => {
                        setExpandedFaq(isExpanded ? null : idx);
                        triggerToast(`FAQ toggled`);
                      }}
                      className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                    >
                      <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                        {faq.q}
                      </span>
                      <ChevronDown className={`h-4.5 w-4.5 text-[#2E7D32] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-5 text-xs text-slate-600 font-semibold leading-relaxed animate-in slide-in-from-top-2 duration-200 border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </Section>

      {/* 8. CTA SECTION */}
      <Section id="contact-section" bg="dark" className="relative py-10 md:py-16 bg-linear-to-b from-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#2E7D32]/5 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="premium" className="bg-[#2E7D32] text-white border-none shadow-md shadow-[#2E7D32]/25">
              REQUEST ACCESS NOW
            </Badge>
            <h2 className="font-sans text-3xl md:text-5xl font-black tracking-tighter text-white leading-none">
              Ready to Drive Your Certified Vehicle?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold max-w-lg mx-auto leading-relaxed">
              Contact our Los Angeles concierge center to schedule a private showroom tour, request home evaluation, or register for rare classic car arrivals.
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

      {/* 9. PREMIUM FOOTER */}
      <Footer onViewChange={(view) => {
        setCurrentView(view);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }} />

    </div>
  );
}
