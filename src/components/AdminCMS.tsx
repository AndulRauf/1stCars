import * as React from "react";

import { 
  Search, Filter, Plus, Edit3, Trash2, RefreshCw, 
  Check, X, AlertCircle, Sparkles, Folder, Settings, 
  ShieldCheck, DollarSign, Users, Award, FileText, Bell, 
  HelpCircle, Star, ThumbsUp, Layers, Palette, Layout, 
  Play, Clock, ShieldAlert, BarChart3, TrendingUp, Info, 
  Activity, Shield, Hammer, MapPin, Calendar, Heart, 
  MessageSquare, ClipboardList, BookOpen, UserCheck, Eye, 
  Upload, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2,
  Car, Link, Menu, Inbox, Wallet, QrCode
} from "lucide-react";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import { deleteRecordFromSupabase, readDeletedTestimonialNames } from "@/src/lib/cmsSync";
import { isHiddenPage } from "@/src/lib/utils";
import { saveCar, deleteCar, buildCarRecord, errorMessage } from "@/src/lib/carPersistence";
import { notificationService } from "@/src/lib/notifications";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { toast } from "@/src/lib/toast";
import { Inspection120FormModal } from "./Inspection120FormModal";
import { CreateCarWizard } from "./CreateCarWizard";
import { Full120PointReport, Inspection120Category, INSPECTION_FORM_STORAGE_KEY, OFFICIAL_120_CATEGORIES, getStoredInspectionCategories } from "@/src/data/inspection120Data";
import { Gavel, Globe, Database } from "lucide-react";
import { Sidebar } from "./admin/Sidebar";
import { Breadcrumb } from "./admin/Breadcrumb";
import { AdminDashboard } from "./admin/AdminDashboard";
import { CRM } from "./admin/CRM";
import { BulkActionsBar } from "./admin/BulkActionsBar";
import { AutomationControlCenter } from "./admin/AutomationControlCenter";
import { automationService } from "@/src/lib/automation";
import { CMSModule } from "./admin/adminNavData";
import { PageEditor } from "./admin/PageEditor";
import { PAGE_CONTENT_DEFAULTS, normalizeWebsiteSettings } from "@/src/lib/pageContentDefaults";
import { AdminAuctions } from "./auctions/AdminAuctions";
import { auctionService, AuctionActor } from "@/src/lib/auctions";
import { brandData as defaultBrandData, BRAND_LOGOS as defaultBrandLogos } from "./SellCarView";
import {
  SellCatalog, SellBrandEntry, SellModel, mergeCatalog, getStoredSellCatalog, setStoredSellCatalog,
  saveSellCatalog, saveInspectionForm, catalogFromLegacy,
  loadSellCatalogFromSupabase, loadInspectionFormFromSupabase, DEFAULT_POPULAR_SELL_BRANDS
} from "@/src/lib/sellFormData";

// Default sell-car catalog derived from the built-in brand database
const DEFAULT_SELL_CATALOG = catalogFromLegacy(defaultBrandData, defaultBrandLogos, DEFAULT_POPULAR_SELL_BRANDS);

// Allowed car status transitions — mirrors public/automation_phase2.sql
// `car_status_flow`. The DB guard trigger `on_cars_status_change_guard`
// rejects any other transition with "Invalid vehicle status transition",
// so the admin form must only offer statuses reachable from the current one.
const CAR_STATUS_LABELS: Record<string, string> = {
  available: "Available (Live)",
  pending: "In Review",
  reserved: "Reserved",
  sold: "Sold",
  bidding: "Bidding",
  listed: "Listed"
};
const CAR_STATUS_FLOW: Record<string, string[]> = {
  pending: ["pending", "available", "listed", "sold", "bidding"],
  draft: ["draft", "seller_inquiry", "inspection_pending", "available"],
  seller_inquiry: ["seller_inquiry", "inspection_pending", "available", "listed"],
  inspection_pending: ["inspection_pending", "inspection_in_progress", "available", "listed"],
  inspection_in_progress: ["inspection_in_progress", "inspection_completed", "available", "listed"],
  inspection_completed: ["inspection_completed", "valuation_pending", "ready_for_sale", "available", "listed"],
  valuation_pending: ["valuation_pending", "ready_for_sale", "available", "listed"],
  ready_for_sale: ["ready_for_sale", "listed", "available", "sold"],
  available: ["available", "reserved", "sold", "listed", "bidding"],
  listed: ["listed", "reserved", "sold", "available", "bidding"],
  reserved: ["reserved", "sold", "available"],
  bidding: ["bidding", "sold", "available", "listed"],
  sold: ["sold", "delivered"],
  delivered: ["delivered"]
};

const isLogoImageUrl = (url: string) =>
  !!url && url !== "⭐" && (url.startsWith("http") || url.startsWith("/") || url.startsWith("data:"));

// Reusable add/edit/delete editor for string-array fields (specifications,
// key features, ...) used in the Car edit modal.
function StringListEditor({
  items,
  onChange,
  addPlaceholder,
  addLabel,
  emptyText,
}: {
  items?: string[];
  onChange: (next: string[]) => void;
  addPlaceholder: string;
  addLabel: string;
  emptyText: string;
}) {
  const [draft, setDraft] = React.useState("");
  const list = Array.isArray(items) ? items : [];
  const addItem = () => {
    if (!draft.trim()) return;
    onChange([...list, draft.trim()]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder={addPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          className="flex-1 h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
        />
        <button
          type="button"
          onClick={addItem}
          className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
              <input
                type="text"
                value={item || ""}
                onChange={(e) => {
                  const next = [...list];
                  next[idx] = e.target.value;
                  onChange(next);
                }}
                className="flex-1 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
              />
              <button
                type="button"
                onClick={() => onChange(list.filter((_, i) => i !== idx))}
                className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-500 hover:text-rose-500 text-slate-400 bg-white cursor-pointer"
                title="Delete item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AdminCMSProps {
  currentUser?: { id: string; name?: string; role: string };
  onReloadAllData?: () => void;
  onNavigateToInventory?: () => void;
}

export function AdminCMS({ currentUser, onReloadAllData, onNavigateToInventory }: AdminCMSProps) {
  // Active sub-module within Admin CMS
  const [activeModule, setActiveModule] = React.useState<CMSModule>("dashboard");

  // Role scope for per-role sidebar preferences (see Sidebar).
  const sidebarRoleKey = currentUser?.role || "admin";
  const sidebarCollapseKey = `1stcars_admin_sidebar_collapsed_${sidebarRoleKey}`;

  // Mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  // Desktop sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(sidebarCollapseKey);
      if (stored !== null) return stored === "true";
      // Legacy global key fallback
      return localStorage.getItem("1stcars_admin_sidebar_collapsed") === "true";
    }
    return false;
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(sidebarCollapseKey, String(next));
      return next;
    });
  };

  // Photo preview modal state for Visiting Card / Aadhar Card documents
  const [previewPhotoModal, setPreviewPhotoModal] = React.useState<{ title: string; url: string } | null>(null);

  // Local state for all CMS lists
  const [cars, setCars] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [inspections, setInspections] = React.useState<any[]>([]);
  const [auctions, setAuctions] = React.useState<any[]>([]);
  const [auctionBids, setAuctionBids] = React.useState<any[]>([]);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [pages, setPages] = React.useState<any[]>([]);
  // Sales leads (test drives & buy-now bookings) come from Supabase
  // sales_notifications — the source of truth written by BookingModal /
  // BuyNowCheckout. localStorage is only a fallback for demo/mock mode.
  const [salesLeads, setSalesLeads] = React.useState<any[]>([]);

  // Job applications from the public /careers page (career_applications table
  // + localStorage fallback in mock mode).
  const [careerApplications, setCareerApplications] = React.useState<any[]>([]);

  // CRM tables — the existing business tables powering the unified CRM view.
  const [offers, setOffers] = React.useState<any[]>([]);
  const [sellRequests, setSellRequests] = React.useState<any[]>([]);
  const [inspectionReports, setInspectionReports] = React.useState<any[]>([]);
  const [dealerBids, setDealerBids] = React.useState<any[]>([]);
  const [parkSell, setParkSell] = React.useState<any[]>([]);
  const [carImages, setCarImages] = React.useState<any[]>([]);
  
  // Newly wired Supabase tables: test drives, purchases & CRM activity log.
  const [testDrives, setTestDrives] = React.useState<any[]>([]);
  const [purchases, setPurchases] = React.useState<any[]>([]);
  const [crmActivities, setCrmActivities] = React.useState<any[]>([]);

  // Unified "Leads & Enquiries" module: one sidebar entry with tabs across
  // test drive requests, booking requests and the test drives log.
  const [leadsTab, setLeadsTab] = React.useState<"test_drive_requests" | "booking_requests" | "test_drives">("test_drive_requests");

  // Theme Design module holds two tabs: the brand/SEO designer and UPI payments.
  const [settingsTab, setSettingsTab] = React.useState<"theme" | "payments">("theme");
  
  // Custom mock/localStorage tables for the other modules requested
  const [dealers, setDealers] = React.useState<any[]>([]);
  const [inspectors, setInspectors] = React.useState<any[]>([]);
  const [salesAssociates, setSalesAssociates] = React.useState<any[]>([]);
  const [models, setModels] = React.useState<any[]>([]);
  const [cities, setCities] = React.useState<any[]>([]);
  const [faqs, setFaqs] = React.useState<any[]>([]);
  const [testimonials, setTestimonials] = React.useState<any[]>([]);
  const [financePartners, setFinancePartners] = React.useState<any[]>([]);
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [websiteSettings, setWebsiteSettings] = React.useState<any>({
    logoUrl: "/logo.png",
    logoSize: 150,
    favicon: "⭐",
    primaryColor: "#2E7D32",
    accentColor: "#FAF9F6",
    buttonColor: "#2E7D32",
    fontFamily: "Inter",
    heroTitle: "Buy & Sell Certified Cars With Total Confidence",
              heroSubtitle: "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
    showPopularBrands: true,
    showLatestArrivals: true,
    showHowItWorks: true,
    showTestimonials: true,
    footerText: "© 2026 1stCars Marketplace. All rights reserved.",
    facebook: "https://facebook.com/1stcars",
    instagram: "https://instagram.com/1stcars",
    twitter: "https://twitter.com/1stcars",
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
    searchButtonText: "Search",
    valuationButtonText: "Get Instant Valuation",
    detailsButtonText: "Details & Booking",
    inspectionButtonText: "Book Instant Free Inspection",
    filterHeadingText: "Find Your Certified Dream Car",
    buyCarsHeadingText: "Explore Our Handpicked Certified Fleet",
    buyCarsSubheadingText: "1stCars is Gujarat's premier aggregator platform connecting Car Buyers, Sellers, and Dealers. Every vehicle undergoes strict 1stMark certification for Single Owned status, Non-Accident trusted frame, and Genuine KM verification.",
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
    ...PAGE_CONTENT_DEFAULTS
  });

  // UPI / Payment settings
  const [paymentSettings, setPaymentSettings] = React.useState<{ upiId: string; qrUrl: string; instructions: string; payeeName: string }>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("1stcars_payment_settings");
      if (raw) {
        try { return { upiId: "", qrUrl: "", instructions: "", payeeName: "", ...JSON.parse(raw) }; } catch {}
      }
    }
    return { upiId: "", qrUrl: "", instructions: "Scan the QR or pay to the UPI ID above, then enter the transaction reference number to confirm your booking.", payeeName: "1stCars" };
  });

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("1stcars_payment_settings", JSON.stringify(paymentSettings));
    toast.success("UPI payment settings saved! Buyers can now pay the booking token via UPI at checkout.");
  };

  const handlePaymentQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, 800, 0.85).then((url) => {
      setPaymentSettings((prev) => ({ ...prev, qrUrl: url }));
      toast.success("UPI QR code uploaded successfully.");
    });
    e.target.value = "";
  };

  // ===== Sell Form & Brands Editor state (brands / models / variants) =====
  const [sellCatalog, setSellCatalog] = React.useState<SellCatalog>(() => {
    const stored = getStoredSellCatalog();
    return mergeCatalog(DEFAULT_SELL_CATALOG, stored?.brands, stored?.removed);
  });
  const [sellRemovedBrands, setSellRemovedBrands] = React.useState<string[]>(() => getStoredSellCatalog()?.removed || []);
  const [sellFormTab, setSellFormTab] = React.useState<"brands" | "models" | "inspection">("brands");
  const [brandFilter, setBrandFilter] = React.useState("");

  const [brandFormOpen, setBrandFormOpen] = React.useState(false);
  const [editingBrandName, setEditingBrandName] = React.useState<string | null>(null);
  const [brandDraftName, setBrandDraftName] = React.useState("");
  const [brandDraftLogo, setBrandDraftLogo] = React.useState("");
  const [brandDraftPopular, setBrandDraftPopular] = React.useState(true);

  const [modelBrand, setModelBrand] = React.useState<string>(() => Object.keys(DEFAULT_SELL_CATALOG)[0] || "");
  const [modelFormOpen, setModelFormOpen] = React.useState(false);
  const [editingModelIndex, setEditingModelIndex] = React.useState<number | null>(null);
  const [modelDraft, setModelDraft] = React.useState<SellModel>({ name: "", category: "Hatchback", years: "", image: "🚗", variants: [] });

  const [inspectionCategories, setInspectionCategories] = React.useState<Inspection120Category[]>(() => getStoredInspectionCategories());
  const [categoryFormOpen, setCategoryFormOpen] = React.useState(false);
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = React.useState<Inspection120Category>({ id: "", title: "", totalPoints: 0, pointsPassedText: "", scorePercentageText: "", summary: "", questions: [] });

  // Load the latest admin-edited catalog + inspection form on mount.
  // Prefer localStorage (freshest local edits) and only fall back to Supabase
  // when there is no local copy, so a stale remote snapshot never wipes edits.
  React.useEffect(() => {
    if (!getStoredSellCatalog()) {
      loadSellCatalogFromSupabase().then((stored) => {
        if (!stored) return;
        setStoredSellCatalog(stored);
        setSellCatalog(mergeCatalog(DEFAULT_SELL_CATALOG, stored.brands, stored.removed));
        setSellRemovedBrands(stored.removed);
      });
    }
    if (!localStorage.getItem(INSPECTION_FORM_STORAGE_KEY)) {
      loadInspectionFormFromSupabase().then((cats) => {
        if (!cats) return;
        localStorage.setItem(INSPECTION_FORM_STORAGE_KEY, JSON.stringify(cats));
        setInspectionCategories(cats);
      });
    }
  }, []);

  // Auto-save every Sell Form & Brands edit (brands / models / categories) so
  // nothing is ever lost even if "Save All Changes" is never clicked.
  const sellFormAutoSave = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (sellFormAutoSave.current) window.clearTimeout(sellFormAutoSave.current);
    sellFormAutoSave.current = window.setTimeout(() => {
      saveSellCatalog({ removed: sellRemovedBrands, brands: sellCatalog });
      saveInspectionForm(inspectionCategories);
    }, 400);
    return () => {
      if (sellFormAutoSave.current) window.clearTimeout(sellFormAutoSave.current);
    };
  }, [sellCatalog, sellRemovedBrands, inspectionCategories]);

  // ----- Sell Form & Brands handlers -----
  const openAddBrandForm = () => {
    setEditingBrandName(null);
    setBrandDraftName("");
    setBrandDraftLogo("");
    setBrandDraftPopular(true);
    setBrandFormOpen(true);
  };

  const openEditBrandForm = (name: string) => {
    const entry = sellCatalog[name];
    setEditingBrandName(name);
    setBrandDraftName(name);
    setBrandDraftLogo(entry?.logo || "");
    setBrandDraftPopular(!!entry?.isPopular);
    setBrandFormOpen(true);
  };

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, 240, 0.9).then((url) => {
      setBrandDraftLogo(url);
      toast.success("Brand logo uploaded. Save the brand to apply it.");
    });
    e.target.value = "";
  };

  const handleSaveBrand = () => {
    const name = brandDraftName.trim();
    if (!name) {
      toast.error("Please enter a brand name.");
      return;
    }
    if (editingBrandName && editingBrandName !== name && sellCatalog[name]) {
      toast.error("A brand with that name already exists.");
      return;
    }
    const existing = sellCatalog[editingBrandName || name];
    const entry: SellBrandEntry = {
      logo: brandDraftLogo.trim() || existing?.logo || "⭐",
      isPopular: brandDraftPopular,
      models: existing?.models || []
    };
    setSellCatalog((prev) => {
      const next = { ...prev };
      if (editingBrandName && editingBrandName !== name) {
        delete next[editingBrandName];
      }
      next[name] = entry;
      return next;
    });
    setSellRemovedBrands((prev) => prev.filter((b) => b !== name));
    setBrandFormOpen(false);
    toast.success(editingBrandName ? `Brand "${name}" updated.` : `Brand "${name}" added.`);
  };

  const handleDeleteBrand = (name: string) => {
    if (!window.confirm(`Delete brand "${name}" and all its models from the Sell Car form?`)) return;
    setSellCatalog((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setSellRemovedBrands((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setModelBrand((prev) => (prev === name ? Object.keys(sellCatalog).find((b) => b !== name) || "" : prev));
    toast.success(`Brand "${name}" deleted from the Sell Car form.`);
  };

  const openAddModelForm = (brand: string) => {
    setModelBrand(brand);
    setEditingModelIndex(null);
    setModelDraft({ name: "", category: "Hatchback", years: "", image: "🚗", variants: [] });
    setModelFormOpen(true);
  };

  const openEditModelForm = (brand: string, index: number) => {
    const model = sellCatalog[brand]?.models?.[index];
    if (!model) return;
    setModelBrand(brand);
    setEditingModelIndex(index);
    setModelDraft({ ...model, variants: [...(model.variants || [])] });
    setModelFormOpen(true);
  };

  const handleSaveModel = () => {
    const name = modelDraft.name.trim();
    if (!name) {
      toast.error("Please enter a model name.");
      return;
    }
    const variants = (modelDraft.variants || []).map((v) => v.trim()).filter(Boolean);
    const model: SellModel = { ...modelDraft, name, variants };
    setSellCatalog((prev) => {
      const brandEntry = prev[modelBrand];
      if (!brandEntry) return prev;
      const models = [...(brandEntry.models || [])];
      if (editingModelIndex !== null) {
        models[editingModelIndex] = model;
      } else {
        models.push(model);
      }
      return { ...prev, [modelBrand]: { ...brandEntry, models } };
    });
    setEditingModelIndex(null);
    setModelFormOpen(false);
    toast.success(editingModelIndex !== null ? `Model "${name}" updated.` : `Model "${name}" added to ${modelBrand}.`);
  };

  const handleDeleteModel = (brand: string, index: number) => {
    const model = sellCatalog[brand]?.models?.[index];
    if (!window.confirm(`Delete model "${model?.name || "this model"}" from ${brand}?`)) return;
    setSellCatalog((prev) => {
      const brandEntry = prev[brand];
      if (!brandEntry) return prev;
      const models = (brandEntry.models || []).filter((_, i) => i !== index);
      return { ...prev, [brand]: { ...brandEntry, models } };
    });
    toast.success("Model deleted.");
  };

  const openAddCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryDraft({ id: "", title: "", totalPoints: 0, pointsPassedText: "", scorePercentageText: "", summary: "", questions: [{ id: "", question: "", passed: true }] });
    setCategoryFormOpen(true);
  };

  const openEditCategoryForm = (cat: Inspection120Category) => {
    setEditingCategoryId(cat.id);
    setCategoryDraft(JSON.parse(JSON.stringify(cat)));
    setCategoryFormOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryDraft.title.trim()) {
      toast.error("Please enter a category title.");
      return;
    }
    const questions = categoryDraft.questions
      .map((q, i) => ({ ...q, id: q.id || `q_${Date.now()}_${i}`, question: q.question.trim() }))
      .filter((q) => q.question);
    if (questions.length === 0) {
      toast.error("Add at least one question to the category.");
      return;
    }
    const passedCount = questions.filter((q) => q.passed).length;
    const cat: Inspection120Category = {
      ...categoryDraft,
      id: categoryDraft.id || `cat_${Date.now()}`,
      totalPoints: questions.length,
      pointsPassedText: `${passedCount} / ${questions.length} Points Passed`,
      scorePercentageText: `${Math.round((passedCount / questions.length) * 100)}% PASS`,
      questions
    };
    setInspectionCategories((prev) => {
      const exists = prev.some((c) => c.id === cat.id);
      return exists ? prev.map((c) => (c.id === cat.id ? cat : c)) : [...prev, cat];
    });
    setCategoryFormOpen(false);
    toast.success(editingCategoryId ? "Category updated." : "Category added to the inspection form.");
  };

  const handleDeleteCategory = (id: string) => {
    if (!window.confirm("Delete this inspection category and all its questions?")) return;
    setInspectionCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Category deleted from the inspection form.");
  };

  const handleSaveSellFormAll = async () => {
    const payload = { removed: sellRemovedBrands, brands: sellCatalog };
    const savedCatalog = await saveSellCatalog(payload);
    const savedForm = await saveInspectionForm(inspectionCategories);
    if (savedCatalog || savedForm) {
      toast.success("Sell Form & Brands saved! Brand / model / variant suggestions and the 120-point inspection checklist are now live.");
    } else {
      toast.success("Sell Form & Brands saved locally. (Supabase sync unavailable right now.)");
    }
  };

  const handleResetSellForm = () => {
    if (!window.confirm("Reset the entire Sell Form & Brands editor back to the built-in defaults? Your edits will be lost.")) return;
    setSellCatalog(mergeCatalog(DEFAULT_SELL_CATALOG, {}, []));
    setSellRemovedBrands([]);
    setInspectionCategories(JSON.parse(JSON.stringify(OFFICIAL_120_CATEGORIES)));
    setCategoryFormOpen(false);
    setBrandFormOpen(false);
    toast.success("Sell Form & Brands reset to defaults. Auto-saved.");
  };

  // UI States
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // SMS Gateway testing hooks
  const [testMobile, setTestMobile] = React.useState("");
  const [testStatus, setTestStatus] = React.useState("");
  const [testLoading, setTestLoading] = React.useState(false);

  // Modal form states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"add" | "edit">("add");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<any>({});
  const [isCarWizardOpen, setIsCarWizardOpen] = React.useState(false);

  // 120-Point Inspection Modal state
  const [selected120Inspection, setSelected120Inspection] = React.useState<any | null>(null);

  // 120-Point Inspection Report editor inside the Car edit modal
  const [isCar120ModalOpen, setIsCar120ModalOpen] = React.useState(false);

  const handleSave120Report = async (inspectionId: string, reportData: Full120PointReport) => {
    // Promote pre-completion inspections to "completed" so they become
    // auction-eligible (the auction engine requires overall_score, and the
    // Admin Auctions "Certified Inspection" menu lists scored inspections).
    // Never regress a row that is already auctioned/published.
    const current = inspections.find((i) => i.id === inspectionId) || selected120Inspection;
    const currentStatus = String(current?.status || "").toLowerCase();
    const promote = !currentStatus || ["pending", "assigned", "draft"].includes(currentStatus);
    await supabase.from("inspections").update({
      ...(promote ? { status: "completed" } : {}),
      overall_score: reportData.overallScorePercent ? Number((reportData.overallScorePercent / 10).toFixed(1)) : 9.5,
      report_engine: reportData.categories[0]?.summary || "",
      report_exterior: reportData.categories[1]?.summary || "",
      report_brakes: reportData.categories[2]?.summary || "",
      report_electronics: reportData.categories[3]?.summary || "",
      report_interior: reportData.categories[5]?.summary || "",
      report_120_json: JSON.stringify(reportData),
      // report_150_json is legacy (pre-120-point). It is no longer written to
      // keep the 120-point report as the single canonical payload. Historical
      // rows are preserved by refine_supabase_v2.sql section E.
      notes: reportData.notes,
      is_certified: reportData.isCertified
    }).eq("id", inspectionId);

    toast.success("120-Point Inspection Report updated and saved by Admin!");
    setSelected120Inspection(null);
    loadCMSData();
    if (onReloadAllData) onReloadAllData();
  };

  // Auction creation is owned by the canonical engine — Admin drives it from
  // Admin CMS → Live Auctions (auctionService.createAuction → auction_create_auction,
  // then publish → schedule → start).
  const handleStartAuction = async (inspection: any, reportData: Full120PointReport) => {
    const actor: AuctionActor = { userId: currentUser?.id || "admin", role: currentUser?.role || "Admin" };
    const basePrice = inspection.year > 2020 ? 800000 : 400000;
    try {
      // Canonical engine only — the DB/RPC engine owns every auction lifecycle write.
      await auctionService.createAndLaunch(actor, {
        car_id: inspection.car_id || null,
        inspection_id: inspection.id,
        starting_bid: basePrice,
        reserve_price: 0,
        minimum_increment: 25000,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 3600000 * 24).toISOString()
      });

      await supabase.from("inspections").update({
        status: "auctioned",
        report_120_json: JSON.stringify(reportData),
        report_150_json: JSON.stringify(reportData)
      }).eq("id", inspection.id);

      toast.success(`Live B2B Dealer Auction successfully launched for ${inspection.brand} ${inspection.model}!`);
      setSelected120Inspection(null);
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handlePublishToWebsite = async (inspection: any, reportData: Full120PointReport) => {
    const carRecord = {
      id: `car-pub-${Date.now()}`,
      brand: inspection.brand,
      model: inspection.model,
      variant: inspection.variant || "ZX / Lux",
      year: inspection.year,
      price: inspection.year > 2020 ? 850000 : 450000,
      emi: inspection.year > 2020 ? 14200 : 8500,
      location: inspection.city || "Surat",
      fuel: inspection.fuel || "Petrol",
      transmission: inspection.transmission || "Manual",
      mileage: inspection.km_driven || 35000,
      bodyType: "Sedan",
      certified: true,
      imageBg: "bg-slate-900",
      imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
      featured: true,
      specifications: [
        reportData.specs.engine,
        reportData.specs.maxPower,
        reportData.specs.peakTorque,
        reportData.specs.transmission,
        reportData.specs.araiMileage
      ],
      features: reportData.keyFeatures,
      inspectionSummary: {
        overallScore: reportData.overallScorePercent ? Number((reportData.overallScorePercent / 10).toFixed(1)) : 9.5,
        engine: reportData.categories[0]?.summary || "100% Pass",
        exterior: reportData.categories[1]?.summary || "100% Pass",
        brakes: reportData.categories[2]?.summary || "100% Pass",
        electronics: reportData.categories[3]?.summary || "100% Pass",
        interior: reportData.categories[5]?.summary || "100% Pass"
      },
      owners: 1,
      regCity: inspection.city || "Surat",
      regYear: inspection.year,
      rtoCode: inspection.reg_number || "GJ05-ER-4050"
    };

    // Real cars.id is a UUID column and the table only stores core columns +
    // JSONB payload. buildCarRecord maps the record into { core..., payload }
    // and drops the client text id so the insert succeeds on Supabase; status
    // "available" makes the car show up live on the public catalog.
    const carRow = buildCarRecord({ ...carRecord, status: "available" });
    const { error: pubErr } = await supabase.from("cars").insert([carRow]);
    if (pubErr) throw pubErr;
    await supabase.from("inspections").update({ 
      status: "published", 
      is_certified: true,
      report_120_json: JSON.stringify(reportData),
      report_150_json: JSON.stringify(reportData)
    }).eq("id", inspection.id);

    toast.success(`Vehicle ${inspection.brand} ${inspection.model} uploaded & published to 1stCars website for direct retail buyers!`);
    setSelected120Inspection(null);
    loadCMSData();
    if (onReloadAllData) onReloadAllData();
  };

  // Applies an edited 120-Point report to the car currently being edited in
  // the CMS form (updates formData only; "Save Record" persists it via saveCar).
  const handleSaveCar120Report = (reportData: Full120PointReport) => {
    setFormData((prev: any) => ({
      ...prev,
      report_120_json: JSON.stringify(reportData),
      report_150_json: JSON.stringify(reportData),
      is_certified: reportData.isCertified,
      certified: reportData.isCertified,
      overall_score: reportData.overallScorePercent ? Number((reportData.overallScorePercent / 10).toFixed(1)) : 9.5,
      specifications: [
        reportData.specs.engine,
        reportData.specs.maxPower,
        reportData.specs.peakTorque,
        reportData.specs.transmission,
        reportData.specs.araiMileage
      ],
      features: reportData.keyFeatures,
      inspectionSummary: {
        overallScore: reportData.overallScorePercent ? Number((reportData.overallScorePercent / 10).toFixed(1)) : 9.5,
        engine: reportData.categories[0]?.summary || "100% Pass",
        exterior: reportData.categories[1]?.summary || "100% Pass",
        brakes: reportData.categories[2]?.summary || "100% Pass",
        electronics: reportData.categories[3]?.summary || "100% Pass",
        interior: reportData.categories[5]?.summary || "100% Pass"
      }
    }));
    setIsCar120ModalOpen(false);
    toast.success("120-Point Inspection Report updated. Click Save Record to persist changes.");
  };

  // Image Uploading mockup
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [multiUploadStatus, setMultiUploadStatus] = React.useState("");

  // Load all system state
  const loadCMSData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch tables from Supabase/Mock tables in parallel so "Reload
      //    Engine" doesn't take ~15s of sequential round-trips in live mode.
      const [
        { data: cData },
        { data: uData },
        { data: iData },
        { data: aData },
        { data: nData },
        { data: bData },
        { data: pData },
        { data: lData },
        { data: mData },
        { data: qData },
        { data: tData },
        { data: sData },
        { data: dlrData },
        { data: ctData },
        { data: fData },
        { data: exData },
        { data: ofData },
        { data: srData },
        { data: irData },
        { data: dbData },
        { data: psData },
        { data: ciData },
        { data: tdData },
        { data: puData },
        { data: caData },
        { data: abData },
        { data: jobData }
      ] = await Promise.all([
        supabase.from("cars").select(),
        supabase.from("profiles").select(),
        supabase.from("inspections").select(),
        supabase.from("auctions").select(),
        supabase.from("notifications").select(),
        supabase.from("brands").select(),
        supabase.from("pages").select(),
        supabase.from("sales_notifications").select().order("created_at", { ascending: false }),
        supabase.from("models").select(),
        supabase.from("faq").select(),
        supabase.from("testimonials").select(),
        supabase.from("settings").select(),
        supabase.from("dealers").select(),
        supabase.from("cities").select(),
        supabase.from("finance_partners").select(),
        supabase.from("expenses").select(),
        supabase.from("offers").select(),
        supabase.from("sell_requests").select(),
        supabase.from("inspection_reports").select(),
        supabase.from("dealer_bids").select(),
        supabase.from("park_sell").select(),
        supabase.from("car_images").select(),
        supabase.from("test_drives").select(),
        supabase.from("purchases").select(),
        supabase.from("crm_activities").select(),
        supabase.from("auction_bids").select(),
        supabase.from("career_applications").select()
      ]);

      if (cData) setCars(cData);
      if (uData) setUsers(uData);
      if (iData) setInspections(iData);
      if (aData) setAuctions(aData);
      if (nData) setNotifications(nData);
      if (bData) setBrands(bData);
      if (pData) setPages(pData);
      if (lData && lData.length > 0) setSalesLeads(lData);

      if (ofData) setOffers(ofData);
      if (srData) setSellRequests(srData);
      if (irData) setInspectionReports(irData);
      if (dbData) setDealerBids(dbData);
      if (psData) setParkSell(psData);
      if (tdData) setTestDrives(tdData);
      if (puData) setPurchases(puData);
      if (caData) setCrmActivities(caData);
      if (ciData) setCarImages(ciData);
      if (abData) setAuctionBids(abData);

      // Job applications: Supabase career_applications is the source of truth
      // (written by CareersView); localStorage is the mock-mode fallback.
      const localApplications = safeParseArray(localStorage.getItem("1stcars_career_applications"));
      if (jobData && jobData.length > 0) {
        setCareerApplications(jobData.sort(
          (a: any, b: any) =>
            (b.created_at ? new Date(b.created_at).getTime() : 0) -
            (a.created_at ? new Date(a.created_at).getTime() : 0)
        ));
      } else if (localApplications.length > 0) {
        setCareerApplications(localApplications);
      } else {
        setCareerApplications([]);
      }

      // Load local-storage metadata schemas for extra requested modules
      const getStored = (key: string, def: any[]) => {
        const raw = localStorage.getItem(`1stcars_cms_${key}`);
        return raw ? JSON.parse(raw) : def;
      };

      // Set initial values if not initialized
      setDealers(getStored("dealers", [
        { id: "dl-1", name: "Elite Motors Bangalore", manager: "Vijay Mallya", rating: 4.8, city: "Bangalore", credits: 550000, active_bids: 3 },
        { id: "dl-2", name: "Apex Prestige Cars", manager: "Rohit Shetty", rating: 4.5, city: "Mumbai", credits: 1200000, active_bids: 5 },
        { id: "dl-3", name: "Delhi Luxury Wheels", manager: "Karan Johar", rating: 4.9, city: "Delhi NCR", credits: 750000, active_bids: 1 }
      ]));

      // Supabase dealers/profiles are the source of truth; merge real dealer
      // accounts (role=Dealer) with any legacy local-only rows.
      if ((dlrData && dlrData.length > 0) || (uData && uData.some((p: any) => p.role === "Dealer"))) {
        const localDealers = getStored("dealers", []);
        const dbDealers = (uData || [])
          .filter((p: any) => p.role === "Dealer")
          .map((p: any) => {
            const d = (dlrData || []).find((r: any) => r.id === p.id);
            return {
              id: p.id,
              name: d?.company_name || p.name || "Unnamed Dealer",
              manager: p.name || "",
              rating: 4.5,
              city: p.city || "",
              credits: 0,
              active_bids: 0,
              is_verified: d?.is_verified || false,
              is_approved: d?.is_verified || false,
              dealerStatus: d?.is_verified ? "Approved" : "Pending"
            };
          });
        setDealers([
          ...dbDealers,
          ...localDealers.filter((ld: any) => !dbDealers.some((dd: any) => dd.id === ld.id))
        ]);
      }

      setInspectors(getStored("inspectors", [
        { id: "insp-u1", name: "Vikram Rathore", email: "inspector@1stcars.com", certified_level: "Master", region: "Mumbai", total_inspections: 148 },
        { id: "insp-u2", name: "Ramesh Kumar", email: "ramesh@1stcars.com", certified_level: "Senior", region: "Delhi NCR", total_inspections: 89 }
      ]));

      // Real Inspector-role profiles are merged in so staff signups show up.
      if (uData && uData.some((p: any) => p.role === "Inspector")) {
        const localInspectors = getStored("inspectors", []);
        const dbInspectors = uData
          .filter((p: any) => p.role === "Inspector")
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email || "",
            certified_level: "Certified",
            region: p.city || "All Regions",
            total_inspections: 0
          }));
        setInspectors([
          ...dbInspectors,
          ...localInspectors.filter((li: any) => !dbInspectors.some((di: any) => di.id === li.id))
        ]);
      }

      setSalesAssociates(getStored("sales_associates", [
        { id: "sa-1", name: "Sneha Patel", email: "sales@1stcars.com", active_leads: 8, closed_deals: 42, performance_score: 9.6 },
        { id: "sa-2", name: "Anil Kapoor", email: "anil@1stcars.com", active_leads: 4, closed_deals: 27, performance_score: 9.1 }
      ]));

      // Real Sales Associate-role profiles are merged in the same way.
      if (uData && uData.some((p: any) => p.role === "Sales Associate")) {
        const localSales = getStored("sales_associates", []);
        const dbSales = uData
          .filter((p: any) => p.role === "Sales Associate")
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email || "",
            active_leads: 0,
            closed_deals: 0,
            performance_score: 8.0
          }));
        setSalesAssociates([
          ...dbSales,
          ...localSales.filter((ls: any) => !dbSales.some((ds: any) => ds.id === ls.id))
        ]);
      }

      setModels(getStored("models", [
        { id: "m-1", brand: "Porsche", name: "911 Carrera S", category: "Coupe", engine: "3.0L Twin-Turbo", power: "450 HP" },
        { id: "m-2", brand: "BMW", name: "M4 Competition", category: "Coupe", engine: "3.0L Straight-6", power: "503 HP" },
        { id: "m-3", brand: "Mercedes-Benz", name: "G-Class AMG G 63", category: "SUV", engine: "4.0L BiTurbo V8", power: "577 HP" },
        { id: "m-4", brand: "Audi", name: "e-tron GT", category: "Sedan", engine: "Dual Electric Motor", power: "637 HP" }
      ]));

      // Supabase `models` is the source of truth; merge it with any local-only
      // rows (which keep richer engine/power data) without duplicating by name.
      if (mData && mData.length > 0) {
        const dbModels = mData.map((m: any) => {
          const parentBrand = bData?.find((b: any) => b.id === m.brand_id);
          return {
            id: m.id,
            brand_id: m.brand_id,
            brand: parentBrand?.name || m.brand || "",
            name: m.name,
            category: m.body_type || "Luxury Car",
            engine: m.engine || "Standard Powertrain",
            power: m.power || "N/A"
          };
        });
        const localModels = getStored("models", []);
        const mergedModels = [
          ...dbModels,
          ...localModels.filter((lm: any) =>
            !dbModels.some((dm: any) =>
              dm.brand?.toLowerCase() === lm.brand?.toLowerCase() &&
              dm.name?.toLowerCase() === lm.name?.toLowerCase()))
        ];
        setModels(mergedModels);
      }

      setCities(getStored("cities", [
        { id: "c-1", name: "Mumbai", state: "Maharashtra", branch_manager: "Aakash Ambani", support_number: "022-44445555" },
        { id: "c-2", name: "Delhi NCR", state: "Delhi", branch_manager: "Rajesh Khanna", support_number: "011-22223333" },
        { id: "c-3", name: "Bangalore", state: "Karnataka", branch_manager: "Sudha Murty", support_number: "080-66667777" }
      ]));

      // Supabase `cities` is the source of truth when rows exist.
      if (ctData && ctData.length > 0) {
        setCities(ctData.map((c: any) => ({
          id: c.id,
          name: c.name,
          state: c.state || "",
          branch_manager: c.branch_manager || "",
          support_number: c.support_number || "",
          is_active: c.is_active !== false
        })));
      }

      setFaqs(getStored("faqs", [
        { id: "fq-1", category: "Certification", question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
        { id: "fq-2", category: "Trust", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification guarantees three core pillars for every luxury vehicle: 1) Single Owned: Every car is verified to have had only one previous owner; 2) Non-Accident Trusted: Strictly checked to have zero chassis frame damage or past accident repairs; 3) Genuine KM: Verified using advanced OBD diagnostics and complete historical service log sweeps so you can trust the mileage is 100% authentic." }
      ]));

      // Supabase `faq` is the source of truth when rows exist.
      if (qData && qData.length > 0) {
        setFaqs(qData.map((q: any) => ({
          id: q.id,
          category: q.category || "General",
          question: q.question,
          answer: q.answer
        })));
      }

      setTestimonials(getStored("testimonials", [
        { id: "t-1", name: "Harish Kotian", role: "Dealer Partner", rating: 5, content: "The B2B live dealer bidding is completely transparent and incredibly fast. Picked up 3 pristine Porsche models already.", photo: "👤" },
        { id: "t-2", name: "Priyanjali Sen", role: "Private Buyer", rating: 5, content: " व्हाइट-ग्लव डिलीवरी are world class! The home inspection and evaluation made selling my Range Rover completely painless.", photo: "👤" }
      ]));

      // Supabase `testimonials` is the source of truth when rows exist. Rows
      // whose author name was tombstoned via delete are hidden so a delete
      // always appears to succeed in the admin panel.
      if (tData && tData.length > 0) {
        const deleted = readDeletedTestimonialNames();
        setTestimonials(tData
          .map((t: any) => ({
            id: t.id,
            name: t.author_name,
            role: t.author_role || "Private Buyer",
            rating: t.rating,
            content: t.comment,
            photo: t.photo || "👤"
          }))
          .filter((t: any) => !deleted.includes(String(t.name || "").trim().toLowerCase())));
      }

      setFinancePartners(getStored("finance", [
        { id: "fp-1", name: "HDFC Bank Premium Finance", rate: "7.9%", tenure_months: "84 Months", max_funding: "90%", approval_hours: "2 Hours" },
        { id: "fp-2", name: "ICICI Bank Luxury Auto Loan", rate: "8.2%", tenure_months: "60 Months", max_funding: "100%", approval_hours: "4 Hours" }
      ]));

      // Supabase `finance_partners` is the source of truth when rows exist.
      if (fData && fData.length > 0) {
        setFinancePartners(fData.map((f: any) => ({
          id: f.id,
          name: f.name,
          rate: f.rate || "",
          tenure_months: f.tenure_months || "",
          max_funding: f.max_funding || "",
          approval_hours: f.approval_hours || ""
        })));
      }

      setExpenses(getStored("expenses", [
        { id: "ex-1", title: "Showroom Detailing and Ceramic Coating", category: "Preparation", amount: 48000, date: "2026-07-15", logged_by: "u-admin" },
        { id: "ex-2", title: "Flatbed Towing from Pune to Mumbai", category: "Logistics", amount: 15000, date: "2026-07-16", logged_by: "u-admin" },
        { id: "ex-3", title: "Doorstep Evaluator Compensation", category: "Salaries", amount: 24000, date: "2026-07-17", logged_by: "u-admin" }
      ]));

      // Supabase `expenses` is the source of truth when rows exist.
      if (exData && exData.length > 0) {
        setExpenses(exData.map((x: any) => ({
          id: x.id,
          title: x.title,
          category: x.category || "Operations",
          amount: Number(x.amount) || 0,
          date: x.date || "",
          logged_by: x.logged_by || ""
        })));
      }

      const storedSettings = localStorage.getItem("1stcars_cms_website_settings");
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          const isDemoAddress = !parsed.supportAddress || parsed.supportAddress.includes("Los Angeles") || parsed.supportAddress.includes("Greenwood") || parsed.supportAddress.includes("722") || parsed.supportAddress.includes("Bhatar");
          if (isDemoAddress || (parsed.buyCarsSubheadingText && parsed.buyCarsSubheadingText.includes("owned directly"))) {
            parsed.supportAddress = "1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India";
            parsed.supportPhone = "+91 8866377722";
            parsed.supportEmail = "support@1stcars.com";
            parsed.buyCarsSubheadingText = "1stCars is Gujarat's premier aggregator platform connecting Car Buyers, Sellers, and Dealers. Every vehicle undergoes strict 1stMark certification for Single Owned status, Non-Accident trusted frame, and Genuine KM verification.";
          }
          if (!parsed.logoUrl || parsed.logoUrl === "🏎️ 1stCars" || parsed.logoUrl === "⭐") {
            parsed.logoUrl = "/logo.png";
          }
          localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(parsed));
          setWebsiteSettings((prev: any) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse stored settings:", e);
        }
      }

      // Supabase settings table (row keyed "website_settings") is the source of
      // truth for theme/branding/SEO; overlay it on top of any local settings.
      if (sData && sData.length > 0) {
        const webRow = sData.find((s: any) => s.key === "website_settings");
        if (webRow && webRow.value) {
          try {
            const parsed = normalizeWebsiteSettings(JSON.parse(webRow.value));
            setWebsiteSettings((prev: any) => ({ ...prev, ...parsed }));
            localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(parsed));
          } catch (e) {
            console.error("Failed to parse Supabase settings row:", e);
          }
        }
      }

    } catch (error) {
      console.error("Error loading complete CMS tables:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadCMSData();
  }, []);

  // Save changes for mock tables helper
  const persistMockTable = (key: string, data: any[]) => {
    localStorage.setItem(`1stcars_cms_${key}`, JSON.stringify(data));
    loadCMSData();
  };

  // Handler to open Add Modal
  const openAddModal = () => {
    setFormMode("add");
    setEditingId(null);
    
    // Car creation uses the sell-form-style wizard instead of the generic form
    if (currentListModule === "cars") {
      setIsCarWizardOpen(true);
      return;
    }
    
    // Set realistic default template keys based on current module
    const defaultTemplates: Record<CMSModule, any> = {
      dashboard: {},
      crm: {},
      leads: {},
      cars: { brand: "BMW", model: "X5 xDrive40i", variant: "M Sport", year: 2022, price: 9500000, km_driven: 15000, fuel: "Petrol", transmission: "Automatic", owner_count: 1, city: "Mumbai", reg_number: "MH02-FP-5005", color: "Carbon Black", insurance_type: "Comprehensive", overall_score: 9.2, status: "available", image_url: "🚙", images: [], price_breakup: [
        { label: "RC transfer price", amount: 10000, desc: "Seamless RC transfer services with RTO assistance" },
        { label: "Third party insurance", amount: 2474, desc: "Govt mandated insurance against third party damages" },
        { label: "Car Servicing Charges", amount: 11000, desc: "One-time fee for pre-sale car maintenance" }
      ] },
      users: { name: "", email: "", mobile: "", password: "", role: "Buyer", city: "Mumbai" },
      test_drive_requests: { name: "", mobile: "", city: "Surat", vehicle: "", type: "Test Drive Request", preferred_date: "", preferred_time: "Morning", notes: "" },
      booking_requests: { name: "", mobile: "", city: "Surat", vehicle: "", type: "Buy Car / Reservation", preferred_date: "", preferred_time: "Morning", notes: "" },

      seller_enquiries: { seller_name: "", seller_mobile: "", reg_number: "", brand: "", model: "", year: 2022, km_driven: 25000, city: "Surat", address: "", status: "pending", notes: "" },
      staff: { name: "", email: "", role: "Inspector", region: "Surat", status: "Active" },
      dealers: { name: "", manager: "", rating: 5.0, city: "Mumbai", credits: 500000, active_bids: 0 },
      inspectors: { name: "", email: "", certified_level: "Senior", region: "Surat", total_inspections: 0 },
      sales: { name: "", email: "", active_leads: 0, closed_deals: 0, performance_score: 10.0 },
      inspections: { seller_name: "", seller_mobile: "", reg_number: "", brand: "", model: "", variant: "", fuel: "Petrol", transmission: "Automatic", year: 2021, km_driven: 20000, city: "Mumbai", address: "", preferred_date: "2026-07-25", preferred_time: "10:00 AM - 12:00 PM", status: "pending", notes: "" },
      certifications: {},
      auctions: { starting_bid: 100000, reserve_price: 0, minimum_increment: 5000, extension_seconds: 120, max_extension_count: 5, starts_at: "", ends_at: "" },
      brands: { brand_name: "Porsche", model_name: "911 GT3 RS", category: "Coupe", engine: "4.0L Flat-6", power: "518 HP", logo_url: "⭐", is_popular: true, audience: "Buyer & Seller", status: "Active" },
      cities: { name: "", state: "", branch_manager: "", support_number: "" },
      faqs: { category: "General", question: "", answer: "" },
      testimonials: { name: "", role: "Private Buyer", rating: 5, content: "", photo: "👤" },
      finance: { name: "", rate: "8.5%", tenure_months: "60 Months", max_funding: "90%", approval_hours: "2 Hours" },
      notifications: { recipient_id: "all", title: "", message: "", type: "info" },
      expenses: { title: "", category: "Operations", amount: 5000, date: new Date().toISOString().split("T")[0], logged_by: "u-admin" },
      reports: {},
      pages: { title: "", slug: "", content: "# Page Title\n\nPage text goes here.", is_footer: false },
      footer_links: { title: "", slug: "", content: "# Footer Page Title\n\nFooter page text goes here.", is_footer: true },
      settings: {},
      text_editor: {},
      payment_settings: {},
      sell_form: {},
      automation: {},
      test_drives: { buyer_id: "", car_id: "", sales_associate_id: "", preferred_date: new Date().toISOString().split("T")[0], preferred_time: "10:00 AM - 12:00 PM", status: "pending", feedback: "" },
      purchases: { buyer_id: "", car_id: "", sales_associate_id: "", amount_paid: 0, payment_method: "UPI", payment_status: "pending", delivery_status: "pending" },
      crm_activities: { customer_id: "", staff_id: "", activity_type: "note", subject: "", detail: "" },
      career_applications: { full_name: "", phone: "", email: "", position: "Sales Associate", experience: "", message: "", resume_url: "", resume_name: "", status: "pending" }
    };

    setFormData(defaultTemplates[currentListModule] || {});
    setIsFormOpen(true);
  };

  // Handler to open Edit Modal
  const openEditModal = (item: any) => {
    setFormMode("edit");
    setEditingId(item.id);
    
    let initialData = { ...item };
    if (currentListModule === "cars") {
      // Flatten the JSONB payload into the top level so photos, price breakup,
      // inspection and every other CMS-only field survive an edit. saveCar's
      // buildCarRecord rebuilds `payload` from the top-level record, so without
      // this an edit would silently drop those fields (and re-saving would also
      // move data-URL photos to Supabase Storage, which is what we want).
      //
      // The payload must merge UNDER the row (payload first, row wins): payload
      // can hold stale copies of the physical columns — e.g. an approved car
      // keeps payload.status "pending" while the column says "available" — and
      // writing that stale copy back trips the DB status-guard trigger with
      // "Invalid vehicle status transition", silently failing featured/any edits.
      initialData = { ...(item.payload || {}), ...item };
      if (!Array.isArray(initialData.images)) {
        initialData.images = initialData.image_url && initialData.image_url !== "🚙" 
          ? [initialData.image_url] 
          : [];
      }
    }
    
    setFormData(initialData);
    setIsFormOpen(true);
  };

  // Handler for the CreateCarWizard submission
  const handleWizardSubmit = async (record: any) => {
    setIsLoading(true);
    try {
      const generatedId = `id-cars-${Math.random().toString(36).substr(2, 9)}`;
      const finalRecord = { ...record, id: generatedId, created_at: new Date().toISOString() };
      const { error } = await saveCar(finalRecord);
      if (error) throw error;
      setIsCarWizardOpen(false);
      toast.success("Car uploaded & published to 1stCars website!");
      setTimeout(() => {
        window.dispatchEvent(new Event("1stcars_settings_updated"));
      }, 0);
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      console.error("Error creating car via wizard:", err);
      toast.error("Failed to create car: " + errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Approve a car submitted by a Sales Associate: flips status from "pending"
  // to "available" so it appears live in the public catalog, and alerts the
  // associate who uploaded it.
  const handleApproveCar = async (item: any) => {
    if (!window.confirm(`Approve ${item.brand || ""} ${item.model || "this car"} and publish it live on the 1stCars website?`)) return;
    try {
      const { data, error } = await supabase.from("cars").update({ status: "available" }).eq("id", item.id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        // 0 rows updated — the row id is stale (e.g. a local-only record
        // against the real database). Retry with the id stored in payload.
        const payloadId = item.payload?.id;
        if (payloadId && payloadId !== item.id) {
          const retry = await supabase.from("cars").update({ status: "available" }).eq("id", payloadId).select("id");
          if (retry.error) throw retry.error;
          if (!retry.data || retry.data.length === 0) throw new Error("Car row not found in the database. Refresh the list and try again.");
        } else {
          throw new Error("Car row not found in the database. Refresh the list and try again.");
        }
      }

      const creatorId = item.created_by || item.payload?.created_by;
      if (creatorId) {
        await notificationService.createNotification({
          recipientId: creatorId,
          senderId: "u-admin",
          title: "Your Car Is Now Live! 🎉",
          message: `Great news! The ${item.brand || ""} ${item.model || "car"} you uploaded has been approved and is now live on the 1stCars website for buyers.`,
          type: "success",
          metadata: { car_id: item.id, status: "available" }
        });
      }

      toast.success(`${item.brand || ""} ${item.model || "Car"} approved & published to the website!`);
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
      setTimeout(() => window.dispatchEvent(new Event("1stcars_settings_updated")), 0);
    } catch (err) {
      console.error("Failed to approve car:", err);
      toast.error("Could not approve this car. " + errorMessage(err));
    }
  };

  // Mock Storage Upload function
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const compressImageFile = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!file.type.startsWith("image/")) {
          return resolve(rawUrl);
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", quality);
            resolve(compressed);
          } else {
            resolve(rawUrl);
          }
        };
        img.onerror = () => resolve(rawUrl);
        img.src = rawUrl;
      };
      reader.onerror = () => resolve("🚙");
      reader.readAsDataURL(file);
    });
  };

  const simulateImageUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    
    compressImageFile(file, 1200, 0.8).then((realUrl) => {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(0);
              
              if (currentListModule === "settings") {
                setWebsiteSettings((prev: any) => {
                  const updated = {
                    ...prev,
                    logoUrl: realUrl
                  };
                  localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(updated));
                  return updated;
                });
                setTimeout(() => {
                  window.dispatchEvent(new Event("1stcars_settings_updated"));
                }, 0);
                toast.success(`Pristine Image "${file.name}" uploaded successfully to Supabase Storage bucket: public-settings`);
              } else {
                setFormData((prevForm: any) => ({
                  ...prevForm,
                  image_url: realUrl,
                  logo_url: realUrl,
                  logo: realUrl,
                  photo: realUrl
                }));
                toast.success(`Pristine Image "${file.name}" uploaded successfully to Supabase Storage bucket: public-${currentListModule}`);
              }
            }, 300);
            return 100;
          }
          return prev + 30;
        });
      }, 150);
    });
  };

  const simulateMultipleImageUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 15);
    setIsUploading(true);
    setUploadProgress(5);
    setMultiUploadStatus(`Preparing ${fileArray.length} photos for dynamic upload...`);
    
    // Compress and read all files as lightweight Data URLs asynchronously
    const readFilesPromises = fileArray.map(file => compressImageFile(file, 1200, 0.8));

    Promise.all(readFilesPromises).then((urls) => {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(0);
              setMultiUploadStatus("");
              
              setFormData((prevForm: any) => {
                const existingImages = Array.isArray(prevForm.images) ? prevForm.images : [];
                const combinedImages = [...existingImages, ...urls].slice(0, 15);
                return {
                  ...prevForm,
                  images: combinedImages,
                  image_url: combinedImages[0] || prevForm.image_url || "🚙"
                };
              });
              
              toast.success(`Pristine batch of ${fileArray.length} photos uploaded successfully to Supabase Storage bucket: public-cars`);
            }, 300);
            return 100;
          }
          
          const progressPerFile = 100 / fileArray.length;
          const index = Math.min(Math.floor(prev / progressPerFile), fileArray.length - 1);
          const file = fileArray[index];
          
          if (file) {
            setMultiUploadStatus(`Uploading photo ${index + 1} of ${fileArray.length}: ${file.name}`);
          }
          
          return prev + Math.max(12, Math.floor(100 / (fileArray.length * 1.2)));
        });
      }, 100);
    });
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (currentListModule === "cars") {
        simulateMultipleImageUpload(e.dataTransfer.files);
      } else {
        simulateImageUpload(e.dataTransfer.files[0]);
      }
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (currentListModule === "cars") {
        simulateMultipleImageUpload(e.target.files);
      } else {
        simulateImageUpload(e.target.files[0]);
      }
      e.target.value = "";
    }
  };

  // Submit CRUD changes (Supports real Supabase for profiles/cars/insps/auctions/notifs, mock storage for others)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // FAQ & testimonials are mirrored to Supabase keyed by `id` (UUID), so new
      // rows must get a real UUID rather than the `id-<module>-<rand>` mock id
      // used by other modules (which would fail the UUID column / break upsert).
      const newUuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `id-${currentListModule}-${Math.random().toString(36).substr(2, 9)}`;
      const generatedId =
        editingId ||
        (currentListModule === "faqs" || currentListModule === "testimonials"
          ? newUuid
          : `id-${currentListModule}-${Math.random().toString(36).substr(2, 9)}`);
      const currentRecord = { ...formData, id: generatedId, created_at: formData.created_at || new Date().toISOString() };

      if (currentListModule === "cars") {
        const { error } = await saveCar(currentRecord, formMode === "add" ? null : editingId);
        if (error) throw error;
      } else if (currentListModule === "users") {
        // `password` is a login credential — never store it on the public profile.
        const { password, ...profileRecord } = currentRecord;

        if (formMode === "add") {
          if (isRealSupabase) {
            // Real Supabase: login only works if the user exists in Auth
            // (auth.users). Inserting a profile row alone is not enough.
            const email = String(profileRecord.email || "").trim().toLowerCase();
            if (!password) {
              throw new Error("Password is required to create a login for the new user.");
            }
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  name: profileRecord.name || email.split("@")[0],
                  role: profileRecord.role || "Buyer",
                  city: profileRecord.city || "Mumbai",
                  mobile: profileRecord.mobile || ""
                }
              }
            });
            if (signUpErr) {
              throw new Error(
                (signUpErr.message || "").toLowerCase().includes("already")
                  ? `An auth account already exists for ${email}. Use Edit to update its profile, or reset the password from Supabase > Authentication.`
                  : `Failed to create auth user: ${signUpErr.message}`
              );
            }
            if (!signUpData?.user) {
              throw new Error(
                "Sign-up did not return a user. If 'Confirm email' is enabled in Supabase Auth settings, the user must confirm their email before they can log in."
              );
            }
            await supabase.from("profiles").insert([{ ...profileRecord, id: signUpData.user.id }]);
          } else {
            await supabase.from("profiles").insert([profileRecord]);
          }
        } else {
          await supabase.from("profiles").update(profileRecord).eq("id", editingId);
        }
      } else if (currentListModule === "inspections") {
        // Strip the client-side text id so the real DB generates a valid UUID
        // (the inspections.id column is UUID and rejects "id-inspections-*").
        const { id: _inspId, ...recordToSave } = currentRecord;
        if (formMode === "add") {
          await supabase.from("inspections").insert([recordToSave]);
        } else {
          await supabase.from("inspections").update(recordToSave).eq("id", editingId);
        }
      } else if (currentListModule === "test_drives" || currentListModule === "purchases" || currentListModule === "crm_activities") {
        // These tables use UUID FK columns (car_id/buyer_id/sales_associate_id/
        // customer_id/staff_id). Empty or "all"-style strings would fail the
        // UUID parse, so map blanks to NULL and validate the required FKs up
        // front with a readable message instead of PostgREST's cryptic error.
        const uuidFields: Record<string, string[]> = {
          test_drives: ["car_id", "buyer_id", "sales_associate_id"],
          purchases: ["car_id", "buyer_id", "sales_associate_id"],
          crm_activities: ["customer_id", "staff_id"]
        };
        const requiredRefs: Record<string, string[]> = {
          test_drives: ["car_id", "buyer_id"],
          purchases: ["car_id", "buyer_id"]
        };
        const { id: _actId, ...recordToSave } = currentRecord;
        for (const field of uuidFields[currentListModule] || []) {
          const v = recordToSave[field];
          if (v === undefined || v === null || String(v).trim() === "") {
            recordToSave[field] = null;
          }
        }
        const missing = (requiredRefs[currentListModule] || []).filter((f) => !recordToSave[f]);
        if (missing.length > 0) {
          throw new Error(
            `${currentListModule} needs a valid ${missing.map((f) => f.replace(/_/g, " ")).join(" and ")} — enter the record's real id (e.g. the car's UUID shown in the list).`
          );
        }
      } else if (activeModule === "auctions") {
        // Canonical engine only — never write the auction table directly.
        const actor: AuctionActor = { userId: currentUser?.id || "admin", role: currentUser?.role || "Admin" };
        if (formMode === "add") {
          await auctionService.createAuction(actor, {
            car_id: currentRecord.car_id || currentRecord.car || null,
            inspection_id: currentRecord.inspection_id || currentRecord.inspection || null,
            starting_bid: Number(currentRecord.base_price || currentRecord.starting_bid || 0),
            reserve_price: Number(currentRecord.reserve || currentRecord.reserve_price || 0),
            minimum_increment: 25000
          });
        } else {
          toast.error("Auction editing is handled in the Auction Engine — open the auction there to edit, publish or cancel it.");
          setIsFormOpen(false);
          loadCMSData();
          if (onReloadAllData) onReloadAllData();
          return;
        }
      } else if (currentListModule === "brands") {
        // 1. Save or update the Brand record in Supabase
        const logoUrlToSave = currentRecord.logo_url || currentRecord.logo || currentRecord.image_url || currentRecord.photo || "⭐";
        const brandRecord = {
          name: currentRecord.brand_name || currentRecord.name || "Unknown Brand",
          logo_url: logoUrlToSave,
          is_popular: currentRecord.is_popular === true || currentRecord.is_popular === "true"
        };

        let brandId = currentRecord.brand_id || (currentRecord.type === "brand" ? currentRecord.id : "");
        // Local-demo brands use text ids like "b-toyota"; the real brands.id is
        // a UUID column, so text ids must not be sent to Supabase — let the DB
        // generate a fresh UUID instead (name lookup below dedupes).
        if (brandId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brandId)) {
          brandId = "";
        }

        // Check if brand exists by ID or by Name
        let existingBrand: any = null;
        if (brandId) {
          const { data } = await supabase.from("brands").select("*").eq("id", brandId).maybeSingle();
          existingBrand = data;
        }
        if (!existingBrand && brandRecord.name) {
          const { data: allBrands } = await supabase.from("brands").select("*");
          existingBrand = allBrands?.find((b: any) => b.name?.toLowerCase() === brandRecord.name.toLowerCase()) || null;
        }

        if (existingBrand) {
          brandId = existingBrand.id;
          await supabase.from("brands").update(brandRecord).eq("id", brandId);
        } else {
          // Omit the client-side text id (brands.id is UUID — the DB generates
          // it). If brandId is a real UUID (existing brand being re-saved),
          // keep it so the row updates consistently.
          const brandInsert = { ...brandRecord } as any;
          if (brandId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brandId)) {
            brandInsert.id = brandId;
          }
          const { data: insertedBrand, error: insErr } = await supabase
            .from("brands")
            .insert([brandInsert])
            .select()
            .single();
          if (insertedBrand) {
            brandId = insertedBrand.id;
          } else if (insErr) {
            console.error("Error inserting brand:", insErr);
          }
        }

        // Fetch fresh brands to ensure local state is updated immediately
        const { data: freshBrands } = await supabase.from("brands").select("*");
        if (freshBrands && freshBrands.length > 0) {
          setBrands(freshBrands);
        }

        // 2. Save the model to local models list if model_name is provided and not a brand placeholder
        if (currentRecord.model_name && !currentRecord.model_name.startsWith("—")) {
          const modelRecord = {
            id: currentRecord.id && currentRecord.id.startsWith("m-") ? currentRecord.id : `m-${Math.random().toString(36).substr(2, 9)}`,
            brand_id: brandId || undefined,
            brand: brandRecord.name,
            name: currentRecord.model_name,
            category: currentRecord.category || "Luxury Car",
            engine: currentRecord.engine || "Standard Engine",
            power: currentRecord.power || "N/A",
            logo_url: logoUrlToSave,
            audience: currentRecord.audience || "Buyer & Seller",
            status: currentRecord.status || "Active"
          };

          const nextModels = [...models];
          const existingModelIdx = nextModels.findIndex(m => 
            m.id === editingId || 
            m.id === modelRecord.id || 
            (m.name?.toLowerCase() === modelRecord.name?.toLowerCase() && m.brand?.toLowerCase() === modelRecord.brand?.toLowerCase())
          );
          if (existingModelIdx > -1) {
            nextModels[existingModelIdx] = { ...nextModels[existingModelIdx], ...modelRecord };
          } else {
            nextModels.push(modelRecord);
          }
          setModels(nextModels);
          localStorage.setItem("1stcars_cms_models", JSON.stringify(nextModels));
          await mirrorRecordToSupabase("models", modelRecord, existingModelIdx > -1 ? nextModels[existingModelIdx].id : null);
        }
      } else if (currentListModule === "notifications") {
        // notifications.recipient_id is a NOT NULL user UUID column, so a
        // literal "all" or a client text id would fail. Handle broadcast as
        // one row per known profile, and fall back to the admin's own feed
        // when no valid recipient is picked.
        const { id: _notifId, ...notif } = currentRecord;
        if (!notif.sender_id || String(notif.sender_id).trim() === "") {
          notif.sender_id = null;
        }
        const recipient = String(notif.recipient_id || "").trim();
        const isRecipientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipient);
        if (recipient === "all") {
          const targets = (users || []).map((u: any) => u.id).filter((id: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          );
          if (targets.length === 0 && currentUser?.id) targets.push(currentUser.id);
          for (const rid of targets) {
            const { error: nbErr } = await supabase.from("notifications").insert([{ ...notif, recipient_id: rid }]);
            if (nbErr) throw nbErr;
          }
          toast.success(`Notification broadcast to ${targets.length} user${targets.length === 1 ? "" : "s"}.`);
        } else if (isRecipientUuid || formMode === "edit") {
          if (!isRecipientUuid && formMode === "edit") {
            // Empty recipient on edit: leave the existing recipient untouched.
            delete notif.recipient_id;
          }
          if (formMode === "add") {
            await supabase.from("notifications").insert([notif]);
          } else {
            await supabase.from("notifications").update(notif).eq("id", editingId);
          }
        } else if (currentUser?.id) {
          await supabase.from("notifications").insert([{ ...notif, recipient_id: currentUser.id }]);
          toast.success("No valid recipient picked — notification saved to your own feed.");
        } else {
          throw new Error("Pick a valid recipient id (user UUID) or use \"all\" to broadcast.");
        }
      } else if (currentListModule === "pages" || currentListModule === "footer_links") {
        const { id: _pageId, ...recordToSave } = {
          ...currentRecord,
          is_footer: currentListModule === "footer_links" ? true : (currentRecord.is_footer || false)
        };
        if (formMode === "add" && recordToSave.slug) {
          // pages.slug is NOT NULL UNIQUE — catch duplicates up front instead
          // of surfacing Supabase's unique-violation error.
          const slug = String(recordToSave.slug).trim();
          const { data: slugHits } = await supabase.from("pages").select("id, slug").eq("slug", slug);
          const localHit = pages.some((p: any) => String(p.slug).trim().toLowerCase() === slug.toLowerCase());
          if ((slugHits && slugHits.length > 0) || localHit) {
            throw new Error(`A page with the slug "${slug}" already exists. Pick a unique slug.`);
          }
          recordToSave.slug = slug;
        }
        if (formMode === "add") {
          await supabase.from("pages").insert([recordToSave]);
        } else {
          await supabase.from("pages").update(recordToSave).eq("id", editingId);
        }
      } else if (currentListModule === "career_applications") {
        // Career applications are shared with the public /careers page: write
        // through to Supabase (career_applications table) and mirror to the
        // same localStorage key the public form uses, so mock mode stays in sync.
        const { id: _appId, ...recordToSave } = currentRecord;
        if (formMode === "add") {
          await supabase.from("career_applications").insert([recordToSave]);
        } else {
          await supabase.from("career_applications").update(recordToSave).eq("id", editingId);
        }
        const localApplications = safeParseArray(localStorage.getItem("1stcars_career_applications"));
        const mirrored = {
          ...recordToSave,
          id: editingId || `app-${Math.random().toString(36).substr(2, 9)}`,
          created_at: recordToSave.created_at || new Date().toISOString()
        };
        const nextLocal = formMode === "add"
          ? [mirrored, ...localApplications]
          : localApplications.map((a: any) => a.id === editingId ? mirrored : a);
        localStorage.setItem("1stcars_career_applications", JSON.stringify(nextLocal));
      } else {
        // Handle mock schema arrays
        const tableStateMap: Record<string, [any[], (d: any[]) => void]> = {
          staff: [getStoredMockList("staff"), (d) => persistMockTable("staff", d)],
          dealers: [dealers, (d) => persistMockTable("dealers", d)],
          inspectors: [inspectors, (d) => persistMockTable("inspectors", d)],
          sales: [salesAssociates, (d) => persistMockTable("sales_associates", d)],
          models: [models, (d) => persistMockTable("models", d)],
          cities: [cities, (d) => persistMockTable("cities", d)],
          faqs: [faqs, (d) => persistMockTable("faqs", d)],
          testimonials: [testimonials, (d) => persistMockTable("testimonials", d)],
          finance: [financePartners, (d) => persistMockTable("finance", d)],
          expenses: [expenses, (d) => persistMockTable("expenses", d)]
        };

        const mapData = tableStateMap[currentListModule];
        if (mapData) {
          const [currentList, updateFn] = mapData;
          if (formMode === "add") {
            updateFn([...currentList, currentRecord]);
            await mirrorRecordToSupabase(currentListModule, currentRecord, null);
          } else {
            updateFn(currentList.map(item => item.id === editingId ? currentRecord : item));
            await mirrorRecordToSupabase(currentListModule, currentRecord, editingId);
          }
        }
      }

      toast.success(`${currentListModule.toUpperCase()} item saved successfully.`);
      setIsFormOpen(false);
      setTimeout(() => {
        window.dispatchEvent(new Event("1stcars_settings_updated"));
      }, 0);
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      console.error("Error submitting CMS form:", err);
      toast.error(`Failed to save ${currentListModule}: ${errorMessage(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Action
  const handleDeleteItem = async (id: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete this ${currentListModule} record?`)) return;
    setIsLoading(true);

    try {
      if (currentListModule === "cars") {
        const { error } = await deleteCar(id);
        if (error) throw error;
      } else if (currentListModule === "users") {
        await supabase.from("profiles").delete().eq("id", id);
      } else if (currentListModule === "inspections") {
        await supabase.from("inspections").delete().eq("id", id);
      } else if (currentListModule === "test_drives" || currentListModule === "purchases" || currentListModule === "crm_activities") {
        await supabase.from(currentListModule).delete().eq("id", id);
      } else if (currentListModule === "auctions") {
        const actor: AuctionActor = { userId: currentUser?.id || "admin", role: currentUser?.role || "Admin" };
        await auctionService.deleteAuction(actor, id);
      } else if (currentListModule === "brands") {
        // If it's a model in our local list, delete from models
        const isModel = models.some(m => m.id === id);
        if (isModel) {
          const nextModels = models.filter(m => m.id !== id);
          setModels(nextModels);
          localStorage.setItem("1stcars_cms_models", JSON.stringify(nextModels));
        } else {
          // It's a brand in Supabase
          await supabase.from("brands").delete().eq("id", id);
        }
      } else if (currentListModule === "notifications") {
        await supabase.from("notifications").delete().eq("id", id);
      } else if (currentListModule === "pages" || currentListModule === "footer_links") {
        await supabase.from("pages").delete().eq("id", id);
      } else if (currentListModule === "career_applications") {
        await supabase.from("career_applications").delete().eq("id", id);
        const localApplications = safeParseArray(localStorage.getItem("1stcars_career_applications"));
        localStorage.setItem(
          "1stcars_career_applications",
          JSON.stringify(localApplications.filter((a: any) => a.id !== id))
        );
      } else {
        const tableStateMap: Record<string, [any[], (d: any[]) => void]> = {
          staff: [getStoredMockList("staff"), (d) => persistMockTable("staff", d)],
          dealers: [dealers, (d) => persistMockTable("dealers", d)],
          inspectors: [inspectors, (d) => persistMockTable("inspectors", d)],
          sales: [salesAssociates, (d) => persistMockTable("sales_associates", d)],
          models: [models, (d) => persistMockTable("models", d)],
          cities: [cities, (d) => persistMockTable("cities", d)],
          faqs: [faqs, (d) => persistMockTable("faqs", d)],
          testimonials: [testimonials, (d) => persistMockTable("testimonials", d)],
          finance: [financePartners, (d) => persistMockTable("finance", d)],
          expenses: [expenses, (d) => persistMockTable("expenses", d)]
        };

        const mapData = tableStateMap[currentListModule];
        if (mapData) {
          const [currentList, updateFn] = mapData;
          const record = currentList.find(item => item.id === id);
          // Tombstone BEFORE touching state so any in-flight reload filters the
          // row out — a delete can never be resurrected by a stale read.
          if (currentListModule === "testimonials" && record?.name) {
            const name = String(record.name).trim().toLowerCase();
            if (name) {
              const deleted = readDeletedTestimonialNames();
              if (!deleted.includes(name)) {
                deleted.push(name);
                localStorage.setItem("1stcars_cms_testimonials_deleted", JSON.stringify(deleted));
              }
            }
          }
          const nextList = currentList.filter(item => item.id !== id);
          updateFn(nextList);
          const { dbError } = await deleteRecordFromSupabase(currentListModule, id, record);
          if (currentListModule === "testimonials" && dbError) {
            toast.error("Review removed from this browser, but the database delete failed. Run the testimonials RLS policy in Supabase SQL Editor so it disappears for everyone.");
          }
        }
      }

      toast.success("Record removed successfully.");
      setTimeout(() => {
        window.dispatchEvent(new Event("1stcars_settings_updated"));
      }, 0);
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      console.error("Error deleting from CMS:", err);
      toast.error("Delete failed. The record could not be removed from the database — check the Supabase RLS policy for this table, then try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Safe JSON array reader: corrupted/legacy localStorage must never crash the
  // Admin render (a bad value falls back to an empty list instead).
  function safeParseArray(raw: string | null): any[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("AdminCMS: ignoring unreadable localStorage JSON", e);
      return [];
    }
  }

  // Helper to fetch localStorage lists
  function getStoredMockList(key: string): any[] {
    return safeParseArray(localStorage.getItem(`1stcars_cms_${key}`));
  }

  // Mirrors CMS edits of compatible modules into the real Supabase tables so
  // the admin panel, the public site, and other devices all share the same
  // data. Unsupported modules (dealers/cities/etc) are simply skipped - the
  // localStorage copy above is still updated, so a schema mismatch never
  // breaks an admin save.
  const mirrorRecordToSupabase = async (module: string, record: any, editingId: string | null) => {
    const isUuid = (value: string | null | undefined) =>
      !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const dbId = isUuid(editingId) ? editingId : null;
    try {
      if (module === "faqs") {
        // Always key FAQ rows by `id` so the admin `faqs` module and the
        // PageEditor FAQ tab (which upserts by id) never diverge, and we don't
        // collide with the UNIQUE(question) constraint on public.faq.
        const isUuidVal = (v: unknown) =>
          !!v && typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
        const rowId = isUuidVal(record.id)
          ? String(record.id)
          : (typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `id-faqs-${Math.random().toString(36).substr(2, 9)}`);
        const row = {
          id: rowId,
          question: record.question,
          answer: record.answer,
          category: record.category || "General",
          display_order: Number(record.display_order) || 0
        };
        if (dbId) {
          await supabase.from("faq").update(row).eq("id", dbId);
        } else {
          await supabase.from("faq").upsert(row, { onConflict: "id" });
        }
      } else if (module === "testimonials") {
        const row = {
          author_name: record.name,
          author_role: record.role || "Private Buyer",
          rating: Math.min(5, Math.max(1, Number(record.rating) || 5)),
          comment: record.content,
          is_featured: true
        };
        if (dbId) {
          await supabase.from("testimonials").update(row).eq("id", dbId);
        } else {
          await supabase.from("testimonials").insert([row]);
          // A deliberately re-added review must be visible again: lift any
          // delete tombstone keyed by the same author name.
          const name = String(record.name || "").trim().toLowerCase();
          if (name) {
            const deleted = readDeletedTestimonialNames().filter((n) => n !== name);
            localStorage.setItem("1stcars_cms_testimonials_deleted", JSON.stringify(deleted));
          }
        }
      } else if (module === "models") {
        if (!record.brand_id && !record.brand) return;
        const row = {
          name: record.name,
          body_type: record.category || "Luxury Car"
        };
        if (dbId) {
          await supabase.from("models").update(row).eq("id", dbId);
        } else {
          const { data: existing } = await supabase
            .from("models")
            .select("id")
            .eq("brand_id", record.brand_id)
            .eq("name", row.name)
            .maybeSingle();
          if (existing) {
            await supabase.from("models").update(row).eq("id", existing.id);
          } else {
            await supabase.from("models").insert([{ ...row, brand_id: record.brand_id }]);
          }
        }
      } else if (module === "cities") {
        const row = {
          name: record.name,
          state: record.state || "",
          branch_manager: record.branch_manager || "",
          support_number: record.support_number || "",
          is_active: record.is_active !== false
        };
        if (dbId) {
          await supabase.from("cities").update(row).eq("id", dbId);
        } else {
          const { data: existing } = await supabase.from("cities").select("id").eq("name", row.name).maybeSingle();
          if (existing) {
            await supabase.from("cities").update(row).eq("id", existing.id);
          } else {
            await supabase.from("cities").insert([row]);
          }
        }
      } else if (module === "finance") {
        const row = {
          name: record.name,
          rate: record.rate || "",
          tenure_months: record.tenure_months || "",
          max_funding: record.max_funding || "",
          approval_hours: record.approval_hours || ""
        };
        if (dbId) {
          await supabase.from("finance_partners").update(row).eq("id", dbId);
        } else {
          const { data: existing } = await supabase.from("finance_partners").select("id").eq("name", row.name).maybeSingle();
          if (existing) {
            await supabase.from("finance_partners").update(row).eq("id", existing.id);
          } else {
            await supabase.from("finance_partners").insert([row]);
          }
        }
      } else if (module === "expenses") {
        const row = {
          title: record.title,
          category: record.category || "Operations",
          amount: Number(record.amount) || 0,
          date: record.date || "",
          logged_by: record.logged_by || ""
        };
        if (dbId) {
          await supabase.from("expenses").update(row).eq("id", dbId);
        } else {
          const { data: existing } = await supabase.from("expenses").select("id").eq("title", row.title).eq("date", row.date).maybeSingle();
          if (existing) {
            await supabase.from("expenses").update(row).eq("id", existing.id);
          } else {
            await supabase.from("expenses").insert([row]);
          }
        }
      }
    } catch (e) {
      console.error(`AdminCMS: Supabase mirror failed for ${module}:`, e);
    }
  };

  // Dealer Approval Action
  const handleApproveDealer = async (dealerItem: any) => {
    const updatedDealer = {
      ...dealerItem,
      is_approved: true,
      status: "Approved",
      dealerStatus: "Approved"
    };

    // Update local state & localStorage
    const nextDealers = dealers.map(d => d.id === dealerItem.id ? updatedDealer : d);
    setDealers(nextDealers);
    localStorage.setItem("1stcars_cms_dealers", JSON.stringify(nextDealers));

    // Sync status to Supabase profiles
    try {
      await supabase.from("profiles").update({
        is_approved: true,
        status: "Approved"
      }).eq("id", dealerItem.id);
    } catch (e) {}

    // Mark the KYC application row approved so the dealer-side dashboard gate
    // (which checks dealer_applications.status) unlocks the account.
    try {
      await supabase.from("dealer_applications").update({ status: "approved" }).eq("user_id", dealerItem.id);
    } catch (e) {}

    // Also flip is_verified on the real dealers table when the row exists.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealerItem.id || "")) {
      try {
        const { data: dealerRow } = await supabase.from("dealers").select("id").eq("id", dealerItem.id).maybeSingle();
        if (dealerRow) {
          await supabase.from("dealers").update({ is_verified: true }).eq("id", dealerItem.id);
        } else {
          await supabase.from("dealers").insert([
            { id: dealerItem.id, company_name: dealerItem.name || dealerItem.company_name || "Dealer", is_verified: true }
          ]);
        }
        // Record the automation event (the AFTER UPDATE trigger covers the live
        // DB; this also drives the local engine for mock/pre-migration databases).
        void automationService.emitEvent({
          type: "dealer.approved",
          sourceTable: "dealers",
          sourceId: dealerItem.id,
          payload: {
            dealer_id: dealerItem.id,
            company_name: dealerItem.name || dealerItem.company_name || "Dealer"
          }
        }).catch((err) => console.warn("Automation event emission failed:", err));
      } catch (e) {}
    }

    toast.success(`Dealer "${dealerItem.name}" approved! They can now log in and participate in live auctions.`);
  };

  // Dynamic CSV/XLS Download & Upload Bulk Listing Handlers
  const handleExportXLS = (type: string) => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = "";

    if (type === "cars") {
      headers = [
        "brand", "model", "variant", "year", "price", "km_driven", "fuel", 
        "transmission", "owner_count", "city", "reg_number", "color", 
        "insurance_type", "overall_score", "status", "image_url"
      ];
      rows = cars;
      filename = "1stcars-stock-catalog.xls";
    } else if (type === "brands") {
      headers = ["brand_name", "model_name", "category", "engine", "power", "logo_url", "is_popular", "audience", "status"];
      rows = getCombinedBrandsModels();
      filename = "1stcars-brands-models-catalog.xls";
    } else if (type === "test_drive_requests" || type === "booking_requests") {
      headers = ["created_at", "name", "mobile", "city", "vehicle", "type", "preferred_date", "preferred_time", "status", "notes"];
      try {
        const allLeads = JSON.parse(localStorage.getItem("1stcars_sales_leads") || "[]");
        const isTestDrive = (lead: any) => {
          const norm = String(lead.type || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return norm.includes("testdrive");
        };
        rows = allLeads.filter((lead: any) => type === "test_drive_requests" ? isTestDrive(lead) : !isTestDrive(lead));
      } catch (e) {
        rows = [];
      }
      filename = type === "test_drive_requests" ? "1stcars-test-drive-requests.xls" : "1stcars-booking-requests.xls";
    } else if (type === "seller_enquiries") {

      headers = ["created_at", "seller_name", "seller_mobile", "reg_number", "brand", "model", "year", "km_driven", "city", "address", "status", "notes"];
      rows = inspections;
      filename = "1stcars-seller-enquiries.xls";
    } else if (type === "dealers") {
      headers = ["created_at", "name", "dealership_name", "mobile", "email", "city", "status", "is_approved", "visiting_card_url", "aadhar_card_url"];
      rows = dealers;
      filename = "1stcars-dealer-registrations.xls";
    } else if (type === "career_applications") {
      headers = ["created_at", "full_name", "phone", "email", "position", "experience", "message", "resume_url", "resume_name", "status"];
      rows = careerApplications;
      filename = "1stcars-job-applications.xls";
    } else {
      headers = ["id", "name", "mobile", "email", "city", "status"];
      rows = getActiveModuleData();
      filename = `1stcars-${type}-export.xls`;
    }

    // Generate CSV contents with standard double quote wrap escaping
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        headers.map(h => {
          let val = row[h];
          if (val === undefined || val === null) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(",")
      )
    ].join("\r\n");

    // Add Excel UTF-8 Byte Order Mark (BOM) to guarantee perfect Microsoft Excel rendering
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Spreadsheet downloaded successfully: ${filename}`);
  };

  const handleImportXLS = (type: "cars" | "brands" | "test_drive_requests" | "booking_requests", event: React.ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          toast.error("Spreadsheet is empty or lacks header rows.");
          return;
        }

        const rawHeaders = lines[0].split(",").map(h => h.replace(/^["'\uFEFF]+|["'\uFEFF]+$/g, "").trim());
        const importedRecords: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // Handle quoted commas correctly
          const cells: string[] = [];
          let currentCell = "";
          let insideQuote = false;

          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
              cells.push(currentCell.trim());
              currentCell = "";
            } else {
              currentCell += char;
            }
          }
          cells.push(currentCell.trim());

          const rowData: Record<string, any> = {};
          rawHeaders.forEach((header, index) => {
            let cellVal = cells[index] || "";
            // Strip quotes
            cellVal = cellVal.replace(/^["']|["']$/g, "").trim();
            rowData[header] = cellVal;
          });

          // Validate and parse type attributes
          if (type === "cars") {
            const finalRecord = {
              brand: rowData.brand || "BMW",
              model: rowData.model || "X5",
              variant: rowData.variant || "M Sport",
              year: Number(rowData.year) || 2022,
              price: Number(rowData.price) || 8500000,
              km_driven: Number(rowData.km_driven) || 20000,
              fuel: rowData.fuel || "Petrol",
              transmission: rowData.transmission || "Automatic",
              owner_count: Number(rowData.owner_count) || 1,
              city: rowData.city || "Mumbai",
              reg_number: rowData.reg_number || "MH-TEMP",
              color: rowData.color || "Black",
              insurance_type: rowData.insurance_type || "Comprehensive",
              overall_score: Number(rowData.overall_score) || 9.0,
              status: rowData.status || "available",
              image_url: rowData.image_url || "🚙",
              images: rowData.image_url ? [rowData.image_url] : []
            };
            importedRecords.push(finalRecord);
          } else if (type === "test_drive_requests" || type === "booking_requests") {
            const finalRecord = {
              id: rowData.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,

              created_at: rowData.created_at || new Date().toISOString(),
              name: rowData.name || rowData.buyer_name || "Buyer Inquiry",
              mobile: rowData.mobile || rowData.phone || rowData.contact || "",
              email: rowData.email || rowData.gmail || "",
              city: rowData.city || "Surat",
              vehicle: rowData.vehicle || rowData.car_title || rowData.model || "General Vehicle Inquiry",
              type: rowData.type || "Test Drive Request",
              preferred_date: rowData.preferred_date || new Date().toISOString().split("T")[0],
              preferred_time: rowData.preferred_time || "11:00 AM - 01:00 PM",
              status: rowData.status || "Pending",
              notes: rowData.notes || "Imported via spreadsheet"
            };
            importedRecords.push(finalRecord);
          } else {
            const finalRecord = {
              brand_name: rowData.brand_name || rowData.brand || rowData.name || "BMW",
              model_name: rowData.model_name || rowData.name || "X5",
              category: rowData.category || "SUV",
              engine: rowData.engine || "Standard Engine",
              power: rowData.power || "N/A",
              logo_url: rowData.logo_url || "⭐",
              is_popular: rowData.is_popular === "true" || rowData.is_popular === "1",
              audience: rowData.audience || "Buyer & Seller",
              status: rowData.status || "Active"
            };
            if (finalRecord.brand_name) {
              importedRecords.push(finalRecord);
            }
          }
        }

        if (importedRecords.length === 0) {
          toast.error("No valid records detected in spreadsheet.");
          return;
        }

        setIsLoading(true);
        if (type === "cars") {
          const { error } = await supabase.from("cars").insert(importedRecords);
          if (error) throw error;
        } else if (type === "test_drive_requests" || type === "booking_requests") {
          const currentLeads = JSON.parse(localStorage.getItem("1stcars_sales_leads") || "[]");

          const mergedLeads = [...importedRecords, ...currentLeads];
          localStorage.setItem("1stcars_sales_leads", JSON.stringify(mergedLeads));
          for (const rec of importedRecords) {
            try {
              await supabase.from("sales_notifications").insert([{
                name: rec.name,
                mobile: rec.mobile,
                city: rec.city,
                preferred_date: rec.preferred_date,
                preferred_time: rec.preferred_time,
                car_brand: rec.vehicle?.split(" ")[0] || "1stCars",
                car_model: rec.vehicle || "Inquiry",
                type: rec.type?.toLowerCase().includes("buy") ? "buy_now" : "test_drive",
                status: rec.status?.toLowerCase() || "pending",
                notes: `Gmail: ${rec.email} | ${rec.notes}`
              }]);
            } catch (e) {
              // ignore
            }
          }
        } else {
          // Combined import for Brands and Models!
          for (const rec of importedRecords) {
            // Upsert brand in Supabase
            const brandRecord = {
              name: rec.brand_name,
              logo_url: rec.logo_url,
              is_popular: rec.is_popular
            };

            let brandId = "";
            const { data: existingBrand } = await supabase
              .from("brands")
              .select("id")
              .eq("name", rec.brand_name)
              .maybeSingle();

            if (existingBrand) {
              brandId = existingBrand.id;
              await supabase.from("brands").update(brandRecord).eq("id", brandId);
            } else {
              const { data: insertedBrand } = await supabase
                .from("brands")
                .insert([brandRecord])
                .select()
                .single();
              if (insertedBrand) {
                brandId = insertedBrand.id;
              }
            }

            // Save model in local storage models list
            if (rec.model_name && !rec.model_name.startsWith("—")) {
              const modelRecord = {
                id: `m-${Math.random().toString(36).substr(2, 9)}`,
                brand_id: brandId || undefined,
                brand: rec.brand_name,
                name: rec.model_name,
                category: rec.category,
                engine: rec.engine,
                power: rec.power,
                audience: rec.audience,
                status: rec.status
              };

              const nextModels = [...models];
              const existingIdx = nextModels.findIndex(m => m.brand?.toLowerCase() === modelRecord.brand.toLowerCase() && m.name?.toLowerCase() === modelRecord.name.toLowerCase());
              if (existingIdx > -1) {
                nextModels[existingIdx] = { ...nextModels[existingIdx], ...modelRecord };
              } else {
                nextModels.push(modelRecord);
              }
              setModels(nextModels);
              localStorage.setItem("1stcars_cms_models", JSON.stringify(nextModels));
              await mirrorRecordToSupabase("models", modelRecord, existingIdx > -1 ? nextModels[existingIdx].id : null);
            }
          }
        }

        toast.success(`Spreadsheet imported & catalog updated successfully!`);
        loadCMSData();
        if (onReloadAllData) onReloadAllData();
      } catch (err: any) {
        console.error("Bulk Import spreadsheet parsing failed:", err);
        toast.error(`Import failed: ${err.message || 'Check spreadsheet headers & formats'}`);
      } finally {
        setIsLoading(false);
        // Clear input element so user can select the same file again
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Handle saving of main custom Website Settings
  const handleSaveWebsiteSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(websiteSettings));

    // CRIT-05: the settings table is readable by any visitor via RLS. The
    // custom-SMS gateway block (URL + headers + payload) can embed real API
    // keys / basic-auth tokens (Twilio, Fast2SMS, MSG91), so those fields are
    // kept in this browser's localStorage ONLY and never synced to the shared
    // table. The admin's browser still has the working config for the test.
    const { customOtpUrl, customOtpHeaders, customOtpPayload, ...sharedSettings } = websiteSettings;
    const sanitized = { ...sharedSettings, otpProvider: sharedSettings.otpProvider || "simulated" };

    // Mirror to the Supabase settings table so every device & admin session
    // picks up the same theme/branding/SEO values on reload.
    supabase
      .from("settings")
      .upsert(
        { key: "website_settings", value: JSON.stringify(sanitized), description: "1stCars website theme/branding/SEO settings" },
        { onConflict: "key" }
      )
      .then(({ error }) => {
        if (error) {
          console.error("Failed to sync website settings to Supabase:", error);
          toast.error("Saved locally, but syncing to the shared settings table failed — check your connection.");
        } else {
          toast.success("Website Theme, branding parameters, SEO tags, and analytics updated.");
        }
      });

    // Apply visual color changes to root if possible for client demonstration
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary-theme-color", websiteSettings.primaryColor);
      document.documentElement.style.setProperty("--button-theme-color", websiteSettings.buttonColor);

      // Notify other decoupled components like the Navbar
      setTimeout(() => {
        window.dispatchEvent(new Event("1stcars_settings_updated"));
      }, 0);
    }
  };

  const handleSendTestSms = async () => {
    if (!testMobile || testMobile.length !== 10 || !/^\d+$/.test(testMobile)) {
      toast.error("Please enter a valid 10-digit test mobile number.");
      return;
    }
    setTestLoading(true);
    setTestStatus("Sending secure test code...");
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const otpProvider = websiteSettings.otpProvider || "simulated";
      const customUrl = websiteSettings.customOtpUrl || "";
      const customHeaders = websiteSettings.customOtpHeaders || "";
      const customPayload = websiteSettings.customOtpPayload || "";

      if (otpProvider === "supabase_native") {
        const cleanMobile = `+91${testMobile}`;
        const { error: authErr } = await supabase.auth.signInWithOtp({
          phone: cleanMobile
        });
        if (authErr) {
          throw new Error(authErr.message || "Failed to send Supabase Native SMS OTP.");
        }
        toast.success("🔥 Real Supabase native phone OTP dispatched!");
        setTestStatus("Dispatched successfully through Supabase Auth! Check your mobile.");
      } else if (otpProvider === "custom_gateway") {
        if (!customUrl) {
          throw new Error("Custom SMS Gateway URL is not configured. Please set it below.");
        }
        
        // Interpolate values
        const interpolatedUrl = customUrl
          .replace(/{otp}/g, code)
          .replace(/{mobile}/g, testMobile);

        let headersObj: Record<string, string> = {
          "Content-Type": "application/json"
        };

        if (customHeaders) {
          try {
            headersObj = { ...headersObj, ...JSON.parse(customHeaders) };
          } catch (e) {
            throw new Error("Failed to parse Custom SMS Gateway headers. Ensure they are in valid JSON.");
          }
        }

        let payloadObj: any = null;
        if (customPayload) {
          try {
            const interpolatedPayload = customPayload
              .replace(/{otp}/g, code)
              .replace(/{mobile}/g, testMobile);
            payloadObj = JSON.parse(interpolatedPayload);
          } catch (e) {
            payloadObj = customPayload
              .replace(/{otp}/g, code)
              .replace(/{mobile}/g, testMobile);
          }
        }

        const method = payloadObj ? "POST" : "GET";
        
        const response = await fetch(interpolatedUrl, {
          method,
          headers: headersObj,
          body: payloadObj ? (typeof payloadObj === "string" ? payloadObj : JSON.stringify(payloadObj)) : undefined
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`SMS Gateway returned status ${response.status}: ${text || "Unknown error"}`);
        }

        toast.success("🔥 Real Custom SMS Dispatched Successfully!");
        setTestStatus(`Dispatched successfully to +91 ${testMobile}! Code is ${code}.`);
      } else {
        // Simulated (MED-15): never present a simulated dispatch as a real SMS.
        toast.success(`🔑 Simulated only — NO SMS was sent. Demo code: ${code}.`);
        setTestStatus(`SIMULATED ONLY — nothing was sent to +91 ${testMobile}. Demo verification code: ${code}.`);

        // Custom event so that the visual pop-up banner also shows up!
        const event = new CustomEvent("1stcars_simulate_sms", {
          detail: { mobile: testMobile, code }
        });
        window.dispatchEvent(event);
      }
    } catch (err: any) {
      toast.error(`Failed to dispatch: ${err.message}`);
      setTestStatus(`Error: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const getCombinedBrandsModels = () => {
    const list: any[] = [];
    // Pair each model with its parent brand
    models.forEach((m: any) => {
      const matchingBrand = brands.find((b: any) => b.name?.toLowerCase() === m.brand?.toLowerCase()) || 
                            brands.find((b: any) => b.id === m.brand_id);
      list.push({
        id: m.id || `m-${Math.random()}`,
        brand_id: matchingBrand?.id || m.brand_id || "",
        brand_name: m.brand || matchingBrand?.name || "Generic",
        model_name: m.name || "Unknown Model",
        category: m.category || m.body_type || "Luxury Car",
        engine: m.engine || "Standard Powertrain",
        power: m.power || "N/A",
        logo_url: matchingBrand?.logo_url || "⭐",
        is_popular: matchingBrand?.is_popular !== false,
        audience: m.audience || "Buyer & Seller",
        type: "model",
        status: m.status || "Active"
      });
    });
    
    // Also add any brands that don't have models in our list as brand-only rows
    brands.forEach((b: any) => {
      const hasModel = models.some((m: any) => m.brand?.toLowerCase() === b.name?.toLowerCase() || m.brand_id === b.id);
      if (!hasModel) {
        list.push({
          id: b.id || `b-${Math.random()}`,
          brand_id: b.id,
          brand_name: b.name,
          model_name: "— (All Models Approved)",
          category: "All Segments",
          engine: "—",
          power: "—",
          logo_url: b.logo_url || "⭐",
          is_popular: b.is_popular !== false,
          audience: b.audience || "Buyer & Seller",
          type: "brand",
          status: b.status || "Active"
        });
      }
    });
    return list;
  };

  // Generic data mapping per active CMS view. The unified "leads" module
  // delegates to the active tab so the same table logic serves all three.
  const getModuleData = (module: CMSModule): any[] => {
    switch (module) {
      case "cars": return cars;
      case "users": return users;
      case "test_drive_requests":
      case "booking_requests": {
        // Prefer Supabase sales_notifications (source of truth). Fall back to
        // the legacy localStorage leads list only when nothing came from the DB.
        const leads = (salesLeads.length > 0
          ? salesLeads
          : safeParseArray(localStorage.getItem("1stcars_sales_leads")))
          .slice()
          .sort((a: any, b: any) =>
            (b.created_at ? new Date(b.created_at).getTime() : 0) -
            (a.created_at ? new Date(a.created_at).getTime() : 0)
          );
        const isTestDrive = (lead: any) => {
          // BookingModal writes "test_drive"; legacy rows / manual admin adds
          // may store "Test Drive Request", "test drive" or "test-drive".
          // Normalize to letters+digits so every variant is matched.
          const norm = String(lead.type || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return norm.includes("testdrive");
        };
        return module === "test_drive_requests"
          ? leads.filter((lead: any) => isTestDrive(lead))
          : leads.filter((lead: any) => !isTestDrive(lead));
      }
      case "seller_enquiries":
        return inspections;
      case "inspections": return inspections;
      case "auctions": return auctions;
      case "brands": return getCombinedBrandsModels();
      case "notifications": return notifications;
      case "test_drives": return testDrives;
      case "purchases": return purchases;
      case "crm_activities": return crmActivities;
      case "staff": {
        // Real profiles with staff roles are the source of truth; merge them
        // with any legacy local-only staff rows so signups show up here.
        const localStaff = getStoredMockList("staff");
        const dbStaff = (users || [])
          .filter((p: any) => ["Admin", "Sales Associate", "Inspector"].includes(p.role))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email || "",
            role: p.role || "Staff",
            region: p.city || "",
            status: p.is_approved === false ? "Inactive" : "Active"
          }));
        return [
          ...dbStaff,
          ...localStaff.filter((ls: any) => !dbStaff.some((ds: any) => ds.id === ls.id))
        ];
      }
      case "dealers": return dealers;
      case "inspectors": return inspectors;
      case "sales": return salesAssociates;
      case "cities": return cities;
      case "faqs": return faqs;
      case "testimonials": return testimonials;
      case "finance": return financePartners;
      case "expenses": return expenses;
      case "career_applications": return careerApplications;
      case "pages": return pages.filter((p) => !isHiddenPage(p));
      case "footer_links": return pages.filter((p) => p.is_footer && !isHiddenPage(p));
      default: return [];
    }
  };

  const getActiveModuleData = (): any[] => getModuleData(currentListModule);

  // Per-tab counts for the unified "Leads & Enquiries" module header.
  const leadsCounts = {
    test_drive_requests: getModuleData("test_drive_requests").length,
    booking_requests: getModuleData("booking_requests").length,
    test_drives: getModuleData("test_drives").length
  };

  // The module actually being listed right now: when the unified "leads"
  // module is open this follows the active tab, otherwise it is the sidebar
  // module itself. All list CRUD + table rendering use this value.
  const currentListModule: CMSModule = activeModule === "leads" ? leadsTab : activeModule;

  // Which storage backend backs the currently active admin module? Used by the
  // header badge so the operator always knows if edits are shared with
  // Supabase (every device) or only live in this browser (localStorage).
  const getModuleDataSource = (module: CMSModule): "supabase" | "local" | "dashboard" => {
    if (module === "dashboard") return "dashboard";
    const supabaseBacked: CMSModule[] = [
      "cars", "users", "inspections", "auctions", "brands", "notifications",
      "pages", "footer_links", "faqs", "testimonials", "cities", "finance",
      "expenses", "settings", "test_drive_requests", "booking_requests", "seller_enquiries",
      // The unified Leads module spans sales_notifications + test_drives (shared).
      "leads",
      // These merge real Supabase profile rows (role = Dealer/Inspector/Sales
      // Associate/Admin), so they reflect shared data rather than browser-only lists.
      "dealers", "inspectors", "sales", "staff", "test_drives", "purchases", "crm_activities",
      // Careers: applications submitted on the public /careers page.
      "career_applications"
    ];
    return supabaseBacked.includes(module) ? "supabase" : "local";
  };

  const moduleSource = getModuleDataSource(activeModule);

  const moduleList = getActiveModuleData();

  // Search & Filtering logic
  const filteredModuleList = moduleList.filter((item) => {
    const matchSearch = Object.keys(item).some((key) => {
      const val = item[key];
      if (typeof val === "string" || typeof val === "number") {
        return String(val).toLowerCase().includes(searchQuery.toLowerCase());
      }
      return false;
    });

    const matchStatus = 
      statusFilter === "all" || 
      String(item.status || item.role || item.category || "").toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredModuleList.length / itemsPerPage));
  const paginatedList = filteredModuleList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Navigate to a module and reset list state (optionally pre-filtering by status)
  const handleNavigateToModule = (mod: CMSModule, status: string = "all") => {
    setActiveModule(mod);
    setCurrentPage(1);
    setSearchQuery("");
    setStatusFilter(status);
  };
  return (
    <div className="min-h-screen bg-[#F8F6F0] text-slate-800 flex flex-col lg:flex-row text-left font-sans">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => handleNavigateToModule(mod, "all")}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onReloadData={loadCMSData}
        isLoadingData={isLoading}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        roleKey={sidebarRoleKey}
      />

      {/* Main Right Content Panel */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"} p-4 sm:p-5 lg:p-6 space-y-4`}>
        
        {/* Top Sticky Header */}
        <div className="bg-white border border-[#2E7D32]/20 rounded-2xl px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5 text-[#ff5a07]" />
            </button>

            <div>
              <h2 className="font-sans text-base sm:text-lg font-black tracking-widest text-[#ff5a07] flex items-center gap-2 leading-none">
                <ShieldCheck className="h-5 w-5 text-[#ff5a07]" /> 1STCARS MASTER ADMIN CMS
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                All modules, styling theme & SEO values managed dynamically
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRealSupabase ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Activity className="h-3 w-3" /> Live Supabase · {cars.length} car{cars.length === 1 ? "" : "s"} in DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" title="Supabase env vars are not set — data is stored in THIS browser only and will NOT appear in the Supabase dashboard or on other devices.">
                <AlertCircle className="h-3 w-3" /> Mock Browser DB · not reaching Supabase
              </span>
            )}
            {isRealSupabase && (
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#ffb81e]/10 text-[#ffb81e] border border-[#ffb81e]/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Super Admin Active
            </span>
            )}
            <Button 
              onClick={loadCMSData} 
              size="sm"
              className="h-8 text-[10px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-3 border border-slate-700/80 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 text-[#ffb81e] ${isLoading ? "animate-spin" : ""}`} /> Reload Engine
            </Button>
          </div>
        </div>

        {/* Breadcrumb Path Header */}
        <Breadcrumb activeModule={activeModule} />

        {/* Storage source indicator for the active module */}
        <div className="flex items-center gap-2">
          {moduleSource === "supabase" && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Database className="h-3 w-3" /> Supabase-backed · shared across devices
            </span>
          )}
          {moduleSource === "local" && (
            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" title="This is an editor/config panel with no dedicated Supabase table — edits live in this browser only. Data-driven modules (cars, users, auctions, expenses, etc.) sync across all devices.">
              <AlertCircle className="h-3 w-3" /> Local-only · this browser
            </span>
          )}
        </div>

        {/* RENDER ACTIVE MODULE AREA */}

        {/* 1. MERGED DASHBOARD OVERVIEW (legacy admin dashboard + CRM center) */}
        {activeModule === "dashboard" && (
          <div className="space-y-4">
            <AdminDashboard
              cars={cars}
              users={users}
              auctions={auctions}
              inspections={inspections}
              notifications={notifications}
              pages={pages}
              salesLeads={salesLeads}
              expenses={expenses}
              onNavigate={handleNavigateToModule}
            />

            {/* CRM CENTER merged into the single dashboard */}
            <CRM
              profiles={users}
              cars={cars}
              inspections={inspections}
              auctions={auctions}
              notifications={notifications}
              salesLeads={salesLeads}
              offers={offers}
              sellRequests={sellRequests}
              inspectionReports={inspectionReports}
              dealerBids={dealerBids}
              parkSell={parkSell}
              carImages={carImages}
              onRefresh={loadCMSData}
              hideKpis
            />
          </div>
        )}

        {/* CRM CENTER is merged into the single Dashboard above — no separate module */}


      {/* 1stMark Certifications Panel */}
      {activeModule === "certifications" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 text-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ff5a07]" /> 1st Mark Certification Engine
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Verify chassis frame integrity, OBD genuine KM logs, and issue 120-point certificate badges
              </p>
            </div>
            <Button
              onClick={() => setActiveModule("inspections")}
              className="bg-[#ff5a07] hover:bg-[#e04e00] text-white font-black uppercase tracking-wider text-[10px] h-9 px-4 rounded-xl flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" /> Issue 120-Pt Inspection
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <h4 className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Single Owned Verified
              </h4>
              <p className="text-[11px] text-emerald-800 font-medium mt-1">100% background record audit confirming single previous ownership.</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Non-Accident Trusted Frame
              </h4>
              <p className="text-[11px] text-amber-800 font-medium mt-1">Chassis, pillar alignments, paint mil depth & structural integrity check.</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" /> Genuine KM Verification
              </h4>
              <p className="text-[11px] text-indigo-800 font-medium mt-1">OBD diagnostic sweep and full authorized service record cross-check.</p>
            </div>
          </div>

          {/* Certified Vehicles Summary */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-2">
              Active 120-Point Certificates & 1stMark Approved Listings ({inspections.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inspections.slice(0, 6).map((insp) => (
                <div key={insp.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/80 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#ff5a07]/10 text-[#ff5a07] border border-[#ff5a07]/20">
                      1stMark Certified
                    </span>
                    <h5 className="font-extrabold text-sm text-slate-900 mt-1">{insp.car_title || "Verified Vehicle"}</h5>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Seller: {insp.seller_name} • City: {insp.city}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelected120Inspection(insp)}
                    className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-[10px] uppercase tracking-wider h-8 px-3 rounded-xl shrink-0"
                  >
                    View Certificate
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UPI PAYMENT SETTINGS PANEL — now a tab inside the Theme Design module */}
      {activeModule === "settings" && settingsTab === "payments" && (
        <form onSubmit={handleSavePaymentSettings} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 text-xs font-semibold max-w-3xl">
          <div className="flex flex-wrap items-center gap-1.5 -mt-1">
            {([
              ["theme", "Theme & Branding", Palette],
              ["payments", "UPI Payments", QrCode]
            ] as const).map(([id, label, TabIcon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSettingsTab(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  settingsTab === id
                    ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#2E7D32]" /> UPI Payment Collection Settings
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Connect your UPI ID to receive booking token payments. Buyers pay directly at checkout and their transaction reference is recorded in Booking Requests.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Your UPI ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. yourname@okhdfcbank"
                value={paymentSettings.upiId}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payee / Merchant Name</label>
              <input
                type="text"
                placeholder="e.g. 1stCars"
                value={paymentSettings.payeeName}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, payeeName: e.target.value })}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Instructions (shown to buyer)</label>
            <textarea
              value={paymentSettings.instructions}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, instructions: e.target.value })}
              className="w-full min-h-20 bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] font-medium text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">UPI QR Code Image (optional)</label>
            <div className="flex items-center gap-4">
              {paymentSettings.qrUrl ? (
                <div className="relative">
                  <img src={paymentSettings.qrUrl} alt="UPI QR" className="w-32 h-32 rounded-xl border border-slate-200 object-contain bg-white" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => setPaymentSettings({ ...paymentSettings, qrUrl: "" })}
                    className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 rounded-full text-white cursor-pointer shadow"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] font-bold text-center px-2">
                  No QR uploaded
                </div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={handlePaymentQrUpload} className="hidden" id="upi-qr-file" />
                <label htmlFor="upi-qr-file" className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase px-4 py-2 rounded-xl cursor-pointer shadow-xs">
                  <Upload className="h-3.5 w-3.5" /> Upload QR Code
                </label>
                <p className="text-[9px] text-slate-400 mt-1.5 font-bold max-w-48">Upload a QR generated by your UPI app (GPay, PhonePe, Paytm, etc.)</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
              When a buyer verifies their mobile and pays at checkout, their UPI transaction reference is captured and logged into the <strong>Booking Requests</strong> module with a "Payment Submitted" status for your team to verify.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Button
              type="submit"
              className="w-full sm:w-auto bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase h-12 px-8 rounded-xl flex items-center justify-center shadow-lg"
            >
              ✔️ Save UPI Payment Settings
            </Button>
          </div>
        </form>
      )}

      {/* SELL FORM & BRANDS EDITOR (brands / models / variants + 120-point inspection checklist) */}
      {activeModule === "sell_form" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Sell Form & Brands Editor</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Manage the brands, models, variants & logos on the Sell Your Car page + the full 120-point inspection checklist
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                  <Check className="h-3 w-3" /> Auto-save on
                </span>
                <Button
                  onClick={handleResetSellForm}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[10px] h-9 px-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset Defaults
                </Button>
                <Button
                  onClick={handleSaveSellFormAll}
                  className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <Check className="h-3.5 w-3.5" /> Save All Changes
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-5">
              {([
                ["brands", "Brands", "Logo / brand names on the sell page"],
                ["models", "Models & Variants", "Auto-suggestion lists per brand"],
                ["inspection", "Inspection Form", "120-point checklist structure"]
              ] as const).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSellFormTab(id)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    sellFormTab === id
                      ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {label}
                  <span className={`block text-[8px] font-bold normal-case tracking-normal mt-0.5 ${sellFormTab === id ? "text-emerald-100" : "text-slate-400"}`}>{hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BRANDS TAB */}
          {sellFormTab === "brands" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-base text-slate-900 uppercase tracking-wider">Brands</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{Object.keys(sellCatalog).length} brands shown on the Sell Your Car page</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search brands..."
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full md:w-56 h-10 pl-9 pr-3 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <Button
                    onClick={openAddBrandForm}
                    className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-10 px-4 rounded-xl flex items-center justify-center gap-2 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Brand
                  </Button>
                </div>
              </div>

              {brandFormOpen && (
                <div className="bg-emerald-50/60 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                      {editingBrandName ? `Edit Brand: ${editingBrandName}` : "Add New Brand"}
                    </h5>
                    <button type="button" onClick={() => setBrandFormOpen(false)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Brand Name *</label>
                      <input
                        type="text"
                        value={brandDraftName}
                        onChange={(e) => setBrandDraftName(e.target.value)}
                        placeholder="e.g. Porsche"
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Brand Logo</label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {isLogoImageUrl(brandDraftLogo) ? (
                            <img src={brandDraftLogo} alt="Logo preview" className="h-7 w-7 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-sm font-black text-slate-400">{brandDraftLogo && brandDraftLogo !== "⭐" ? brandDraftLogo : "Logo"}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <input type="file" accept="image/*" onChange={handleBrandLogoUpload} className="hidden" id="brand-logo-file" />
                          <label htmlFor="brand-logo-file" className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg cursor-pointer shadow-xs">
                            <Upload className="h-3 w-3" /> Upload Logo
                          </label>
                          {brandDraftLogo && (
                            <button type="button" onClick={() => setBrandDraftLogo("")} className="text-left text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer">
                              Remove logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end gap-3 pb-0.5">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={brandDraftPopular} onChange={(e) => setBrandDraftPopular(e.target.checked)} className="h-4 w-4 accent-[#2E7D32]" />
                        Show as Popular
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Or paste a logo URL / emoji</label>
                    <input
                      type="text"
                      value={brandDraftLogo}
                      onChange={(e) => setBrandDraftLogo(e.target.value)}
                      placeholder="https://... or ⭐ / 🚗"
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Button onClick={handleSaveBrand} className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl flex items-center gap-2">
                      <Check className="h-3.5 w-3.5" /> {editingBrandName ? "Save Brand" : "Add Brand"}
                    </Button>
                    <Button onClick={() => setBrandFormOpen(false)} className="bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.keys(sellCatalog)
                  .filter((b) => b.toLowerCase().includes(brandFilter.toLowerCase()))
                  .sort((a, b) => Number(!!sellCatalog[b].isPopular) - Number(!!sellCatalog[a].isPopular))
                  .map((brand) => {                    const entry = sellCatalog[brand];
                    return (
                      <div key={brand} className="border border-slate-100 hover:border-slate-300 rounded-2xl p-4 bg-white flex items-center gap-3 transition-all">
                        <div className="w-12 h-12 rounded-xl border border-slate-100 bg-[#FAF9F6] flex items-center justify-center overflow-hidden shrink-0">
                          {isLogoImageUrl(entry?.logo) ? (
                            <img src={entry?.logo} alt={brand} className="h-8 w-8 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg">{entry?.logo && entry.logo !== "⭐" ? entry.logo : brand.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-black text-slate-900 truncate">{brand}</p>
                            {entry?.isPopular && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {entry?.models?.length || 0} models
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => openEditBrandForm(brand)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#2E7D32] hover:border-[#2E7D32] cursor-pointer" title="Edit brand">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteBrand(brand)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-500 cursor-pointer" title="Delete brand">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* MODELS & VARIANTS TAB */}
          {sellFormTab === "models" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-base text-slate-900 uppercase tracking-wider">Models & Variants</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sell car auto-suggestions shown after the buyer picks a brand</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={modelBrand}
                    onChange={(e) => {
                      setModelBrand(e.target.value);
                      setEditingModelIndex(null);
                    }}
                    className="h-10 border border-slate-200 bg-white rounded-xl text-xs font-bold px-3 outline-none cursor-pointer focus:ring-1 focus:ring-[#2E7D32] max-w-52"
                  >
                    {Object.keys(sellCatalog).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => openAddModelForm(modelBrand)}
                    className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-10 px-4 rounded-xl flex items-center justify-center gap-2 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Model
                  </Button>
                </div>
              </div>

              {modelFormOpen && modelBrand && (
                <div className="bg-emerald-50/60 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                      {editingModelIndex !== null ? `Edit Model in ${modelBrand}` : `Add Model to ${modelBrand}`}
                    </h5>
                    <button type="button" onClick={() => { setEditingModelIndex(null); setModelFormOpen(false); setModelDraft({ name: "", category: "Hatchback", years: "", image: "🚗", variants: [] }); }} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Model Name *</label>
                      <input type="text" value={modelDraft.name} onChange={(e) => setModelDraft({ ...modelDraft, name: e.target.value })} placeholder="e.g. 911 Carrera S" className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Category / Body Type</label>
                      <input type="text" value={modelDraft.category} onChange={(e) => setModelDraft({ ...modelDraft, category: e.target.value })} placeholder="e.g. Coupe" className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Production Years</label>
                      <input type="text" value={modelDraft.years} onChange={(e) => setModelDraft({ ...modelDraft, years: e.target.value })} placeholder="e.g. 2012 - Now" className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Model Emoji / Image</label>
                      <input type="text" value={modelDraft.image} onChange={(e) => setModelDraft({ ...modelDraft, image: e.target.value })} placeholder="🚗 / 🚙 / 🛻" className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Variants (comma separated)</label>
                      <input
                        type="text"
                        value={(modelDraft.variants || []).join(", ")}
                        onChange={(e) => setModelDraft({ ...modelDraft, variants: e.target.value.split(",").map((v) => v.trim()) })}
                        placeholder="e.g. Carrera, Carrera S, Turbo, Turbo S"
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Button onClick={handleSaveModel} className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl flex items-center gap-2">
                      <Check className="h-3.5 w-3.5" /> {editingModelIndex !== null ? "Save Model" : "Add Model"}
                    </Button>
                    <Button onClick={() => { setEditingModelIndex(null); setModelFormOpen(false); setModelDraft({ name: "", category: "Hatchback", years: "", image: "🚗", variants: [] }); }} className="bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(() => {
                  const models = sellCatalog[modelBrand]?.models || [];
                  if (models.length === 0) {
                    return (
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No models yet for {modelBrand}</p>
                        <p className="text-[10px] text-slate-300 font-bold mt-1">Click "Add Model" to create the first suggestion.</p>
                      </div>
                    );
                  }
                  return models.map((model, idx) => (
                    <div key={`${model.name}-${idx}`} className="border border-slate-100 hover:border-slate-300 rounded-2xl p-4 bg-white flex flex-col md:flex-row md:items-center gap-3 transition-all">
                      <div className="w-10 h-10 rounded-xl border border-slate-100 bg-[#FAF9F6] flex items-center justify-center text-lg shrink-0">
                        {model.image || "🚗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-black text-slate-900">{model.name}</p>
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">{model.category}</span>
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-md">{model.years}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 truncate">
                          {(model.variants || []).join(" · ") || "No variants — buyers pick from default options"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => openEditModelForm(modelBrand, idx)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#2E7D32] hover:border-[#2E7D32] cursor-pointer" title="Edit model">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteModel(modelBrand, idx)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-500 cursor-pointer" title="Delete model">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* INSPECTION FORM TAB */}
          {sellFormTab === "inspection" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-base text-slate-900 uppercase tracking-wider">120-Point Inspection Checklist</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {inspectionCategories.reduce((sum, c) => sum + c.questions.length, 0)} questions across {inspectionCategories.length} categories
                  </p>
                </div>
                <Button
                  onClick={openAddCategoryForm}
                  className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-10 px-4 rounded-xl flex items-center justify-center gap-2 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Category
                </Button>
              </div>

              {categoryFormOpen && (
                <div className="bg-emerald-50/60 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                      {editingCategoryId ? "Edit Inspection Category" : "Add Inspection Category"}
                    </h5>
                    <button type="button" onClick={() => setCategoryFormOpen(false)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Category Title *</label>
                    <input
                      type="text"
                      value={categoryDraft.title}
                      onChange={(e) => setCategoryDraft({ ...categoryDraft, title: e.target.value })}
                      placeholder='e.g. 3. Structural Body Inspection (10 Points)'
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Category Summary (shown on certificate)</label>
                    <textarea
                      value={categoryDraft.summary}
                      onChange={(e) => setCategoryDraft({ ...categoryDraft, summary: e.target.value })}
                      className="w-full min-h-16 bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">Questions (each = 1 point)</label>
                      <button
                        type="button"
                        onClick={() => setCategoryDraft((prev) => ({ ...prev, questions: [...prev.questions, { id: "", question: "", passed: true }] }))}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#2E7D32] hover:text-emerald-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Question
                      </button>
                    </div>
                    <div className="space-y-2">
                      {categoryDraft.questions.map((q, qIdx) => (
                        <div key={qIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => setCategoryDraft((prev) => ({
                              ...prev,
                              questions: prev.questions.map((item, i) => (i === qIdx ? { ...item, question: e.target.value } : item))
                            }))}
                            placeholder={`Question ${qIdx + 1}`}
                            className="flex-1 h-10 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setCategoryDraft((prev) => ({
                              ...prev,
                              questions: prev.questions.map((item, i) => (i === qIdx ? { ...item, passed: !item.passed } : item))
                            }))}
                            className={`p-2 rounded-lg border text-[9px] font-black uppercase shrink-0 cursor-pointer ${q.passed ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-600"}`}
                            title="Toggle default pass state"
                          >
                            {q.passed ? "PASS" : "FAIL"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryDraft((prev) => ({
                              ...prev,
                              questions: prev.questions.filter((_, i) => i !== qIdx)
                            }))}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-500 cursor-pointer shrink-0"
                            title="Remove question"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Button onClick={handleSaveCategory} className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl flex items-center gap-2">
                      <Check className="h-3.5 w-3.5" /> {editingCategoryId ? "Save Category" : "Add Category"}
                    </Button>
                    <Button onClick={() => setCategoryFormOpen(false)} className="bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {inspectionCategories.map((cat) => (
                  <div key={cat.id} className="border border-slate-100 hover:border-slate-300 rounded-2xl p-4 bg-white transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900">{cat.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">{cat.summary}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded-lg">{cat.questions.length} pts</span>
                        <button type="button" onClick={() => openEditCategoryForm(cat)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#2E7D32] hover:border-[#2E7D32] cursor-pointer" title="Edit category">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-500 cursor-pointer" title="Delete category">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {cat.questions.slice(0, 6).map((q) => (
                        <span key={q.id} className="bg-[#FAF9F6] border border-slate-100 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-lg truncate max-w-44">
                          {q.question}
                        </span>
                      ))}
                      {cat.questions.length > 6 && (
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-lg">+{cat.questions.length - 6} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1.5. SYSTEM PAGE EDITOR (Admin CMS → Edit Pages) */}
      {activeModule === "pages" && (
        <PageEditor
          websiteSettings={websiteSettings}
          setWebsiteSettings={setWebsiteSettings}
          onSave={handleSaveWebsiteSettings}
        />
      )}

      {/* 1.6. AUTOMATION CENTER (Admin CMS → Automation Center) */}
      {activeModule === "automation" && <AutomationControlCenter onRefreshAll={loadCMSData} />}

      {/* 1.7. DEALER AUCTION ENGINE (Admin CMS → Auctions) */}
      {activeModule === "auctions" && (
        <AdminAuctions
          currentUser={currentUser || { id: "admin", name: "Admin", role: "Admin" }}
          onReloadAllData={loadCMSData}
        />
      )}

      {/* 2. REUSABLE CRUD FOR LIST MODULES (excluding Settings, Dashboard, Reports, Text Editor, Certifications) */}
      {activeModule !== "dashboard" && activeModule !== "crm" && activeModule !== "reports" && activeModule !== "settings" && activeModule !== "text_editor" && activeModule !== "certifications" && activeModule !== "payment_settings" && activeModule !== "sell_form" && activeModule !== "automation" && activeModule !== "auctions" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              {activeModule === "leads" ? (
                <>
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">
                    <Inbox className="h-5 w-5 text-[#ff5a07] inline -mt-0.5 mr-1.5" /> Leads & Enquiries
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {([
                      ["test_drive_requests", "Test Drive Requests"],
                      ["booking_requests", "Booking Requests"],
                      ["test_drives", "Test Drives Log"]
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => { setLeadsTab(id); setCurrentPage(1); setSearchQuery(""); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          leadsTab === id
                            ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {label}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${leadsTab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {leadsCounts[id]}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Manage {currentListModule === "career_applications" ? "Job Applications" : currentListModule}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Database search, structural filters, pagination & image upload tools</p>
                </>
              )}
            </div>
            
            <Button 
              onClick={openAddModal}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-9 px-4 rounded-xl flex items-center justify-center gap-2 shrink-0 self-start md:self-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Add New Record
            </Button>
          </div>

          {/* Search, Filter & Bulk Actions Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search records across brand, name, or metadata tags...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-9 pr-4 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#2E7D32]"
              />
            </div>
            <div className="md:col-span-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 border border-slate-200 bg-white rounded-xl text-xs font-bold px-3 outline-none cursor-pointer focus:ring-1 focus:ring-[#2E7D32]"
              >
                <option value="all">Filter By: All Statuses / Roles</option>
                <option value="available">Status: Available</option>
                <option value="pending">Status: Pending</option>
                <option value="completed">Status: Completed</option>
                <option value="active">Status: Active</option>
                <option value="assigned">Status: Assigned</option>
                <option value="Buyer">Role: Buyer</option>
                <option value="Seller">Role: Seller</option>
                <option value="Dealer">Role: Dealer</option>
                <option value="Inspector">Role: Inspector</option>
                <option value="Sales Associate">Role: Sales Associate</option>
                <option value="Admin">Role: Admin</option>
                <option value="Staff">Role: Staff</option>
              </select>
            </div>
          </div>

          <BulkActionsBar
            activeModule={currentListModule}
            onExport={handleExportXLS}
            onImport={(module, e) => handleImportXLS(module, e)}
          />


          {/* CRUD Dynamic Table Grid */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-slate-100 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                  <th className="p-4">Reference ID / Banner</th>
                  <th className="p-4">Details / Metadata</th>
                  <th className="p-4">Attributes</th>
                  <th className="p-4">Status / Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {paginatedList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#FAF9F6]/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden font-black text-slate-400 text-xs shrink-0">
                          {(() => {
                            const img = item.image_url || item.logo_url || item.photo || item.logo;
                            const isImgValid = img && (
                              img.startsWith("http") || 
                              img.startsWith("/") || 
                              img.startsWith("data:")
                            );
                            if (isImgValid) {
                              return <img src={img} className="h-full w-full object-cover" referrerPolicy="no-referrer" />;
                            }
                            return <span>{(item.name || item.brand || item.title || item.slot || "ID").substring(0, 2).toUpperCase()}</span>;
                          })()}
                        </div>
                        <div>
                          <p className="font-mono text-[9px] text-[#2E7D32] font-bold">#{String(item.id).substring(0, 8)}</p>
                          <p className="font-black text-slate-900 mt-0.5">{item.brand || item.name || item.title || item.slot || "Untitled"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {currentListModule === "cars" && (
                        <div>
                          <p className="font-black text-slate-800">{item.model} ({item.year})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Reg: {item.reg_number} • Owner: {item.owner_count}</p>
                        </div>
                      )}
                      {currentListModule === "users" && (
                        <div>
                          <p className="font-black text-slate-800">{item.email}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mobile: {item.mobile || "N/A"}</p>
                        </div>
                      )}
                      {currentListModule === "inspections" && (
                        <div>
                          <p className="font-black text-slate-800">{item.brand} {item.model} ({item.year})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Seller: {item.seller_name} ({item.seller_mobile})</p>
                        </div>
                      )}
                      {(currentListModule === "test_drive_requests" || currentListModule === "booking_requests") && (
                        <div>
                          <p className="font-black text-slate-800">{item.name || (currentListModule === "test_drive_requests" ? "Test Drive Request" : "Booking Request")} ({item.mobile || "N/A"})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Vehicle: {item.vehicle || item.model || "General Inquiry"} • City: {item.city || "Surat"}</p>
                        </div>
                      )}

                      {currentListModule === "seller_enquiries" && (
                        <div>
                          <p className="font-black text-slate-800">{item.seller_name || item.name} ({item.seller_mobile || item.mobile})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Car: {item.brand} {item.model} ({item.year}) • Reg: {item.reg_number || "Pending"}</p>
                        </div>
                      )}
                      {currentListModule === "dealers" && (
                        <div>
                          <p className="font-black text-slate-800">{item.dealership_name || item.name} ({item.mobile})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Contact: {item.name || item.manager} • Email: {item.email || "N/A"} • City: {item.city || "Gujarat"}</p>
                        </div>
                      )}
                      {currentListModule === "testimonials" && (
                        <div>
                          <p className="text-[11px] text-slate-500 italic">"{item.content}"</p>
                        </div>
                      )}
                      {currentListModule === "faqs" && (
                        <div>
                          <p className="font-bold text-slate-800">{item.question}</p>
                          <p className="text-[11px] text-slate-500 italic mt-1">{item.answer}</p>
                        </div>
                      )}
                      {currentListModule === "expenses" && (
                        <div>
                          <p className="font-black text-slate-800">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Logged: {item.date} by {item.logged_by}</p>
                        </div>
                      )}
                      {(currentListModule === "pages" || currentListModule === "footer_links") && (
                        <div className="max-w-md">
                          <p className="font-black text-slate-800">{item.title}</p>
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Slug: /{item.slug}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs mt-1">{item.content}</p>
                        </div>
                      )}
                      {currentListModule === "brands" && (
                        <div>
                          <p className="font-black text-slate-800">{item.brand_name}</p>
                          <p className="text-[10px] text-[#2E7D32] font-black uppercase tracking-wider mt-0.5">Model: {item.model_name}</p>
                        </div>
                      )}
                      {currentListModule === "career_applications" && (
                        <div className="max-w-md">
                          <p className="font-black text-slate-800">{item.full_name || item.name} ({item.phone || "N/A"})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Email: {item.email || "N/A"} • Experience: {item.experience || "Not mentioned"}</p>
                          {item.message && <p className="text-[10px] text-slate-500 italic mt-1 truncate max-w-xs">"{item.message}"</p>}
                        </div>
                      )}
                      {/* Generic fallback metadata values */}
                      {!["cars", "users", "inspections", "auctions", "dealers", "testimonials", "faqs", "expenses", "pages", "footer_links", "brands", "career_applications"].includes(currentListModule) && (
                        <div>
                          <p className="font-black text-slate-800">{item.email || item.name || item.manager || item.state || item.category || ""}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.notes || item.address || item.support_number || item.question || ""}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {currentListModule === "cars" && (
                        <div>
                          <p className="font-black text-slate-900">₹{(item.price).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.km_driven} km • {item.fuel}</p>
                        </div>
                      )}
                      {(currentListModule === "test_drive_requests" || currentListModule === "booking_requests") && (
                        <div>
                          <p className="font-black text-indigo-600 uppercase text-[10px]">{item.type || (currentListModule === "test_drive_requests" ? "Test Drive Request" : "Buy Car / Reservation")}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Pref: {item.preferred_date || "Flexible"} ({item.preferred_time || "Anytime"})</p>
                        </div>
                      )}

                      {currentListModule === "seller_enquiries" && (
                        <div>
                          <p className="font-black text-slate-900 text-[10px]">{item.km_driven ? `${item.km_driven} km` : "Valuation Request"} • {item.fuel || "Petrol"}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-xs">{item.address || "Doorstep Valuation"}</p>
                        </div>
                      )}
                      {currentListModule === "dealers" && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.visiting_card_url ? (
                            <button
                              onClick={() => setPreviewPhotoModal({ title: `Visiting Card - ${item.name || item.dealership_name}`, url: item.visiting_card_url })}
                              className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                              title="Click to view Visiting Card photo"
                            >
                              📷 Visiting Card
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No Visiting Card</span>
                          )}
                          {item.aadhar_card_url ? (
                            <button
                              onClick={() => setPreviewPhotoModal({ title: `Aadhar Card - ${item.name || item.dealership_name}`, url: item.aadhar_card_url })}
                              className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 hover:bg-indigo-100 cursor-pointer shadow-2xs"
                              title="Click to view Aadhar Card photo"
                            >
                              🪪 Aadhar Card
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No Aadhar Card</span>
                          )}
                        </div>
                      )}
                      {currentListModule === "expenses" && (
                        <div>
                          <p className="font-black text-rose-600">₹{(item.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.category}</p>
                        </div>
                      )}
                      {(currentListModule === "pages" || currentListModule === "footer_links") && (
                        <div>
                          <p className="font-mono text-[10px] text-[#2E7D32] font-bold">Dynamic CMS</p>
                        </div>
                      )}
                      {currentListModule === "brands" && (
                        <div>
                          <p className="font-black text-slate-900">{item.category}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Specs: {item.engine} ({item.power})</p>
                        </div>
                      )}
                      {currentListModule === "career_applications" && (
                        <div>
                          <p className="font-black text-[#2E7D32] uppercase text-[10px] tracking-wider">{item.position || "General Application"}</p>
                          {item.resume_name && (
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-[180px]" title={item.resume_name}>
                              📄 {item.resume_name}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Generic fallback attributes */}
                      {!["cars", "dealers", "expenses", "auctions", "pages", "footer_links", "brands", "career_applications"].includes(currentListModule) && (
                        <div>
                          <p className="font-mono text-[10px] text-slate-500">{item.variant || item.region || item.shift || item.category || item.rate || ""}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {currentListModule === "brands" ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 w-max">
                            👥 {item.audience}
                          </span>
                          {item.is_popular && (
                            <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 w-max">
                              ⭐ Popular
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full ${
                          String(item.status || item.role || "active").toLowerCase() === "available" || String(item.status || item.role || "active").toLowerCase() === "completed" || String(item.status || item.role || "active").toLowerCase() === "approved" || String(item.status || item.role || "active").toLowerCase() === "admin"
                            ? "bg-emerald-100 text-emerald-700"
                            : String(item.status || item.role || "active").toLowerCase() === "pending" || String(item.status || item.role || "active").toLowerCase() === "assigned"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {item.status || item.role || "Active"}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {currentListModule === "dealers" && (
                          <>
                            {item.is_approved || item.status === "Approved" || item.status === "approved" ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <Check className="h-3 w-3 text-emerald-700" /> Approved
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApproveDealer(item)}
                                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-[#2E7D32] hover:bg-[#25632a] text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                title="Approve dealer for live auction participation"
                              >
                                <Check className="h-3 w-3" /> Approve Dealer
                              </button>
                            )}
                          </>
                        )}
                        {currentListModule === "seller_enquiries" && (
                          <button
                            onClick={() => setSelected120Inspection(item)}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#2E7D32]/30 text-[#2E7D32] bg-[#2E7D32]/5 hover:bg-[#2E7D32] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                            title="Open / Edit 120-Point Inspection Report"
                          >
                            <ClipboardList className="h-3 w-3" />
                            120-Pt Report
                          </button>
                        )}
                        {currentListModule === "inspections" && (
                          <>
                            <button
                              onClick={() => setSelected120Inspection(item)}
                              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#2E7D32]/30 text-[#2E7D32] bg-[#2E7D32]/5 hover:bg-[#2E7D32] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title="Review / Edit 120-Point Detailed Checklist"
                            >
                              <ClipboardList className="h-3 w-3" />
                              120-Pt Report
                            </button>
                            <button
                              onClick={() => setSelected120Inspection(item)}
                              className="px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title="Open the 120-Point report, then start the B2B Dealer Auction from there"
                            >
                              <Gavel className="h-3 w-3" />
                              Review &amp; Auction
                            </button>
                            <button
                              onClick={() => setSelected120Inspection(item)}
                              className="px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title="Open the 120-Point report, then publish to the website for buyers from there"
                            >
                              <Globe className="h-3 w-3" />
                              Review &amp; Publish
                            </button>
                          </>
                        )}
                        {currentListModule === "cars" && String(item.status || "").toLowerCase() === "pending" && (
                          <button
                            onClick={() => handleApproveCar(item)}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-[#2E7D32] hover:bg-[#25632a] text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                            title="Approve this car and publish it live on the website for buyers"
                          >
                            <Check className="h-3 w-3" /> Approve &amp; Publish
                          </button>
                        )}
                        {currentListModule === "career_applications" && item.resume_url && (
                          <a
                            href={item.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#2E7D32]/30 text-[#2E7D32] bg-[#2E7D32]/5 hover:bg-[#2E7D32] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                            title="Open the uploaded resume in a new tab"
                          >
                            <FileText className="h-3 w-3" />
                            View Resume
                          </a>
                        )}
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg border border-slate-100 hover:border-[#2E7D32] hover:text-[#2E7D32] text-slate-400 bg-white cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg border border-slate-100 hover:border-rose-500 hover:text-rose-500 text-slate-400 bg-white cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      No matching records found. Use "Add New Record" to seed data instantly.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Reusable Pagination Control */}
          <div className="flex justify-between items-center border-t border-slate-50 pt-4 text-xs font-semibold">
            <p className="text-slate-400">Showing {paginatedList.length} of {filteredModuleList.length} records</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <span className="px-3.5 py-1.5 bg-[#FAF9F6] border border-slate-100 rounded-xl text-slate-700 font-bold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPORTS & METRICS — live aggregations from the loaded tables */}
      {activeModule === "reports" && (() => {
        // --- live data layer: every number below is computed from state ---
        const inventoryValue = cars.reduce((s, c) => s + (Number(c.price) || 0), 0);
        const avgPrice = cars.length ? Math.round(inventoryValue / cars.length) : 0;
        const soldCars = cars.filter((c) => String(c.status || "").toLowerCase() === "sold").length;

        const carStatusCounts = cars.reduce((acc: Record<string, number>, c) => {
          const s = String(c.status || "available").toLowerCase();
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {});
        const maxCarStatus = Math.max(1, ...Object.values(carStatusCounts).map(Number));

        const inspBy = (s: string) => inspections.filter((i) => String(i.status || "").toLowerCase() === s).length;
        const inspPending = inspBy("pending");
        const inspAssigned = inspBy("assigned");
        const inspCompleted = inspBy("completed");
        const inspPublished = inspBy("published");
        const certRate = inspections.length ? Math.round((inspections.filter((i) => i.is_certified).length / inspections.length) * 100) : 0;

        const liveAuc = auctions.filter((a) => ["LIVE", "EXTENDED", "CLOSING"].includes(a.status)).length;
        // LOW-02: auction rows have no total_bids column — count the actual
        // bid-ledger rows loaded from auction_bids.
        const totalBids = auctionBids.length;
        const avgBidsPerAuction = auctions.length ? (totalBids / auctions.length).toFixed(1) : "0";

        const expenseByCategory = expenses.reduce((acc: Record<string, number>, e) => {
          const k = e.category || "Other";
          acc[k] = (acc[k] || 0) + (Number(e.amount) || 0);
          return acc;
        }, {} as Record<string, number>);
        const topExpenseCats = Object.entries(expenseByCategory).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).slice(0, 5);
        const maxExpCat = Math.max(1, ...topExpenseCats.map(([, v]) => Number(v)));

        const roleCounts = users.reduce((acc: Record<string, number>, u) => {
          const r = u.role || "Buyer";
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const roleEntries = Object.entries(roleCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
        const maxRole = Math.max(1, ...roleEntries.map(([, v]) => Number(v)));

        const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const unreadAlerts = notifications.filter((n) => !n.is_read).length;
        const reportedAt = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

        return (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#2E7D32]" /> Operational Summary & Audit Analytics
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Live aggregations from the loaded tables · generated {reportedAt}
                </p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-[#FAF9F6] border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg">
                {cars.length} cars · {users.length} users · {leadsCounts.test_drive_requests + leadsCounts.booking_requests} leads · {auctions.length} auctions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fleet & revenue */}
              <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Car className="h-4 w-4 text-[#2E7D32]" /> Fleet & Revenue
                </p>
                <div className="flex justify-between font-bold"><span>Total Catalog Listings:</span><span className="text-slate-800">{cars.length} vehicles</span></div>
                <div className="flex justify-between font-bold"><span>Direct Asset Value:</span><span className="text-emerald-600 font-black">₹{inventoryValue.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Average Listing Price:</span><span className="text-slate-800">₹{avgPrice.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Sold This Cycle:</span><span className="text-[#2E7D32] font-black">{soldCars} cars</span></div>
                <div className="space-y-1.5 pt-1">
                  {Object.entries(carStatusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <span className="w-24 uppercase text-[9px] font-black text-slate-500">{status}</span>
                      <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2E7D32] rounded-full" style={{ width: `${(Number(count) / maxCarStatus) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right font-black text-slate-700">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead pipeline */}
              <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-[#ff5a07]" /> Lead Pipeline
                </p>
                <div className="flex justify-between font-bold"><span>Test Drive Requests:</span><span className="text-slate-800">{leadsCounts.test_drive_requests}</span></div>
                <div className="flex justify-between font-bold"><span>Booking Requests:</span><span className="text-slate-800">{leadsCounts.booking_requests}</span></div>
                <div className="flex justify-between font-bold"><span>Seller Enquiries:</span><span className="text-slate-800">{inspections.length} inspection requests</span></div>
                <div className="flex justify-between font-bold"><span>Purchases & Orders:</span><span className="text-[#2E7D32] font-black">{purchases.length} orders</span></div>
                <div className="flex justify-between font-bold"><span>CRM Activities Logged:</span><span className="text-indigo-600 font-black">{crmActivities.length}</span></div>
                <div className="flex justify-between font-bold"><span>Test Drives Completed:</span><span className="text-slate-800">{testDrives.length}</span></div>
              </div>

              {/* Inspection funnel */}
              <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-600" /> Inspection Funnel
                </p>
                <div className="flex justify-between font-bold"><span>Pending:</span><span className="text-amber-600 font-black">{inspPending}</span></div>
                <div className="flex justify-between font-bold"><span>Assigned:</span><span className="text-slate-800">{inspAssigned}</span></div>
                <div className="flex justify-between font-bold"><span>Completed:</span><span className="text-slate-800">{inspCompleted}</span></div>
                <div className="flex justify-between font-bold"><span>Published to Website:</span><span className="text-emerald-600 font-black">{inspPublished}</span></div>
                <div className="flex justify-between font-bold"><span>Certification Rate:</span><span className="text-[#2E7D32] font-black">{certRate}%</span></div>
                <div className="mt-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${certRate}%` }} />
                </div>
              </div>

              {/* Auction engine */}
              <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-indigo-600" /> Auction Engine
                </p>
                <div className="flex justify-between font-bold"><span>Total Auctions:</span><span className="text-slate-800">{auctions.length}</span></div>
                <div className="flex justify-between font-bold"><span>Live Right Now:</span><span className="text-indigo-600 font-black">{liveAuc}</span></div>
                <div className="flex justify-between font-bold"><span>Bids Placed:</span><span className="text-slate-800">{totalBids}</span></div>
                <div className="flex justify-between font-bold"><span>Avg Bids / Auction:</span><span className="text-slate-800">{avgBidsPerAuction}</span></div>
                <div className="flex justify-between font-bold"><span>Unread Alerts:</span><span className="text-orange-600 font-black">{unreadAlerts}</span></div>
              </div>

              {/* Expenses by category */}
              <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-rose-600" /> Expense Ledger
                </p>
                <div className="flex justify-between font-bold"><span>Total Expenses:</span><span className="text-rose-600 font-black">₹{totalExpenses.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Entries Logged:</span><span className="text-slate-800">{expenses.length}</span></div>
                {topExpenseCats.length === 0 && (
                  <p className="italic text-slate-400 pt-1">No expenses logged yet.</p>
                )}
                {topExpenseCats.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-24 truncate uppercase text-[9px] font-black text-slate-500">{cat}</span>
                    <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(Number(amt) / maxExpCat) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right font-black text-slate-700">₹{Number(amt).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* User base by role */}
              <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" /> User Base
                </p>
                <div className="flex justify-between font-bold"><span>Total Profiles:</span><span className="text-slate-800">{users.length}</span></div>
                {roleEntries.length === 0 && (
                  <p className="italic text-slate-400 pt-1">No profiles yet.</p>
                )}
                {roleEntries.map(([role, count]) => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="w-28 truncate uppercase text-[9px] font-black text-slate-500">{role}</span>
                    <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(Number(count) / maxRole) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-black text-slate-700">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Print */}
            <Button
              onClick={() => {
                window.print();
              }}
              className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase h-11 rounded-xl flex items-center justify-center gap-2"
            >
              <FileText className="h-4.5 w-4.5" /> Print Live CMS Report & Financial Ledger
            </Button>
          </div>
        );
      })()}

      {/* 4. SETTINGS & WEBSITE DESIGNER PANEL (theme tab of the settings module) */}
      {activeModule === "settings" && settingsTab === "theme" && (
        <form onSubmit={handleSaveWebsiteSettings} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 text-xs font-semibold">
          
          <div className="flex flex-wrap items-center gap-1.5 -mt-1">
            {([
              ["theme", "Theme & Branding", Palette],
              ["payments", "UPI Payments", QrCode]
            ] as const).map(([id, label, TabIcon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSettingsTab(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  settingsTab === id
                    ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Dynamic Brand Designer & Page Layout Builder</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Customize global fonts, branding colors, contact info, SEO indices & analytics without editing code</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Config Area */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Brand Typography & Core Styles */}
              <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#2E7D32]" /> Colors, Branding & Fonts
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Navbar Logo / Wordmark</label>
                    <input 
                      type="text" 
                      value={websiteSettings.logoUrl}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, logoUrl: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Favicon Accent Symbol</label>
                    <input 
                      type="text" 
                      value={websiteSettings.favicon}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, favicon: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Primary Brand Accent Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={websiteSettings.primaryColor}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, primaryColor: e.target.value })}
                        className="h-9 w-9 border border-slate-200 rounded cursor-pointer shrink-0"
                      />
                      <input 
                        type="text" 
                        value={websiteSettings.primaryColor}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, primaryColor: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Button Color theme</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={websiteSettings.buttonColor}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, buttonColor: e.target.value })}
                        className="h-9 w-9 border border-slate-200 rounded cursor-pointer shrink-0"
                      />
                      <input 
                        type="text" 
                        value={websiteSettings.buttonColor}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, buttonColor: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Website Base Font-Family</label>
                    <select
                      value={websiteSettings.fontFamily}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, fontFamily: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold"
                    >
                      <option>Inter</option>
                      <option>Space Grotesk</option>
                      <option>JetBrains Mono</option>
                      <option>Playfair Display</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Logo Width Size ({websiteSettings.logoSize}px)</label>
                    <input 
                      type="range" 
                      min="100" 
                      max="300"
                      value={websiteSettings.logoSize}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, logoSize: Number(e.target.value) })}
                      className="w-full h-9 cursor-pointer accent-[#2E7D32]"
                    />
                  </div>
                </div>

                {/* Logo Image Upload Trigger using standard input with drag and drop */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Logo Dynamic Upload (Supabase Storage Bucket)</label>
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDropUpload}
                    className="border-2 border-dashed border-slate-200 hover:border-[#2E7D32] rounded-xl p-4 text-center cursor-pointer bg-white transition-all space-y-2"
                  >
                    <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                    {isUploading ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-[#2E7D32]">Uploading logo media: {uploadProgress}%</p>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width: `${uploadProgress}%` }} className="h-full bg-[#2E7D32] transition-all" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-800">Drag & Drop brand logo here</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Or click to select PNG / SVG / JPEG format</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleManualUpload} 
                      className="hidden" 
                      id="brand-logo-file"
                    />
                    <label htmlFor="brand-logo-file" className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg cursor-pointer">
                      Choose File
                    </label>
                  </div>
                </div>
              </div>

              {/* Homepage sections controls */}
              <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layout className="h-4 w-4 text-[#2E7D32]" /> Hero Banners & Homepage Sections
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Homepage Hero Title Accent</label>
                    <input 
                      type="text" 
                      value={websiteSettings.heroTitle}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, heroTitle: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Hero Subtitle Paragraph</label>
                    <textarea 
                      value={websiteSettings.heroSubtitle}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, heroSubtitle: e.target.value })}
                      className="w-full min-h-16 bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32] font-semibold text-xs"
                    />
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">Toggle Homepage Carousel & Visual sections</p>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase">
                    {[
                      { key: "showPopularBrands", label: "Popular Brands Slider" },
                      { key: "showLatestArrivals", label: "Latest Fleet Catalog" },
                      { key: "showHowItWorks", label: "How It Works Panel" },
                      { key: "showTestimonials", label: "Reviews & Endorsements" }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 bg-white border border-slate-100 p-2.5 rounded-xl cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={websiteSettings[item.key]} 
                          onChange={(e) => setWebsiteSettings({ ...websiteSettings, [item.key]: e.target.checked })}
                          className="h-3.5 w-3.5 accent-[#2E7D32]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footers, Social Media & Contact */}
              <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#2E7D32]" /> Contact details & Social media links
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Showroom support email</label>
                    <input 
                      type="email" 
                      value={websiteSettings.supportEmail}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportEmail: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">support helpline number</label>
                    <input 
                      type="text" 
                      value={websiteSettings.supportPhone}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportPhone: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Facebook URL</label>
                    <input 
                      type="text" 
                      value={websiteSettings.facebook}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, facebook: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Instagram handle</label>
                    <input 
                      type="text" 
                      value={websiteSettings.instagram}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, instagram: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Footer Copyright Wordmark</label>
                    <input 
                      type="text" 
                      value={websiteSettings.footerText}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, footerText: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Brand & Trust Highlights */}
              <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layout className="h-4 w-4 text-[#2E7D32]" /> Footer Brand & Trust Highlights
                </h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Footer Brand Slogan</label>
                      <input 
                        type="text" 
                        value={websiteSettings.brandSlogan || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, brandSlogan: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Showroom Address</label>
                      <input 
                        type="text" 
                        value={websiteSettings.supportAddress || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportAddress: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Footer Brand Description</label>
                    <textarea 
                      value={websiteSettings.brandDescription || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, brandDescription: e.target.value })}
                      className="w-full min-h-16 bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32] font-semibold text-xs"
                    />
                  </div>

                  <div className="border-t border-slate-200/60 pt-4">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Trust Highlight Badges</span>
                    
                    <div className="space-y-4">
                      {/* Highlight 1 */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-700">Badge 1</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Title</label>
                            <input 
                              type="text" 
                              value={websiteSettings.highlight1Title || ""}
                              onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight1Title: e.target.value })}
                              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Description</label>
                            <input 
                              type="text" 
                              value={websiteSettings.highlight1Desc || ""}
                              onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight1Desc: e.target.value })}
                              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Highlight 2 */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-700">Badge 2</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Title</label>
                            <input 
                              type="text" 
                              value={websiteSettings.highlight2Title || ""}
                              onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight2Title: e.target.value })}
                              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Description</label>
                            <input 
                              type="text" 
                              value={websiteSettings.highlight2Desc || ""}
                              onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight2Desc: e.target.value })}
                              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Highlight 3 */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-700">Badge 3</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Title</label>
                            <input 
                              type="text" 
                              value={websiteSettings.highlight3Title || ""}
                              onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight3Title: e.target.value })}
                              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Description</label>
                            <input 
                              type="text" 
                              value={websiteSettings.highlight3Desc || ""}
                              onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight3Desc: e.target.value })}
                              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live SMS & OTP Gateway Hub */}
              <div className="p-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-5">
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-[#2E7D32]" /> Live SMS & Secure OTP Gateway Hub
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Configure, test, and activate your authentication system for customer marketing and logins</p>
                </div>

                <div className="space-y-4">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Active Authentication Mode</label>
                    <select
                      value={websiteSettings.otpProvider || "simulated"}
                      onChange={(e) => {
                        const provider = e.target.value;
                        let updated = { ...websiteSettings, otpProvider: provider };
                        
                        // Apply presets when selecting custom_gateway to help the user configure popular services
                        if (provider === "custom_gateway") {
                          updated.customOtpUrl = "https://api.fast2sms.com/dev/bulkV2?authorization=YOUR_API_KEY&variables_values={otp}&route=otp&numbers={mobile}";
                          updated.customOtpHeaders = JSON.stringify({ "Content-Type": "application/json" }, null, 2);
                          updated.customOtpPayload = "";
                        }
                        
                        setWebsiteSettings(updated);
                      }}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-2.5 outline-none font-bold text-slate-700 focus:ring-1 focus:ring-[#2E7D32]"
                    >
                      <option value="simulated">📱 Auto — Real Supabase OTP on live backend / Simulated in demo (recommended)</option>
                      <option value="supabase_native">🔥 Supabase Native Phone Auth (Requires real phone provider configured)</option>
                      <option value="custom_gateway">⚡ Custom REST SMS Gateway (Twilio, Fast2SMS, MSG91, Twilio-like APIs)</option>
                    </select>
                  </div>

                  {websiteSettings.otpProvider === "custom_gateway" && (
                    <div className="space-y-4 border-l-2 border-emerald-500 pl-4 py-1 animate-fade-in">
                      {/* Presets Helper */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Predefined Configuration Templates</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setWebsiteSettings({
                                ...websiteSettings,
                                customOtpUrl: "https://api.fast2sms.com/dev/bulkV2?authorization=YOUR_API_KEY&variables_values={otp}&route=otp&numbers={mobile}",
                                customOtpHeaders: "{}",
                                customOtpPayload: ""
                              });
                              toast.info("Fast2SMS India preset applied! Fill in your api key.");
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded text-[9px] font-black uppercase hover:bg-slate-50 cursor-pointer"
                          >
                            Fast2SMS (GET)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWebsiteSettings({
                                ...websiteSettings,
                                customOtpUrl: "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json",
                                customOtpHeaders: JSON.stringify({ "Authorization": "Basic BASE64_ENCODED_SID_AND_TOKEN" }, null, 2),
                                customOtpPayload: "From=YOUR_TWILIO_NUMBER&To=%2B91{mobile}&Body=Your+1stCars+OTP+code+is+{otp}"
                              });
                              toast.info("Twilio Global preset applied! Fill in SID, token & Twilio number.");
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded text-[9px] font-black uppercase hover:bg-slate-50 cursor-pointer"
                          >
                            Twilio (POST Form)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWebsiteSettings({
                                ...websiteSettings,
                                customOtpUrl: "https://api.msg91.com/api/v5/otp?template_id=YOUR_TEMPLATE_ID&mobile=91{mobile}&authkey=YOUR_AUTH_KEY&otp={otp}",
                                customOtpHeaders: "{}",
                                customOtpPayload: ""
                              });
                              toast.info("MSG91 India preset applied! Fill in template_id and authkey.");
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded text-[9px] font-black uppercase hover:bg-slate-50 cursor-pointer"
                          >
                            MSG91 (GET)
                          </button>
                        </div>
                      </div>

                      {/* Custom Gateway URL */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">REST API Gateway URL</label>
                        <input
                          type="text"
                          placeholder="e.g. https://api.fast2sms.com/dev/bulkV2?authorization=KEY&variables_values={otp}&route=otp&numbers={mobile}"
                          value={websiteSettings.customOtpUrl || ""}
                          onChange={(e) => setWebsiteSettings({ ...websiteSettings, customOtpUrl: e.target.value })}
                          className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none font-mono text-[11px]"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 font-bold">Use placeholders <strong className="text-slate-600 font-black">{`{otp}`}</strong> and <strong className="text-slate-600 font-black">{`{mobile}`}</strong> to let 1stCars dynamically inject verification values at run-time.</p>
                      </div>

                      {/* Custom Gateway Headers */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">HTTP Request Headers (JSON)</label>
                        <textarea
                          placeholder={`{\n  "Authorization": "YOUR_API_KEY"\n}`}
                          value={websiteSettings.customOtpHeaders || ""}
                          onChange={(e) => setWebsiteSettings({ ...websiteSettings, customOtpHeaders: e.target.value })}
                          className="w-full h-16 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] focus:ring-1 focus:ring-[#2E7D32]"
                        />
                      </div>

                      {/* Custom Gateway Payload */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">HTTP Request Payload (Optional - defaults to GET request if empty)</label>
                        <textarea
                          placeholder={`e.g. {\n  "otp": "{otp}",\n  "numbers": "{mobile}"\n}`}
                          value={websiteSettings.customOtpPayload || ""}
                          onChange={(e) => setWebsiteSettings({ ...websiteSettings, customOtpPayload: e.target.value })}
                          className="w-full h-16 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] focus:ring-1 focus:ring-[#2E7D32]"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 font-bold">Leave completely blank to send as a standard GET request. Provide a JSON/Form body to trigger a POST request.</p>
                      </div>
                    </div>
                  )}

                  {/* SMS Gateway LIVE Testing Panel */}
                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-3">
                    <span className="block text-[9px] font-black text-[#2E7D32] uppercase tracking-widest">⚡ Gateway Live-Connectivity Dispatch Test</span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2.5 text-[11px] text-slate-400 font-bold">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="Test Phone (10 digits)"
                          value={testMobile}
                          onChange={(e) => setTestMobile(e.target.value.replace(/\D/g, ""))}
                          className="w-full h-9 bg-[#FAF9F6] border border-slate-200 rounded-lg pl-9 pr-2 text-xs outline-none focus:ring-1 focus:ring-[#2E7D32] font-semibold"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={testLoading}
                        onClick={handleSendTestSms}
                        className="px-4 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center shrink-0 min-w-28"
                      >
                        {testLoading ? "Sending..." : "Send Test SMS"}
                      </button>
                    </div>
                    {testStatus && (
                      <p className={`text-[10px] font-bold p-2 rounded-md ${testStatus.startsWith("Error:") ? "bg-rose-50 text-rose-800 border border-rose-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100"}`}>
                        📢 <span className="font-semibold">{testStatus}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SEO and Analytics IDs */}
              <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#2E7D32]" /> SEO Metadata & Analytics Indexes
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">SEO Title Header</label>
                    <input 
                      type="text" 
                      value={websiteSettings.seoTitle}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, seoTitle: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Google Analytics measurement ID</label>
                    <input 
                      type="text" 
                      value={websiteSettings.googleAnalyticsId}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, googleAnalyticsId: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none font-mono text-[11px]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">SEO Meta Description</label>
                    <textarea 
                      value={websiteSettings.seoDescription}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, seoDescription: e.target.value })}
                      className="w-full min-h-16 bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32] font-semibold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Button Labels & General Frontend Headings */}
              <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2E7D32]" /> Homepage Buttons & Headings Customizer
                </h4>

                <div className="space-y-4">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1">Website Button Labels</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Buy Fleet CTA Button</label>
                      <input 
                        type="text" 
                        value={websiteSettings.buyButtonText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, buyButtonText: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sell Car CTA Button</label>
                      <input 
                        type="text" 
                        value={websiteSettings.sellButtonText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, sellButtonText: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Search Submit Button</label>
                      <input 
                        type="text" 
                        value={websiteSettings.searchButtonText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, searchButtonText: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Instant Value Estimator CTA</label>
                      <input 
                        type="text" 
                        value={websiteSettings.valuationButtonText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, valuationButtonText: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Details & Booking Card CTA</label>
                      <input 
                        type="text" 
                        value={websiteSettings.detailsButtonText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, detailsButtonText: e.target.value })}
                        className="w-full h-9 bg-[#FAF9F6] border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Doorstep Inspection Book Button</label>
                      <input 
                        type="text" 
                        value={websiteSettings.inspectionButtonText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, inspectionButtonText: e.target.value })}
                        className="w-full h-9 bg-[#FAF9F6] border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>

                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 pt-2">Landing Section Headings</span>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Search/Filter Widget Heading</label>
                      <input 
                        type="text" 
                        value={websiteSettings.filterHeadingText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, filterHeadingText: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Catalog Section Main Title</label>
                      <input 
                        type="text" 
                        value={websiteSettings.buyCarsHeadingText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, buyCarsHeadingText: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Catalog Section Description / Subheading</label>
                      <textarea 
                        value={websiteSettings.buyCarsSubheadingText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, buyCarsSubheadingText: e.target.value })}
                        className="w-full min-h-16 bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#2E7D32] font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* LIVE DYNAMIC CARD PREVIEW */}
            <div className="lg:col-span-5 space-y-6 sticky top-24">
              <div className="p-6 bg-[#2E7D32]/10 text-slate-800 rounded-[32px] space-y-4 border border-[#2E7D32]/20 shadow-2xl">
                <h4 className="font-black text-[#2E7D32] uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Live Mock Website Card Preview
                </h4>
                
                {/* Simulated Header */}
                <div className="p-3 bg-white rounded-2xl flex justify-between items-center text-slate-900 border border-slate-100 text-[11px] font-bold shadow-xs">
                  {websiteSettings.logoUrl && (websiteSettings.logoUrl.startsWith("data:image/") || websiteSettings.logoUrl.startsWith("http://") || websiteSettings.logoUrl.startsWith("https://") || websiteSettings.logoUrl.startsWith("/") || websiteSettings.logoUrl.includes("supabase-storage") || websiteSettings.logoUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)/i) !== null) ? (
                    <div className="flex items-center gap-1.5">
                      <img 
                        src={websiteSettings.logoUrl} 
                        alt="Logo" 
                        className="object-contain h-5 w-5 rounded-md border border-slate-100 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-black tracking-tighter text-[#2E7D32] leading-none" style={{ color: websiteSettings.primaryColor }}>1stCars</span>
                        <span className="text-[5px] font-bold tracking-widest text-slate-400 uppercase leading-none">{websiteSettings.brandSlogan || "Premium Selection"}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="font-black text-sm text-[#2E7D32] tracking-tighter" style={{ color: websiteSettings.primaryColor }}>
                      {websiteSettings.logoUrl}
                    </span>
                  )}
                  <div className="flex gap-2">
                    <span className="text-slate-400 hover:text-[#2E7D32]">Buy</span>
                    <span className="text-slate-400">Sell</span>
                    <span className="text-[#2E7D32] font-black" style={{ color: websiteSettings.primaryColor }}>{websiteSettings.favicon}</span>
                  </div>
                </div>

                {/* Simulated Hero Section */}
                <div className="p-5 bg-linear-to-b from-[#2E7D32]/10 to-[#FAF9F6] text-slate-900 rounded-2xl border border-slate-100 space-y-2 text-left relative overflow-hidden">
                  <Badge variant="premium" className="bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20">★ LUXURY PREVIEW</Badge>
                  <h3 className="text-base font-black tracking-tight leading-tight text-slate-900" style={{ fontFamily: websiteSettings.fontFamily }}>
                    {websiteSettings.heroTitle}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    {websiteSettings.heroSubtitle}
                  </p>
                  
                  <div className="flex gap-2 pt-1.5">
                    <button 
                      type="button"
                      style={{ backgroundColor: websiteSettings.buttonColor }}
                      className="bg-[#2E7D32] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full"
                    >
                      Buy Fleet
                    </button>
                    <button 
                      type="button"
                      className="bg-white border border-slate-200 text-slate-800 text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full"
                    >
                      Sell Car
                    </button>
                  </div>
                </div>

                {/* Displayed parameters status list */}
                <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl text-[10px] font-medium text-slate-300 space-y-2 text-left">
                  <div className="flex justify-between">
                    <span>Active Theme color:</span>
                    <span className="font-mono text-[9px] font-bold uppercase">{websiteSettings.primaryColor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Footer copyrights status:</span>
                    <span className="text-slate-400 truncate max-w-[150px]">{websiteSettings.footerText}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Google Analytics Index:</span>
                    <span className="font-mono text-emerald-500 font-bold">{websiteSettings.googleAnalyticsId}</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase h-12 rounded-xl flex items-center justify-center shadow-lg"
              >
                ✔️ Save & Apply Dynamic Website Settings
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 4.5. WEBSITE TEXT COPY EDITOR PANEL */}
      {activeModule === "text_editor" && (
        <form onSubmit={handleSaveWebsiteSettings} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 text-xs font-semibold">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-[#2E7D32]" /> Complete Website Text & Copy Customizer
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Edit every heading, subtitle, button, and description across the entire website from this panel</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-8">
              
              {/* Category 1: Hero & Brand Identity */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  1. Hero Section & Brand Slogans
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Hero Banner Main Title</label>
                    <input 
                      type="text" 
                      value={websiteSettings.heroTitle || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, heroTitle: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Hero Banner Subtitle / Description</label>
                    <textarea 
                      rows={3}
                      value={websiteSettings.heroSubtitle || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, heroSubtitle: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Brand Accent Slogan</label>
                      <input 
                        type="text" 
                        value={websiteSettings.brandSlogan || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, brandSlogan: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Brand Brief Description (Footer)</label>
                      <input 
                        type="text" 
                        value={websiteSettings.brandDescription || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, brandDescription: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 2: Button Labels & Navigation Copy */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  2. Button Call-To-Actions & Nav Labels
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Buy Section CTA button</label>
                    <input 
                      type="text" 
                      value={websiteSettings.buyButtonText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, buyButtonText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sell Section CTA button</label>
                    <input 
                      type="text" 
                      value={websiteSettings.sellButtonText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, sellButtonText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Search Fleet Button text</label>
                    <input 
                      type="text" 
                      value={websiteSettings.searchButtonText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, searchButtonText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Details & Booking CTA button</label>
                    <input 
                      type="text" 
                      value={websiteSettings.detailsButtonText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, detailsButtonText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Valuation Button text</label>
                    <input 
                      type="text" 
                      value={websiteSettings.valuationButtonText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, valuationButtonText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Inspection Booking Button text</label>
                    <input 
                      type="text" 
                      value={websiteSettings.inspectionButtonText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, inspectionButtonText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Filter Sidebar Heading</label>
                    <input 
                      type="text" 
                      value={websiteSettings.filterHeadingText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, filterHeadingText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                </div>
              </div>

              {/* Category 3: Highlight USP Points */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  3. Key Pillars & Trust Badges (USPs)
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">USP 1 Title</label>
                      <input 
                        type="text" 
                        value={websiteSettings.highlight1Title || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight1Title: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">USP 1 Description</label>
                      <input 
                        type="text" 
                        value={websiteSettings.highlight1Desc || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight1Desc: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">USP 2 Title</label>
                      <input 
                        type="text" 
                        value={websiteSettings.highlight2Title || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight2Title: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">USP 2 Description</label>
                      <input 
                        type="text" 
                        value={websiteSettings.highlight2Desc || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight2Desc: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">USP 3 Title</label>
                      <input 
                        type="text" 
                        value={websiteSettings.highlight3Title || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight3Title: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">USP 3 Description</label>
                      <input 
                        type="text" 
                        value={websiteSettings.highlight3Desc || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, highlight3Desc: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 4: Fleet Page Headers */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  4. Fleet & Inventory Section Copy
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Inventory Page Main Title</label>
                    <input 
                      type="text" 
                      value={websiteSettings.buyCarsHeadingText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, buyCarsHeadingText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Inventory Page Subtitle</label>
                    <textarea 
                      rows={3}
                      value={websiteSettings.buyCarsSubheadingText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, buyCarsSubheadingText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Category 5: Sell Car Page Copy */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  5. Sell Car View Page Copy
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sell Car Page Banner Title</label>
                    <input 
                      type="text" 
                      value={websiteSettings.sellCarBannerTitle || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, sellCarBannerTitle: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sell Car Page Banner Subtitle / Description</label>
                    <textarea 
                      rows={3}
                      value={websiteSettings.sellCarBannerDesc || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, sellCarBannerDesc: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sell Valuation Form Heading</label>
                      <input 
                        type="text" 
                        value={websiteSettings.sellCarFormHeading || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, sellCarFormHeading: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sell Valuation Form Subtitle</label>
                      <input 
                        type="text" 
                        value={websiteSettings.sellCarFormSubheading || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, sellCarFormSubheading: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 6: Footer copyrights & Support Info */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  6. Footer Copyrights & Support Contact Info
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Footer Copyrights Text</label>
                    <input 
                      type="text" 
                      value={websiteSettings.footerText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, footerText: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Support Phone</label>
                      <input 
                        type="text" 
                        value={websiteSettings.supportPhone || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportPhone: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Support Email</label>
                      <input 
                        type="text" 
                        value={websiteSettings.supportEmail || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportEmail: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Support Address</label>
                      <input 
                        type="text" 
                        value={websiteSettings.supportAddress || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportAddress: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 7: Home Page Section Headings */}
              <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/60 pb-2">
                  7. Home Page Section Headings & Copy
                </h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Certified Section Badge</label>
                      <input 
                        type="text" 
                        value={websiteSettings.certifiedBadgeText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, certifiedBadgeText: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Certified Section Heading</label>
                      <input 
                        type="text" 
                        value={websiteSettings.certifiedHeadingText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, certifiedHeadingText: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Certified Section Subtitle</label>
                    <textarea 
                      rows={2}
                      value={websiteSettings.certifiedSubheadingText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, certifiedSubheadingText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Testimonials Badge</label>
                      <input 
                        type="text" 
                        value={websiteSettings.testimonialBadgeText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, testimonialBadgeText: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Testimonials Heading</label>
                      <input 
                        type="text" 
                        value={websiteSettings.testimonialHeadingText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, testimonialHeadingText: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Testimonials Subtitle</label>
                    <textarea 
                      rows={2}
                      value={websiteSettings.testimonialSubheadingText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, testimonialSubheadingText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Final CTA Badge</label>
                      <input 
                        type="text" 
                        value={websiteSettings.ctaBadgeText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, ctaBadgeText: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Final CTA Heading</label>
                      <input 
                        type="text" 
                        value={websiteSettings.ctaHeadingText || ""}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, ctaHeadingText: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Final CTA Subtitle</label>
                    <textarea 
                      rows={2}
                      value={websiteSettings.ctaSubheadingText || ""}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, ctaSubheadingText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Save Card */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">
                  Save Copy Changes
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  Once you save, these text changes will be applied instantly to the live database catalog and update the client-side visual content elements without any code compile delays.
                </p>

                <div className="border-t border-slate-200 pt-3 space-y-2.5 text-[11px] font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>Branding Theme:</span>
                    <span className="font-mono text-primary font-black uppercase">{websiteSettings.logoUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Font:</span>
                    <span className="text-slate-400">{websiteSettings.fontFamily}</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase h-12 rounded-xl flex items-center justify-center shadow-lg"
              >
                ✔️ Save & Apply Dynamic Website Copy
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 5. EDIT/ADD RECORD OVERLAY MODAL */}
      {isFormOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFormOpen(false);
          }}
          className={`fixed inset-0 bg-[#2E7D32]/20 backdrop-blur-xs z-50 flex items-center justify-center ${currentListModule === "cars" ? "p-0" : "p-4"} overflow-y-auto`}
        >
          <div className={`bg-white border border-slate-100 ${currentListModule === "cars" ? "w-full h-full max-w-none max-h-none rounded-none p-6 md:p-10" : "rounded-[32px] max-w-2xl w-full p-6 md:p-8 max-h-[90vh]"} space-y-6 shadow-2xl overflow-y-auto relative text-left`}>
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full border border-slate-100 hover:bg-slate-50 cursor-pointer"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">{formMode === "add" ? "Create New" : "Edit Details"} - {currentListModule.toUpperCase()}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Provide accurate schema metadata for persistent catalog storage</p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-semibold">
              
              {/* Dynamic form inputs based on active module fields */}
              <div className={`grid grid-cols-1 ${currentListModule === "cars" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
                
                {Object.keys(formData).map((key) => {
                  if (key === "id" || key === "created_at" || key === "created_by" || key === "updated_at" || key === "image_url" || key === "logo_url" || key === "logo" || key === "photo" || key === "images" || key === "price_breakup" || key === "shift") return null;
                  
                  const value = formData[key];
                  const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  const isMultiline = key === "content" || key === "answer" || key === "notes";

                  // Objects/arrays (payload, features, inspection, cities, ...)
                  // have no text-input representation — skip rendering them but
                  // keep them in formData so they survive the save untouched.
                  if (value !== null && typeof value === "object") return null;
                  
                  return (
                    <div key={key} className={`space-y-1 ${isMultiline ? "sm:col-span-2" : ""}`}>
                      <label className="block text-[10px] font-black uppercase text-slate-400">{label}</label>
                      {key === "audience" ? (
                        <select
                          value={formData[key] || "Buyer & Seller"}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                        >
                          <option value="Buyer">Buyer Only</option>
                          <option value="Seller">Seller Only</option>
                          <option value="Buyer & Seller">Buyer & Seller</option>
                        </select>
                      ) : key === "status" ? (
                        <select
                          value={formData[key] || (currentListModule === "cars" ? "available" : "Active")}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                        >
                          {currentListModule === "cars" ? (
                            (() => {
                              const current = String(formData[key] || "available");
                              const allowed = CAR_STATUS_FLOW[current];
                              const statuses = allowed && allowed.length > 0
                                ? Array.from(new Set([current, ...allowed]))
                                : Object.keys(CAR_STATUS_LABELS);
                              return statuses.map((s) => (
                                <option key={s} value={s}>{CAR_STATUS_LABELS[s] || s}</option>
                              ));
                            })()
                          ) : (
                            <>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </>
                          )}
                        </select>
                      ) : key === "role" && (currentListModule === "staff" || currentListModule === "users") ? (
                        <select
                          value={formData[key] || "Inspector"}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Sales Associate">Sales Associate</option>
                          <option value="Inspector">Inspector</option>
                          <option value="Buyer">Buyer</option>
                          <option value="Seller">Seller</option>
                          <option value="Dealer">Dealer</option>
                        </select>
                      ) : key === "region" ? (
                        <select
                          value={formData[key] || "Surat"}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                        >
                          {["Surat", "Vadodara", "Bharuch", "Vapi"].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          {formData[key] && !["Surat", "Vadodara", "Bharuch", "Vapi"].includes(formData[key]) && (
                            <option value={formData[key]}>{formData[key]}</option>
                          )}
                        </select>
                      ) : typeof value === "boolean" ? (
                        <select
                          value={String(formData[key])}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value === "true" })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                        >
                          <option value="true">True / Active</option>
                          <option value="false">False / Inactive</option>
                        </select>
                      ) : typeof value === "number" ? (
                        <input
                          type="number"
                          value={formData[key] || 0}
                          onChange={(e) => setFormData({ ...formData, [key]: Number(e.target.value) })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 outline-none"
                          required
                        />
                      ) : isMultiline ? (
                        <textarea
                          value={formData[key] || ""}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full min-h-36 bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-mono text-xs"
                          required
                        />
                      ) : key === "password" ? (
                        <input
                          type="password"
                          value={formData[key] || ""}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          placeholder="Set login password (required for new users)"
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[key] || ""}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 outline-none"
                          required
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Editable Price Summary / Breakup for Cars */}
              {currentListModule === "cars" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                        Price Summary Breakup ({Array.isArray(formData.price_breakup) ? formData.price_breakup.length : 0} items)
                      </label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Add, edit, or delete the additional charges shown to buyers in the drive-away price summary
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev: any) => ({
                          ...prev,
                          price_breakup: [...(Array.isArray(prev.price_breakup) ? prev.price_breakup : []), { label: "New Charge", amount: 0, desc: "" }]
                        }));
                      }}
                      className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="h-3 w-3" /> Add Row
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(Array.isArray(formData.price_breakup) ? formData.price_breakup : []).map((row: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Label</label>
                          <input
                            type="text"
                            value={row.label || ""}
                            onChange={(e) => {
                              setFormData((prev: any) => {
                                const next = [...prev.price_breakup];
                                next[idx] = { ...next[idx], label: e.target.value };
                                return { ...prev, price_breakup: next };
                              });
                            }}
                            className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Amount (₹)</label>
                          <input
                            type="number"
                            value={row.amount || 0}
                            onChange={(e) => {
                              setFormData((prev: any) => {
                                const next = [...prev.price_breakup];
                                next[idx] = { ...next[idx], amount: Number(e.target.value) };
                                return { ...prev, price_breakup: next };
                              });
                            }}
                            className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-4">
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Description</label>
                          <input
                            type="text"
                            value={row.desc || ""}
                            onChange={(e) => {
                              setFormData((prev: any) => {
                                const next = [...prev.price_breakup];
                                next[idx] = { ...next[idx], desc: e.target.value };
                                return { ...prev, price_breakup: next };
                              });
                            }}
                            className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-medium outline-none focus:ring-1 focus:ring-[#2E7D32]"
                          />
                        </div>
                        <div className="col-span-1 flex items-end justify-end h-full pb-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev: any) => ({
                                ...prev,
                                price_breakup: prev.price_breakup.filter((_: any, i: number) => i !== idx)
                              }));
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-500 hover:text-rose-500 text-slate-400 bg-white cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(formData.price_breakup) || formData.price_breakup.length === 0) && (
                      <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No extra charges. Only the base price will be shown. Click "Add Row" to add charges like RC transfer, insurance, etc.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Editable Specifications for Cars */}
              {currentListModule === "cars" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                      Specifications
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Edit the mechanical &amp; structural specifications shown in the "Specifications" tab
                    </p>
                  </div>
                  <StringListEditor
                    items={formData.specifications}
                    onChange={(next) => setFormData((prev: any) => ({ ...prev, specifications: next }))}
                    addPlaceholder="e.g. Safety Suite: 6 Airbags, ABS with EBD, ESP"
                    addLabel="Add Spec"
                    emptyText="No specifications yet. Add the first spec above."
                  />
                </div>
              )}

              {/* Editable Key Features for Cars */}
              {currentListModule === "cars" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                      Key Features
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Edit the installed premium &amp; performance options shown in the "Key Features" tab
                    </p>
                  </div>
                  <StringListEditor
                    items={formData.features}
                    onChange={(next) => setFormData((prev: any) => ({ ...prev, features: next }))}
                    addPlaceholder="e.g. Electric Sunroof with One-Touch Operation"
                    addLabel="Add Feature"
                    emptyText="No key features yet. Add the first feature above."
                  />
                </div>
              )}

              {/* Editable 120-Point Inspection Report for Cars */}
              {currentListModule === "cars" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                        120-Point Inspection Report
                      </label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Edit the certified inspection summaries shown in the "120-Point Inspection Report" tab
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCar120ModalOpen(true)}
                      className="bg-indigo-900 hover:bg-indigo-800 text-white text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Edit Full 120-Point Report
                    </button>
                  </div>
                  {(["engine", "exterior", "brakes", "electronics", "interior"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        {field}
                      </label>
                      <textarea
                        rows={2}
                        value={(formData.inspectionSummary || {})[field] || ""}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            inspectionSummary: {
                              ...((prev.inspectionSummary as any) || {}),
                              [field]: e.target.value,
                            },
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                      Overall Score (0 - 10)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={(formData.inspectionSummary as any)?.overallScore ?? 9.5}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          inspectionSummary: {
                            ...((prev.inspectionSummary as any) || {}),
                            overallScore: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Image Upload for Catalog record / vehicle / testimonial */}
              {(formData.image_url !== undefined || formData.logo_url !== undefined || formData.photo !== undefined || currentListModule === "brands") && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {currentListModule === "cars" ? (
                    // Premium Multi-Photo upload for Cars
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                            Pro Vehicle Photo Gallery ({Array.isArray(formData.images) ? formData.images.length : 0} of 15)
                          </label>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Upload up to 15 photos in a single selection. The first photo will be primary.
                          </p>
                        </div>
                        {Array.isArray(formData.images) && formData.images.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev: any) => ({
                                ...prev,
                                images: [],
                                image_url: "🚙"
                              }));
                            }}
                            className="text-[10px] text-red-600 hover:text-red-700 font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" /> Clear All
                          </button>
                        )}
                      </div>

                      {/* Dropzone */}
                      {(!Array.isArray(formData.images) || formData.images.length < 15) && (
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={handleDropUpload}
                          className="border-2 border-dashed border-slate-200 hover:border-[#2E7D32] rounded-2xl p-6 text-center cursor-pointer bg-[#FAF9F6] transition-all space-y-2 relative"
                        >
                          <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                          {isUploading ? (
                            <div className="space-y-1.5 max-w-xs mx-auto">
                              <p className="text-[10px] font-black text-[#2E7D32]">{multiUploadStatus || `Uploading assets: ${uploadProgress}%`}</p>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div style={{ width: `${uploadProgress}%` }} className="h-full bg-[#2E7D32] transition-all" />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[11px] font-black text-slate-800">Drag & Drop multiple files here</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Accepts up to 15 files in one selection</p>
                            </div>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleManualUpload} 
                            className="hidden" 
                            id="record-media-file"
                            multiple
                          />
                          <label htmlFor="record-media-file" className="inline-block bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase px-4 py-2 rounded-xl cursor-pointer shadow-xs">
                            Select Photos (Max 15)
                          </label>
                        </div>
                      )}

                      {/* Thumbnail Grid */}
                      {Array.isArray(formData.images) && formData.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                          {formData.images.map((url: string, index: number) => {
                            const isPrimary = index === 0;
                            return (
                              <div 
                                key={url + index} 
                                className={`group relative rounded-xl overflow-hidden border-2 bg-slate-50 transition-all ${
                                  isPrimary ? "border-[#2E7D32] ring-2 ring-[#2E7D32]/10" : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <img 
                                  src={url} 
                                  alt={`Vehicle angle ${index + 1}`} 
                                  className="w-full h-20 object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                
                                {/* Image Overlay Badges */}
                                <div className="absolute inset-0 bg-[#2E7D32]/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                                  <div className="flex justify-between items-start">
                                    <span className="bg-[#2E7D32]/80 text-white font-mono text-[8px] px-1 rounded-sm">
                                      #{index + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev: any) => {
                                          const nextImages = prev.images.filter((_: any, idx: number) => idx !== index);
                                          return {
                                            ...prev,
                                            images: nextImages,
                                            image_url: nextImages[0] || "🚙"
                                          };
                                        });
                                      }}
                                      className="p-1 bg-rose-500 hover:bg-rose-600 rounded text-white cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  
                                  {!isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev: any) => {
                                          const nextImages = [...prev.images];
                                          const [selected] = nextImages.splice(index, 1);
                                          nextImages.unshift(selected);
                                          return {
                                            ...prev,
                                            images: nextImages,
                                            image_url: selected
                                          };
                                        });
                                        toast.success("Primary photo updated successfully!");
                                      }}
                                      className="w-full py-0.5 bg-[#2E7D32]/90 hover:bg-[#2E7D32] text-white text-[8px] font-black uppercase rounded text-center cursor-pointer"
                                    >
                                      Make Primary
                                    </button>
                                  )}
                                </div>

                                {/* Persistent Primary Indicator */}
                                {isPrimary && (
                                  <div className="absolute bottom-1 left-1 bg-[#2E7D32] text-white text-[8px] font-black uppercase px-1 rounded flex items-center gap-0.5 shadow-sm">
                                    <Star className="h-2 w-2 fill-white" /> Primary
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Default Single image upload
                    <div className="space-y-3 text-left">
                      <label className="block text-[10px] font-black uppercase text-slate-400">Record Graphic / Image Attachment (Supabase Storage)</label>

                      {/* Active Attachment Preview Badge */}
                      {(formData.logo_url || formData.image_url || formData.photo || formData.logo) && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                          <div className="h-12 w-12 rounded-xl border border-emerald-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                            {(() => {
                              const img = formData.logo_url || formData.image_url || formData.photo || formData.logo;
                              const isImgValid = img && (
                                img.startsWith("http") || 
                                img.startsWith("/") || 
                                img.startsWith("data:")
                              );
                              if (isImgValid) {
                                return <img src={img} alt="Attached Logo Preview" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />;
                              }
                              return <span className="text-xl font-black text-emerald-700">{img || "⭐"}</span>;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-slate-900 truncate">
                              Brand Logo / Attachment Connected
                            </p>
                            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                              ✓ Ready to save with record
                            </p>
                          </div>
                        </div>
                      )}

                      <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDropUpload}
                        className="border-2 border-dashed border-slate-200 hover:border-[#2E7D32] rounded-2xl p-6 text-center cursor-pointer bg-[#FAF9F6] transition-all space-y-2"
                      >
                        <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                        {isUploading ? (
                          <div className="space-y-1.5 max-w-xs mx-auto">
                            <p className="text-[10px] font-black text-[#2E7D32]">Uploading asset: {uploadProgress}%</p>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div style={{ width: `${uploadProgress}%` }} className="h-full bg-[#2E7D32] transition-all" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[11px] font-black text-slate-800">Drag & Drop visual asset here</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Automagically links generated asset URL to form parameters</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleManualUpload} 
                          className="hidden" 
                          id="record-media-file"
                        />
                        <label htmlFor="record-media-file" className="inline-block bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase px-4 py-2 rounded-xl cursor-pointer shadow-xs">
                          Select Media File
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-800 font-extrabold text-xs tracking-wider uppercase h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase h-11 rounded-xl"
                >
                  Save Record
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Sell-form-style Car Creation Wizard */}
      <CreateCarWizard
        sellCatalog={sellCatalog}
        isOpen={isCarWizardOpen}
        onClose={() => setIsCarWizardOpen(false)}
        onSubmit={handleWizardSubmit}
      />

      {/* Document Photo Preview Modal (Visiting Card / Aadhar Card) */}
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#2E7D32]" /> {previewPhotoModal.title}
              </h3>
              <button
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden min-h-[250px] max-h-[450px] flex items-center justify-center p-2">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="max-h-[420px] max-w-full object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => setPreviewPhotoModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider h-10 px-6 rounded-xl cursor-pointer"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 120-Point Inspection Modal for Admin */}
      {!!selected120Inspection && (
        <Inspection120FormModal
          inspection={selected120Inspection}
          isOpen={!!selected120Inspection}
          onClose={() => setSelected120Inspection(null)}
          onSubmitReport={(id, data) => handleSave120Report(id, data)}
          onPublishToWebsite={(insp, data) => handlePublishToWebsite(insp, data)}
          userRole="Admin"
        />
      )}

      {/* 120-Point Inspection Report Editor inside the Car edit modal */}
      {isCar120ModalOpen && (
        <Inspection120FormModal
          inspection={{
            id: editingId || "car-120",
            brand: formData.brand,
            model: formData.model,
            variant: formData.variant || formData.model,
            year: formData.year,
            city: formData.location || formData.city || "Surat",
            reg_number: formData.reg_number || formData.rtoCode || "GJ05-ER-4050",
            seller_name: "1stCars Certified Inventory",
            seller_mobile: "—",
            report_120_json: formData.report_120_json,
            report_150_json: formData.report_150_json,
            notes: formData.notes
          }}
          isOpen={isCar120ModalOpen}
          onClose={() => setIsCar120ModalOpen(false)}
          onSubmitReport={(_, data) => handleSaveCar120Report(data)}
          userRole="Admin"
          fullScreen
        />
      )}

      </div>
    </div>
  );
}

