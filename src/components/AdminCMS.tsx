import * as React from "react";
import { 
  Search, Filter, Plus, Edit3, Trash2, RefreshCw, 
  Check, X, AlertCircle, Sparkles, Folder, Settings, 
  ShieldCheck, DollarSign, Users, Award, FileText, Bell, 
  HelpCircle, Star, ThumbsUp, Layers, Palette, Layout, 
  Play, Clock, ShieldAlert, BarChart3, TrendingUp, Info, 
  Activity, Shield, Hammer, MapPin, Calendar, Heart, 
  MessageSquare, ClipboardList, BookOpen, UserCheck, Eye, 
  Upload, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, ArrowDownToLine, ArrowUpFromLine,
  Car, Link
} from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { seedSupabaseDatabase } from "@/src/lib/seeder";
import { toast } from "@/src/lib/toast";

interface AdminCMSProps {
  onReloadAllData?: () => void;
  onNavigateToInventory?: () => void;
}

type CMSModule = 
  | "dashboard" | "cars" | "users" | "staff" | "dealers" | "inspectors" | "sales"
  | "inspections" | "auctions" | "park_sell" | "brands" | "cities"
  | "faqs" | "testimonials" | "finance" | "warranty" | "notifications" | "expenses"
  | "reports" | "pages" | "footer_links" | "settings" | "text_editor";

export function AdminCMS({ onReloadAllData, onNavigateToInventory }: AdminCMSProps) {
  // Active sub-module within Admin CMS
  const [activeModule, setActiveModule] = React.useState<CMSModule>("dashboard");

  // Local state for all CMS lists
  const [cars, setCars] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [inspections, setInspections] = React.useState<any[]>([]);
  const [auctions, setAuctions] = React.useState<any[]>([]);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [pages, setPages] = React.useState<any[]>([]);
  
  // Custom mock/localStorage tables for the other modules requested
  const [dealers, setDealers] = React.useState<any[]>([]);
  const [inspectors, setInspectors] = React.useState<any[]>([]);
  const [salesAssociates, setSalesAssociates] = React.useState<any[]>([]);
  const [parkSell, setParkSell] = React.useState<any[]>([]);
  const [models, setModels] = React.useState<any[]>([]);
  const [cities, setCities] = React.useState<any[]>([]);
  const [faqs, setFaqs] = React.useState<any[]>([]);
  const [testimonials, setTestimonials] = React.useState<any[]>([]);
  const [financePartners, setFinancePartners] = React.useState<any[]>([]);
  const [warrantyPlans, setWarrantyPlans] = React.useState<any[]>([]);
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [websiteSettings, setWebsiteSettings] = React.useState<any>({
    logoUrl: "🏎️ 1stCars",
    logoSize: 150,
    favicon: "⭐",
    primaryColor: "#2E7D32",
    accentColor: "#FAF9F6",
    buttonColor: "#2E7D32",
    fontFamily: "Inter",
    heroTitle: "Buy & Sell Certified Cars With Total Confidence",
    heroSubtitle: "Inspired by rigorous standards, reimagined for ultimate convenience.",
    showPopularBrands: true,
    showLatestArrivals: true,
    showHowItWorks: true,
    showTestimonials: true,
    footerText: "© 2026 1stCars Luxury Marketplace. All rights reserved.",
    facebook: "https://facebook.com/1stcars",
    instagram: "https://instagram.com/1stcars",
    twitter: "https://twitter.com/1stcars",
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
    searchButtonText: "Search",
    valuationButtonText: "Get Instant Valuation",
    detailsButtonText: "Details & Booking",
    inspectionButtonText: "Book Instant Free Inspection",
    filterHeadingText: "Find Your Certified Dream Car",
    buyCarsHeadingText: "Explore Our Handpicked Certified Fleet",
    buyCarsSubheadingText: "Every vehicle on this list is fully vetted and owned directly by 1stCars. Enjoy straightforward pricing, single-owner status, certified non-accident frames, and instant deliveries.",
    sellCarBannerTitle: "Sell Your Car Instantly From Home",
    sellCarBannerDesc: "Book a 100% free home inspection, receive live bids from our verified dealer network, and complete the sale in 24 hours with free RC transfer.",
    sellCarFormHeading: "Get Your Car Valued",
    sellCarFormSubheading: "Fill in your car details and we'll get back to you with a competitive cash quote"
  });

  // UI States
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  // SMS Gateway testing hooks
  const [testMobile, setTestMobile] = React.useState("");
  const [testStatus, setTestStatus] = React.useState("");
  const [testLoading, setTestLoading] = React.useState(false);

  // Modal form states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"add" | "edit">("add");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<any>({});

  // Image Uploading mockup
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [multiUploadStatus, setMultiUploadStatus] = React.useState("");

  // Database Seeding state & trigger
  const [isSeeding, setIsSeeding] = React.useState(false);
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    toast.info("Database seeding in progress...");
    try {
      const res = await seedSupabaseDatabase();
      if (res.success) {
        toast.success(res.message || "Seeding completed successfully!");
        await loadCMSData();
        if (onReloadAllData) onReloadAllData();
      } else {
        toast.error("Seeding failed: " + res.error);
      }
    } catch (err: any) {
      toast.error("Seeding error: " + (err.message || String(err)));
    } finally {
      setIsSeeding(false);
    }
  };

  // Load all system state
  const loadCMSData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch tables from Supabase/Mock tables
      const { data: cData } = await supabase.from("cars").select();
      const { data: uData } = await supabase.from("profiles").select();
      const { data: iData } = await supabase.from("inspections").select();
      const { data: aData } = await supabase.from("auctions").select();
      const { data: nData } = await supabase.from("notifications").select();
      const { data: bData } = await supabase.from("brands").select();
      const { data: pData } = await supabase.from("pages").select();

      if (cData) setCars(cData);
      if (uData) setUsers(uData);
      if (iData) setInspections(iData);
      if (aData) setAuctions(aData);
      if (nData) setNotifications(nData);
      if (bData) setBrands(bData);
      if (pData) setPages(pData);

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

      setInspectors(getStored("inspectors", [
        { id: "insp-u1", name: "Vikram Rathore", email: "inspector@1stcars.com", certified_level: "Master", region: "Mumbai", total_inspections: 148 },
        { id: "insp-u2", name: "Ramesh Kumar", email: "ramesh@1stcars.com", certified_level: "Senior", region: "Delhi NCR", total_inspections: 89 }
      ]));

      setSalesAssociates(getStored("sales_associates", [
        { id: "sa-1", name: "Sneha Patel", email: "sales@1stcars.com", active_leads: 8, closed_deals: 42, performance_score: 9.6 },
        { id: "sa-2", name: "Anil Kapoor", email: "anil@1stcars.com", active_leads: 4, closed_deals: 27, performance_score: 9.1 }
      ]));

      setParkSell(getStored("park_sell", [
        { id: "ps-1", slot: "Slot A-10", vehicle: "BMW M4 Competition", price_per_day: 4500, status: "occupied", seller_name: "John Doe", duration_days: 15 },
        { id: "ps-2", slot: "Slot B-02", vehicle: "Porsche 911 Carrera S", price_per_day: 6000, status: "occupied", seller_name: "Amit Verma", duration_days: 30 },
        { id: "ps-3", slot: "Slot C-05", vehicle: "Mercedes-Benz G-Class", price_per_day: 7500, status: "available", seller_name: "", duration_days: 0 }
      ]));

      setModels(getStored("models", [
        { id: "m-1", brand: "Porsche", name: "911 Carrera S", category: "Coupe", engine: "3.0L Twin-Turbo", power: "450 HP" },
        { id: "m-2", brand: "BMW", name: "M4 Competition", category: "Coupe", engine: "3.0L Straight-6", power: "503 HP" },
        { id: "m-3", brand: "Mercedes-Benz", name: "G-Class AMG G 63", category: "SUV", engine: "4.0L BiTurbo V8", power: "577 HP" },
        { id: "m-4", brand: "Audi", name: "e-tron GT", category: "Sedan", engine: "Dual Electric Motor", power: "637 HP" }
      ]));

      setCities(getStored("cities", [
        { id: "c-1", name: "Mumbai", state: "Maharashtra", branch_manager: "Aakash Ambani", support_number: "022-44445555" },
        { id: "c-2", name: "Delhi NCR", state: "Delhi", branch_manager: "Rajesh Khanna", support_number: "011-22223333" },
        { id: "c-3", name: "Bangalore", state: "Karnataka", branch_manager: "Sudha Murty", support_number: "080-66667777" }
      ]));

      setFaqs(getStored("faqs", [
        { id: "fq-1", category: "Certification", question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 150-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
        { id: "fq-2", category: "Trust", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification guarantees three core pillars for every luxury vehicle: 1) Single Owned: Every car is verified to have had only one previous owner; 2) Non-Accident Trusted: Strictly checked to have zero chassis frame damage or past accident repairs; 3) Genuine KM: Verified using advanced OBD diagnostics and complete historical service log sweeps so you can trust the mileage is 100% authentic." }
      ]));

      setTestimonials(getStored("testimonials", [
        { id: "t-1", name: "Harish Kotian", role: "Dealer Partner", rating: 5, content: "The B2B live dealer bidding is completely transparent and incredibly fast. Picked up 3 pristine Porsche models already.", photo: "👤" },
        { id: "t-2", name: "Priyanjali Sen", role: "Private Buyer", rating: 5, content: " व्हाइट-ग्लव डिलीवरी are world class! The home inspection and evaluation made selling my Range Rover completely painless.", photo: "👤" }
      ]));

      setFinancePartners(getStored("finance", [
        { id: "fp-1", name: "HDFC Bank Premium Finance", rate: "7.9%", tenure_months: "84 Months", max_funding: "90%", approval_hours: "2 Hours" },
        { id: "fp-2", name: "ICICI Bank Luxury Auto Loan", rate: "8.2%", tenure_months: "60 Months", max_funding: "100%", approval_hours: "4 Hours" }
      ]));

      setWarrantyPlans(getStored("warranty", [
        { id: "w-1", name: "1stShield Platinum Cover", price: 75000, duration_months: 24, covered_parts: "Engine, Gearbox, Air Suspension, All Electronics", claim_limit: 1500000 },
        { id: "w-2", name: "1stShield Gold Cover", price: 45000, duration_months: 12, covered_parts: "Engine, Drivetrain, Powertrain, AC Compressor", claim_limit: 800000 }
      ]));

      setExpenses(getStored("expenses", [
        { id: "ex-1", title: "Showroom Detailing and Ceramic Coating", category: "Preparation", amount: 48000, date: "2026-07-15", logged_by: "u-admin" },
        { id: "ex-2", title: "Flatbed Towing from Pune to Mumbai", category: "Logistics", amount: 15000, date: "2026-07-16", logged_by: "u-admin" },
        { id: "ex-3", title: "Doorstep Evaluator Compensation", category: "Salaries", amount: 24000, date: "2026-07-17", logged_by: "u-admin" }
      ]));

      const storedSettings = localStorage.getItem("1stcars_cms_website_settings");
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          setWebsiteSettings((prev: any) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse stored settings:", e);
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
    
    // Set realistic default template keys based on current module
    const defaultTemplates: Record<CMSModule, any> = {
      dashboard: {},
      cars: { brand: "BMW", model: "X5 xDrive40i", variant: "M Sport", year: 2022, price: 9500000, km_driven: 15000, fuel: "Petrol", transmission: "Automatic", owner_count: 1, city: "Mumbai", reg_number: "MH02-FP-5005", color: "Carbon Black", insurance_type: "Comprehensive", overall_score: 9.2, status: "available", image_url: "🚙", images: [] },
      users: { name: "", email: "", mobile: "", role: "Buyer", city: "Mumbai" },
      staff: { name: "", email: "", role: "Inspector", region: "Mumbai", shift: "Morning", status: "Active" },
      dealers: { name: "", manager: "", rating: 5.0, city: "Mumbai", credits: 500000, active_bids: 0 },
      inspectors: { name: "", email: "", certified_level: "Senior", region: "Mumbai", total_inspections: 0 },
      sales: { name: "", email: "", active_leads: 0, closed_deals: 0, performance_score: 10.0 },
      inspections: { seller_name: "", seller_mobile: "", reg_number: "", brand: "", model: "", variant: "", fuel: "Petrol", transmission: "Automatic", year: 2021, km_driven: 20000, city: "Mumbai", address: "", preferred_date: "2026-07-25", preferred_time: "10:00 AM - 12:00 PM", status: "pending", notes: "" },
      auctions: { car_title: "", base_price: 1500000, current_bid: 1500000, time_remaining: "24 Hours", total_bids: 0, status: "active" },
      park_sell: { slot: "Slot D-01", vehicle: "", price_per_day: 3500, status: "available", seller_name: "", duration_days: 0 },
      brands: { brand_name: "Porsche", model_name: "911 GT3 RS", category: "Coupe", engine: "4.0L Flat-6", power: "518 HP", logo_url: "⭐", is_popular: true, audience: "Buyer & Seller", status: "Active" },
      cities: { name: "", state: "", branch_manager: "", support_number: "" },
      faqs: { category: "General", question: "", answer: "" },
      testimonials: { name: "", role: "Private Buyer", rating: 5, content: "", photo: "👤" },
      finance: { name: "", rate: "8.5%", tenure_months: "60 Months", max_funding: "90%", approval_hours: "2 Hours" },
      warranty: { name: "", price: 25000, duration_months: 12, covered_parts: "Engine & Gearbox", claim_limit: 500000 },
      notifications: { recipient_id: "all", title: "", message: "", type: "info" },
      expenses: { title: "", category: "Operations", amount: 5000, date: new Date().toISOString().split("T")[0], logged_by: "u-admin" },
      reports: {},
      pages: { title: "", slug: "", content: "# Page Title\n\nPage text goes here.", is_footer: false },
      footer_links: { title: "", slug: "", content: "# Footer Page Title\n\nFooter page text goes here.", is_footer: true },
      settings: {},
      text_editor: {}
    };

    setFormData(defaultTemplates[activeModule] || {});
    setIsFormOpen(true);
  };

  // Handler to open Edit Modal
  const openEditModal = (item: any) => {
    setFormMode("edit");
    setEditingId(item.id);
    
    let initialData = { ...item };
    if (activeModule === "cars") {
      if (!Array.isArray(initialData.images)) {
        initialData.images = initialData.image_url && initialData.image_url !== "🚙" 
          ? [initialData.image_url] 
          : [];
      }
    }
    
    setFormData(initialData);
    setIsFormOpen(true);
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
              
              if (activeModule === "settings") {
                setWebsiteSettings((prev: any) => {
                  const updated = {
                    ...prev,
                    logoUrl: realUrl
                  };
                  localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(updated));
                  window.dispatchEvent(new Event("1stcars_settings_updated"));
                  return updated;
                });
                toast.success(`Pristine Image "${file.name}" uploaded successfully to Supabase Storage bucket: public-settings`);
              } else {
                setFormData((prevForm: any) => ({
                  ...prevForm,
                  image_url: realUrl,
                  logo_url: realUrl,
                  logo: realUrl,
                  photo: realUrl
                }));
                toast.success(`Pristine Image "${file.name}" uploaded successfully to Supabase Storage bucket: public-${activeModule}`);
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
      if (activeModule === "cars") {
        simulateMultipleImageUpload(e.dataTransfer.files);
      } else {
        simulateImageUpload(e.dataTransfer.files[0]);
      }
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (activeModule === "cars") {
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
      const generatedId = editingId || `id-${activeModule}-${Math.random().toString(36).substr(2, 9)}`;
      const currentRecord = { ...formData, id: generatedId, created_at: formData.created_at || new Date().toISOString() };

      if (activeModule === "cars") {
        if (formMode === "add") {
          await supabase.from("cars").insert([currentRecord]);
        } else {
          await supabase.from("cars").update(currentRecord).eq("id", editingId);
        }
      } else if (activeModule === "users") {
        if (formMode === "add") {
          await supabase.from("profiles").insert([currentRecord]);
        } else {
          await supabase.from("profiles").update(currentRecord).eq("id", editingId);
        }
      } else if (activeModule === "inspections") {
        if (formMode === "add") {
          await supabase.from("inspections").insert([currentRecord]);
        } else {
          await supabase.from("inspections").update(currentRecord).eq("id", editingId);
        }
      } else if (activeModule === "auctions") {
        if (formMode === "add") {
          await supabase.from("auctions").insert([currentRecord]);
        } else {
          await supabase.from("auctions").update(currentRecord).eq("id", editingId);
        }
      } else if (activeModule === "brands") {
        // 1. Save or update the Brand record in Supabase
        const logoUrlToSave = currentRecord.logo_url || currentRecord.logo || currentRecord.image_url || currentRecord.photo || "⭐";
        const brandRecord = {
          name: currentRecord.brand_name || currentRecord.name || "Unknown Brand",
          logo_url: logoUrlToSave,
          is_popular: currentRecord.is_popular === true || currentRecord.is_popular === "true"
        };

        let brandId = currentRecord.brand_id || (currentRecord.type === "brand" ? currentRecord.id : "");

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
          const { data: insertedBrand, error: insErr } = await supabase
            .from("brands")
            .insert([{ ...brandRecord, id: brandId || `b-${Math.random().toString(36).substr(2, 9)}` }])
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
        }
      } else if (activeModule === "notifications") {
        if (formMode === "add") {
          await supabase.from("notifications").insert([currentRecord]);
        } else {
          await supabase.from("notifications").update(currentRecord).eq("id", editingId);
        }
      } else if (activeModule === "pages" || activeModule === "footer_links") {
        const recordToSave = {
          ...currentRecord,
          is_footer: activeModule === "footer_links" ? true : (currentRecord.is_footer || false)
        };
        if (formMode === "add") {
          await supabase.from("pages").insert([recordToSave]);
        } else {
          await supabase.from("pages").update(recordToSave).eq("id", editingId);
        }
      } else {
        // Handle mock schema arrays
        const tableStateMap: Record<string, [any[], (d: any[]) => void]> = {
          staff: [getStoredMockList("staff"), (d) => persistMockTable("staff", d)],
          dealers: [dealers, (d) => persistMockTable("dealers", d)],
          inspectors: [inspectors, (d) => persistMockTable("inspectors", d)],
          sales: [salesAssociates, (d) => persistMockTable("sales_associates", d)],
          park_sell: [parkSell, (d) => persistMockTable("park_sell", d)],
          models: [models, (d) => persistMockTable("models", d)],
          cities: [cities, (d) => persistMockTable("cities", d)],
          faqs: [faqs, (d) => persistMockTable("faqs", d)],
          testimonials: [testimonials, (d) => persistMockTable("testimonials", d)],
          finance: [financePartners, (d) => persistMockTable("finance", d)],
          warranty: [warrantyPlans, (d) => persistMockTable("warranty", d)],
          expenses: [expenses, (d) => persistMockTable("expenses", d)]
        };

        const mapData = tableStateMap[activeModule];
        if (mapData) {
          const [currentList, updateFn] = mapData;
          if (formMode === "add") {
            updateFn([...currentList, currentRecord]);
          } else {
            updateFn(currentList.map(item => item.id === editingId ? currentRecord : item));
          }
        }
      }

      toast.success(`${activeModule.toUpperCase()} item saved successfully.`);
      setIsFormOpen(false);
      window.dispatchEvent(new Event("1stcars_settings_updated"));
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      console.error("Error submitting CMS form:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Action
  const handleDeleteItem = async (id: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete this ${activeModule} record?`)) return;
    setIsLoading(true);

    try {
      if (activeModule === "cars") {
        await supabase.from("cars").delete().eq("id", id);
      } else if (activeModule === "users") {
        await supabase.from("profiles").delete().eq("id", id);
      } else if (activeModule === "inspections") {
        await supabase.from("inspections").delete().eq("id", id);
      } else if (activeModule === "auctions") {
        await supabase.from("auctions").delete().eq("id", id);
      } else if (activeModule === "brands") {
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
      } else if (activeModule === "notifications") {
        await supabase.from("notifications").delete().eq("id", id);
      } else if (activeModule === "pages" || activeModule === "footer_links") {
        await supabase.from("pages").delete().eq("id", id);
      } else {
        const tableStateMap: Record<string, [any[], (d: any[]) => void]> = {
          staff: [getStoredMockList("staff"), (d) => persistMockTable("staff", d)],
          dealers: [dealers, (d) => persistMockTable("dealers", d)],
          inspectors: [inspectors, (d) => persistMockTable("inspectors", d)],
          sales: [salesAssociates, (d) => persistMockTable("sales_associates", d)],
          park_sell: [parkSell, (d) => persistMockTable("park_sell", d)],
          models: [models, (d) => persistMockTable("models", d)],
          cities: [cities, (d) => persistMockTable("cities", d)],
          faqs: [faqs, (d) => persistMockTable("faqs", d)],
          testimonials: [testimonials, (d) => persistMockTable("testimonials", d)],
          finance: [financePartners, (d) => persistMockTable("finance", d)],
          warranty: [warrantyPlans, (d) => persistMockTable("warranty", d)],
          expenses: [expenses, (d) => persistMockTable("expenses", d)]
        };

        const mapData = tableStateMap[activeModule];
        if (mapData) {
          const [currentList, updateFn] = mapData;
          updateFn(currentList.filter(item => item.id !== id));
        }
      }

      toast.success("Record removed successfully.");
      window.dispatchEvent(new Event("1stcars_settings_updated"));
      loadCMSData();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      console.error("Error deleting from CMS:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to fetch localStorage lists
  function getStoredMockList(key: string): any[] {
    const raw = localStorage.getItem(`1stcars_cms_${key}`);
    return raw ? JSON.parse(raw) : [];
  }

  // Dynamic CSV/XLS Download & Upload Bulk Listing Handlers
  const handleExportXLS = (type: "cars" | "brands") => {
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
    } else {
      headers = ["brand_name", "model_name", "category", "engine", "power", "logo_url", "is_popular", "audience", "status"];
      rows = getCombinedBrandsModels();
      filename = "1stcars-brands-models-catalog.xls";
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
    toast.success(`Catalog spreadsheet exported successfully to ${filename}`);
  };

  const handleImportXLS = (type: "cars" | "brands", event: React.ChangeEvent<HTMLInputElement>) => {
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
    
    // Apply visual color changes to root if possible for client demonstration
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary-theme-color", websiteSettings.primaryColor);
      document.documentElement.style.setProperty("--button-theme-color", websiteSettings.buttonColor);
      
      // Notify other decoupled components like the Navbar
      window.dispatchEvent(new Event("1stcars_settings_updated"));
    }

    toast.success("Prismatically updated Website Theme, branding parameters, SEO tags, and analytics successfully.");
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
        // Simulated
        toast.success(`🔑 Simulated: Code is ${code}. SMS simulation triggered!`);
        setTestStatus(`Simulated Success! Verification code is ${code}.`);
        
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

  // Generic data mapping per active CMS view
  const getActiveModuleData = (): any[] => {
    switch (activeModule) {
      case "cars": return cars;
      case "users": return users;
      case "inspections": return inspections;
      case "auctions": return auctions;
      case "brands": return getCombinedBrandsModels();
      case "notifications": return notifications;
      case "staff": return getStoredMockList("staff");
      case "dealers": return dealers;
      case "inspectors": return inspectors;
      case "sales": return salesAssociates;
      case "park_sell": return parkSell;
      case "cities": return cities;
      case "faqs": return faqs;
      case "testimonials": return testimonials;
      case "finance": return financePartners;
      case "warranty": return warrantyPlans;
      case "expenses": return expenses;
      case "pages": return pages.filter(p => !p.is_footer);
      case "footer_links": return pages.filter(p => p.is_footer);
      default: return [];
    }
  };

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

  // Stats calculation for the master KPI row
  const activeAuctionsCount = auctions.filter(a => a.status === "active").length;
  const pendingInspsCount = inspections.filter(i => i.status === "pending").length;
  const totalCRMLeads = 12; // CRM leads stat
  const totalExpensesLogged = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6 pt-4 text-left">
      
      {/* 21 MODULE DENSE QUICK BAR */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
          <div>
            <h2 className="font-sans text-lg font-black tracking-widest text-[#2E7D32] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2E7D32]" /> 1STCARS MASTER ADMIN CMS
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Control center for 21 modules, styling theme & SEO values dynamically</p>
          </div>
          <Button 
            onClick={loadCMSData} 
            size="sm"
            className="h-8 text-[10px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} /> Reload Engine
          </Button>
        </div>

        {/* 20 Tab Grid Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "cars", label: "Cars", icon: Car },
            { id: "users", label: "Users", icon: Users },
            { id: "staff", label: "Staff", icon: UserCheck },
            { id: "dealers", label: "Dealers", icon: DollarSign },
            { id: "inspectors", label: "Inspectors", icon: Award },
            { id: "sales", label: "Sales Assc", icon: ClipboardList },
            { id: "inspections", label: "Inspections", icon: ClipboardList },
            { id: "auctions", label: "Auctions", icon: Hammer },
            { id: "park_sell", label: "Park & Sell", icon: Layers },
            { id: "brands", label: "Brands & Models", icon: Play },
            { id: "cities", label: "Cities", icon: MapPin },
            { id: "faqs", label: "FAQs", icon: HelpCircle },
            { id: "testimonials", label: "Reviews", icon: Star },
            { id: "finance", label: "Finance", icon: DollarSign },
            { id: "warranty", label: "Warranty", icon: Shield },
            { id: "notifications", label: "Alerts Core", icon: Bell },
            { id: "expenses", label: "Ledger", icon: FileText },
            { id: "reports", label: "Reports", icon: TrendingUp },
            { id: "pages", label: "Custom Pages", icon: BookOpen },
            { id: "footer_links", label: "Footer Links", icon: Link },
            { id: "settings", label: "Theme Design", icon: Palette },
            { id: "text_editor", label: "Text Editor", icon: Edit3 }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveModule(item.id as CMSModule);
                setCurrentPage(1);
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className={`p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center text-center gap-1.5 transition-all border cursor-pointer ${
                activeModule === item.id 
                  ? "bg-[#2E7D32] border-[#2E7D32] text-white shadow-lg" 
                  : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RENDER ACTIVE MODULE AREA */}

      {/* 1. DASHBOARD OVERVIEW */}
      {activeModule === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Auctions", val: activeAuctionsCount, desc: "Dealer bidding open", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
              { label: "Pending evaluations", val: pendingInspsCount, desc: "Awaiting inspection", color: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: "Logged Expenses", val: `₹${totalExpensesLogged.toLocaleString()}`, desc: "Ledger operating debit", color: "bg-rose-50 border-rose-200 text-rose-700" },
              { label: "Customer Leads", val: totalCRMLeads, desc: "CRM Open Desk queries", color: "bg-emerald-50 border-emerald-200 text-emerald-700" }
            ].map((card, i) => (
              <div key={i} className={`p-5 rounded-2xl border text-xs font-semibold flex flex-col justify-between shadow-xs ${card.color}`}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                  <p className="text-2xl font-black mt-2 leading-none">{card.val}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Revenue Ledger Chart Mock */}
            <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-50 pb-2">Operational Revenue vs Expense (FY 2026)</h3>
              
              <div className="space-y-4 pt-2">
                {[
                  { month: "Jan 2026", rev: 14500000, exp: 3200000 },
                  { month: "Mar 2026", rev: 18900000, exp: 4500000 },
                  { month: "May 2026", rev: 24500000, exp: 5800000 },
                  { month: "Jul 2026 (Curr)", rev: 28500000, exp: totalExpensesLogged }
                ].map((bar, idx) => {
                  const maxVal = 30000000;
                  const revPct = (bar.rev / maxVal) * 100;
                  const expPct = (bar.exp / maxVal) * 100;
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-700">{bar.month}</span>
                        <span className="text-slate-400 font-medium">Rev: <strong className="text-emerald-600">₹{bar.rev.toLocaleString()}</strong> • Exp: <strong className="text-rose-600">₹{bar.exp.toLocaleString()}</strong></span>
                      </div>
                      <div className="h-6 w-full bg-slate-50 rounded-lg overflow-hidden flex flex-col gap-0.5 justify-center px-1">
                        <div style={{ width: `${revPct}%` }} className="h-2 bg-emerald-600 rounded-full transition-all duration-500" />
                        <div style={{ width: `${expPct}%` }} className="h-1.5 bg-rose-500 rounded-full transition-all duration-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live activity feed */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-50 pb-2">Real-time CMS Audit Log</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {[
                    { log: "Admin updated homepage hero typography to Inter", t: "5 mins ago", r: "Settings" },
                    { log: "Completed report approved for Audi A6 by Vikram", t: "1 hour ago", r: "Inspections" },
                    { log: "New dealer bid ₹1,48,50,000 placed on BMW M4", t: "2 hours ago", r: "Auctions" },
                    { log: "Direct Cash Quote requested by Amit Verma", t: "1 day ago", r: "CRM Leads" }
                  ].map((act, i) => (
                    <div key={i} className="text-[11px] font-semibold text-slate-600 border-b border-slate-50 pb-2 flex gap-2 items-start">
                      <Activity className="h-3.5 w-3.5 text-[#2E7D32] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-800 leading-tight">{act.log}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{act.r} • {act.t}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <Button
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <Sparkles className={`h-4 w-4 ${isSeeding ? "animate-spin" : ""}`} />
                  {isSeeding ? "Seeding Database..." : "Seed Supabase / Mock Data"}
                </Button>
                <p className="text-[9px] text-center text-slate-400 font-semibold uppercase tracking-wider">
                  Inserts 20 demo cars, 10 brands, 50 models, & 10 cities
                </p>
              </div>

              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-slate-100 mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Encrypted secure session with Supabase live engine</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REUSABLE CRUD FOR LIST MODULES (excluding Settings, Dashboard, Reports, Text Editor) */}
      {activeModule !== "dashboard" && activeModule !== "reports" && activeModule !== "settings" && activeModule !== "text_editor" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Manage {activeModule}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Database search, structural filters, pagination & image upload tools</p>
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
                <option value="Admin">Role: Admin</option>
              </select>
            </div>
          </div>

          {/* Bulk Spreadsheet Stock/Brand Actions */}
          {(activeModule === "cars" || activeModule === "brands") && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" /> Bulk spreadsheet {activeModule} catalog manager
                </h4>
                <p className="text-[10px] text-emerald-800/80 font-bold uppercase tracking-widest mt-1">
                  Download the current active catalog as Excel .xls or upload bulk new listings directly with .xls / .csv
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  onClick={() => handleExportXLS(activeModule)}
                  variant="secondary"
                  className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-900 text-[10px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" /> Download XLS
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    id="bulk-xls-uploader"
                    accept=".xls,.xlsx,.csv"
                    onChange={(e) => handleImportXLS(activeModule, e)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <ArrowUpFromLine className="h-3.5 w-3.5" /> Upload Bulk XLS
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                      {activeModule === "cars" && (
                        <div>
                          <p className="font-black text-slate-800">{item.model} ({item.year})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Reg: {item.reg_number} • Owner: {item.owner_count}</p>
                        </div>
                      )}
                      {activeModule === "users" && (
                        <div>
                          <p className="font-black text-slate-800">{item.email}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mobile: {item.mobile || "N/A"}</p>
                        </div>
                      )}
                      {activeModule === "inspections" && (
                        <div>
                          <p className="font-black text-slate-800">{item.brand} {item.model} ({item.year})</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Seller: {item.seller_name} ({item.seller_mobile})</p>
                        </div>
                      )}
                      {activeModule === "auctions" && (
                        <div>
                          <p className="font-black text-slate-800">{item.car_title}</p>
                          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider mt-0.5">High Bidder: {item.highest_bidder_name || "No bids placed yet"}</p>
                        </div>
                      )}
                      {activeModule === "dealers" && (
                        <div>
                          <p className="font-black text-slate-800">Mgr: {item.manager}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">City: {item.city} • Rating: {item.rating} / 5</p>
                        </div>
                      )}
                      {activeModule === "testimonials" && (
                        <div>
                          <p className="text-[11px] text-slate-500 italic">"{item.content}"</p>
                        </div>
                      )}
                      {activeModule === "faqs" && (
                        <div>
                          <p className="font-bold text-slate-800">{item.question}</p>
                          <p className="text-[11px] text-slate-500 italic mt-1">{item.answer}</p>
                        </div>
                      )}
                      {activeModule === "expenses" && (
                        <div>
                          <p className="font-black text-slate-800">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Logged: {item.date} by {item.logged_by}</p>
                        </div>
                      )}
                      {(activeModule === "pages" || activeModule === "footer_links") && (
                        <div className="max-w-md">
                          <p className="font-black text-slate-800">{item.title}</p>
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Slug: /{item.slug}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs mt-1">{item.content}</p>
                        </div>
                      )}
                      {activeModule === "brands" && (
                        <div>
                          <p className="font-black text-slate-800">{item.brand_name}</p>
                          <p className="text-[10px] text-[#2E7D32] font-black uppercase tracking-wider mt-0.5">Model: {item.model_name}</p>
                        </div>
                      )}
                      {/* Generic fallback metadata values */}
                      {!["cars", "users", "inspections", "auctions", "dealers", "testimonials", "faqs", "expenses", "pages", "footer_links", "brands"].includes(activeModule) && (
                        <div>
                          <p className="font-black text-slate-800">{item.email || item.name || item.manager || item.state || item.category || ""}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.notes || item.address || item.support_number || item.question || ""}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {activeModule === "cars" && (
                        <div>
                          <p className="font-black text-slate-900">₹{(item.price).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.km_driven} km • {item.fuel}</p>
                        </div>
                      )}
                      {activeModule === "dealers" && (
                        <div>
                          <p className="font-black text-slate-900">₹{(item.credits).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.active_bids} bids active</p>
                        </div>
                      )}
                      {activeModule === "expenses" && (
                        <div>
                          <p className="font-black text-rose-600">₹{(item.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.category}</p>
                        </div>
                      )}
                      {activeModule === "auctions" && (
                        <div>
                          <p className="font-black text-indigo-600">₹{(item.current_bid || item.base_price).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Time: {item.time_remaining || "Ended"}</p>
                        </div>
                      )}
                      {activeModule === "warranty" && (
                        <div>
                          <p className="font-black text-[#2E7D32]">₹{(item.price).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Duration: {item.duration_months} mos</p>
                        </div>
                      )}
                      {(activeModule === "pages" || activeModule === "footer_links") && (
                        <div>
                          <p className="font-mono text-[10px] text-[#2E7D32] font-bold">Dynamic CMS</p>
                        </div>
                      )}
                      {activeModule === "brands" && (
                        <div>
                          <p className="font-black text-slate-900">{item.category}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Specs: {item.engine} ({item.power})</p>
                        </div>
                      )}
                      {/* Generic fallback attributes */}
                      {!["cars", "dealers", "expenses", "auctions", "warranty", "pages", "footer_links", "brands"].includes(activeModule) && (
                        <div>
                          <p className="font-mono text-[10px] text-slate-500">{item.variant || item.region || item.shift || item.category || item.rate || ""}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {activeModule === "brands" ? (
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
                      <div className="flex items-center justify-end gap-2">
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

      {/* 3. REPORTS & METRICS */}
      {activeModule === "reports" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Operational Summary & Audit Analytics</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">High-fidelity printable format summarizing database inventory value & partner conversions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-5 text-xs font-semibold text-slate-600 space-y-3">
              <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2">Fleet Capital Value</p>
              <div className="flex justify-between font-bold">
                <span>Total Catalog Listings:</span>
                <span className="text-slate-800">{cars.length} vehicles</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Direct Asset Value:</span>
                <span className="text-emerald-600 font-black">₹{(cars.reduce((sum, c) => sum + (Number(c.price) || 0), 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Average vehicle age:</span>
                <span className="text-slate-800">3.4 Years</span>
              </div>
            </div>

            <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-5 text-xs font-semibold text-slate-600 space-y-3">
              <p className="text-slate-900 font-black text-sm uppercase tracking-wider border-b border-slate-200 pb-2">Sales Funnel Conversion</p>
              <div className="flex justify-between font-bold">
                <span>Assigned Inspection Requests:</span>
                <span className="text-slate-800">{inspections.filter(i => i.status === "assigned" || i.status === "completed").length} pending</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Live Auction Bids:</span>
                <span className="text-indigo-600 font-black">{auctions.reduce((acc, current) => acc + (current.total_bids || 2), 0)} placed</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>CRM Open Leads Desk:</span>
                <span className="text-[#2E7D32]">88% response rating</span>
              </div>
            </div>
          </div>

          {/* Download Print layout mock button */}
          <Button
            onClick={() => {
              window.print();
            }}
            className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase h-11 rounded-xl flex items-center justify-center gap-2"
          >
            <FileText className="h-4.5 w-4.5" /> Print Live CMS Report & Financial Ledger
          </Button>
        </div>
      )}

      {/* 4. SETTINGS & WEBSITE DESIGNER PANEL */}
      {activeModule === "settings" && (
        <form onSubmit={handleSaveWebsiteSettings} className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-8 text-xs font-semibold">
          
          <div className="border-b border-slate-100 pb-4">
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
                      <option value="simulated">📱 Simulated Sandbox (Visual push-notifications - recommended for testing)</option>
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
              <div className="p-6 bg-slate-900 text-white rounded-[32px] space-y-4 border border-white/10 shadow-2xl">
                <h4 className="font-black text-slate-100 uppercase tracking-wider flex items-center gap-2 text-xs">
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
        <form onSubmit={handleSaveWebsiteSettings} className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-8 text-xs font-semibold">
          
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-[32px] max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto relative text-left">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full border border-slate-100 hover:bg-slate-50 cursor-pointer"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">{formMode === "add" ? "Create New" : "Edit Details"} - {activeModule.toUpperCase()}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Provide accurate schema metadata for persistent catalog storage</p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-semibold">
              
              {/* Dynamic form inputs based on active module fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {Object.keys(formData).map((key) => {
                  if (key === "id" || key === "created_at" || key === "image_url" || key === "logo_url" || key === "logo" || key === "photo" || key === "images") return null;
                  
                  const value = formData[key];
                  const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  const isMultiline = key === "content" || key === "answer" || key === "notes";
                  
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
                          value={formData[key] || "Active"}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
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

              {/* Dynamic Image Upload for Catalog record / vehicle / testimonial */}
              {(formData.image_url !== undefined || formData.logo_url !== undefined || formData.photo !== undefined || activeModule === "brands") && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {activeModule === "cars" ? (
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
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                                  <div className="flex justify-between items-start">
                                    <span className="bg-slate-900/80 text-white font-mono text-[8px] px-1 rounded-sm">
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
                                      className="p-1 bg-red-600 hover:bg-red-700 rounded text-white cursor-pointer"
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

    </div>
  );
}
