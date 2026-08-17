import * as React from "react";
import { 
  Heart, Calendar, CreditCard, Clock, ShieldCheck, 
  Trash2, ArrowRight, DollarSign, Hammer, 
Upload, Check, Pencil, Eye, X,
  RefreshCw, ClipboardList, Car, Bell, Gavel
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Badge } from "@/src/components/ui/Badge";
import { 
  Profile, Inspection, 
  Offer, SalesNotification
} from "@/src/lib/db";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService, useNotifications } from "@/src/lib/notifications";
import { AdminCMS } from "./AdminCMS";
import { DealerAuctions } from "./auctions/DealerAuctions";
import { SellerAuctions } from "./auctions/SellerAuctions";
import { toast } from "@/src/lib/toast";
import { useCatalogCars } from "@/src/lib/useCatalogCars";
import { Inspection120FormModal } from "./Inspection120FormModal";
import { Full120PointReport } from "@/src/data/inspection120Data";
import { CreateCarWizard } from "./CreateCarWizard";
import { saveCar, errorMessage } from "@/src/lib/carPersistence";
import { brandData as defaultBrandData, BRAND_LOGOS as defaultBrandLogos } from "./SellCarView";
import {
  SellCatalog, catalogFromLegacy, mergeCatalog, getStoredSellCatalog, DEFAULT_POPULAR_SELL_BRANDS
} from "@/src/lib/sellFormData";

interface RoleDashboardsProps {
  currentUser: Profile;
  onLogout: () => void;
  onNavigateToInventory: () => void;
  onReloadAllData?: () => void;
}

export function RoleDashboards({ currentUser, onLogout, onNavigateToInventory, onReloadAllData }: RoleDashboardsProps) {
  const [activeTab, setActiveTab] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  // Live catalog: static cars + cars published through the CMS (Supabase "cars" table)
  const { cars: catalogCars } = useCatalogCars();

  // Common Database States
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [leads, setLeads] = React.useState<SalesNotification[]>([]);

  // Raw cars table rows (includes pending/unpublished records so Sales
  // Associates can manage the listings they uploaded, even before admin review)
  const [carRows, setCarRows] = React.useState<any[]>([]);

  // Sales Associate car upload wizard + own-listing edit state
  const [isCarWizardOpen, setIsCarWizardOpen] = React.useState(false);
  const [editingOwnCar, setEditingOwnCar] = React.useState<any | null>(null);
  const [ownCarDraft, setOwnCarDraft] = React.useState<Record<string, string | number>>({});
  const [isSavingOwnCar, setIsSavingOwnCar] = React.useState(false);

  // Sell-form-style catalog (brands/models/variants) shared with the admin
  // editor so Sales Associates upload with the exact same choices.
  const sellCatalog = React.useMemo<SellCatalog>(() => {
    const stored = getStoredSellCatalog();
    return mergeCatalog(
      catalogFromLegacy(defaultBrandData, defaultBrandLogos, DEFAULT_POPULAR_SELL_BRANDS),
      stored?.brands,
      stored?.removed
    );
  }, []);
  
  // Buyer-specific states
  const [savedCars, setSavedCars] = React.useState<string[]>([]);
  const [testDrives, setTestDrives] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);

  // Real-time alerts feed hook
  const { notifications: userNotifs, unreadCount, markRead, markAllRead } = useNotifications(currentUser?.id);

  // Selected sub-views / modal triggers
  const [selectedInspection, setSelectedInspection] = React.useState<Inspection | null>(null);
  const [selectedDealerReport, setSelectedDealerReport] = React.useState<any | null>(null);
  const [reportForm, setReportForm] = React.useState({
    overallScore: 8.5,
    engine: "Excellent condition, silent compression",
    brakes: "90% brake pads remaining",
    electronics: "Diagnostics clear, no error codes",
    exterior: "Minor scratch on front-left door, original factory paint",
    interior: "Premium dry-cleaned interiors, minor leather scuff",
    notes: "Superb luxury segment car, highly recommended for dealer bidding."
  });

  const reloadAllData = async () => {
    setIsLoading(true);
    try {
      const { data: profs } = await supabase.from("profiles").select();
      const { data: insps } = await supabase.from("inspections").select();
      const { data: offs } = await supabase.from("offers").select();
      const { data: lds } = await supabase.from("sales_notifications").select();
      const { data: crs } = await supabase.from("cars").select();

      if (profs) setProfiles(profs);
      if (insps) setInspections(insps);
      if (offs) setOffers(offs);
      if (lds) setLeads(lds);
      if (Array.isArray(crs)) setCarRows(crs);

      // Buyer collections
      const saved = localStorage.getItem("1stcars_saved_cars");
      setSavedCars(saved ? JSON.parse(saved) : []);

      const tds = localStorage.getItem("1stcars_test_drives");
      setTestDrives(tds ? JSON.parse(tds) : []);

      const ords = localStorage.getItem("1stcars_orders");
      setOrders(ords ? JSON.parse(ords) : []);

      // Refresh top level state as well
      if (onReloadAllData) {
        onReloadAllData();
      }

    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    reloadAllData();
    // Default sub-tab based on role
    switch (currentUser.role) {
      case "Buyer": setActiveTab("saved_cars"); break;
      case "Seller": setActiveTab("inspections"); break;
      case "Dealer": setActiveTab("auctions"); break;
      case "Inspector": setActiveTab("assigned"); break;
      case "Sales Associate": setActiveTab("test_drives"); break;
      case "Admin": setActiveTab("overview"); break;
    }
  }, [currentUser]);

  // Handle Buyer: Cancel Test Drive
  const handleCancelTestDrive = (id: string) => {
    const updated = testDrives.filter(td => td.id !== id);
    setTestDrives(updated);
    localStorage.setItem("1stcars_test_drives", JSON.stringify(updated));
  };

  // Handle Seller: Accept / Decline Dealer Offer
  const handleSellerOfferAction = async (offerId: string, action: "accepted" | "rejected") => {
    const targetOffer = offers.find(o => o.id === offerId);
    // Only the owner of the inspected car may act on its offers.
    const ownsInspection = targetOffer
      ? inspections.some(i => i.id === targetOffer.inspection_id && i.seller_id === currentUser.id)
      : false;
    if (!targetOffer || !ownsInspection) {
      toast.error("You can only accept or reject offers placed on your own cars.");
      return;
    }

    // 1. Update Offer
    await supabase.from("offers").update({ status: action }).eq("id", offerId);
    
    // 2. If accepted, update the associated inspection to 'sold'
    if (action === "accepted") {
      await supabase.from("inspections").update({ status: "sold" }).eq("id", targetOffer.inspection_id);
      
      // Also simulate putting this in buyer orders just in case
      const associatedInsp = inspections.find(i => i.id === targetOffer.inspection_id);
      if (associatedInsp) {
        const currentOrders = [...orders, {
          id: `ord-${Math.random().toString(36).substr(2, 5)}`,
          car_id: "custom",
          car_title: `${associatedInsp.year} ${associatedInsp.brand} ${associatedInsp.model}`,
          price: targetOffer.offer_amount,
          date: new Date().toISOString().split("T")[0],
          status: "Awaiting Logistics Dispatch"
        }];
        setOrders(currentOrders);
        localStorage.setItem("1stcars_orders", JSON.stringify(currentOrders));
      }
    }
    reloadAllData();
  };

  // NOTE: Dealer bid placement now lives entirely in <DealerAuctions />, which
  // routes through the canonical secure bid RPC (auctionService.placeBid →
  // place_auction_bid) with atomic locking, minimum-increment + dealer
  // eligibility validation and anti-sniping extensions. The old raw
  // `supabase.from("auctions").update(...)` bid path was removed to keep a
  // single canonical auction lifecycle.

  // Handle Inspector: Upload 120-Point Report Checklist
  const handleUploadReport = async (inspectionId: string, reportData: Full120PointReport) => {
    const targetInsp = inspections.find(i => i.id === inspectionId) || selectedInspection;

    // 1. Update the inspection item as completed with full 120-point report
    await supabase.from("inspections").update({
      status: "completed",
      overall_score: reportData.overallScorePercent ? Number((reportData.overallScorePercent / 10).toFixed(1)) : 9.5,
      report_engine: reportData.categories[0]?.summary || "",
      report_exterior: reportData.categories[1]?.summary || "",
      report_brakes: reportData.categories[2]?.summary || "",
      report_electronics: reportData.categories[3]?.summary || "",
      report_interior: reportData.categories[5]?.summary || "",
      report_120_json: JSON.stringify(reportData),
      report_150_json: JSON.stringify(reportData),
      notes: reportData.notes,
      is_certified: reportData.isCertified
    }).eq("id", inspectionId);

    // 2. Completing a certified inspection makes the vehicle READY FOR AUCTION.
    // It does NOT create the auction directly — auction creation is owned by the
    // canonical engine (auctionService.createAuction → auction_create_auction),
    // which Admin drives from Admin CMS → Auctions (create → publish → schedule
    // → start). This keeps a single canonical auction lifecycle and avoids a
    // second, competing "active" auction row. We simply notify Admin that a
    // certified vehicle is ready to be put up for auction.
    if (targetInsp) {
      await notificationService.triggerReportSubmitted({
        inspectionId: targetInsp.id,
        inspectorName: currentUser.name,
        brand: targetInsp.brand,
        model: targetInsp.model,
        score: reportData.overallScorePercent
      });
    }

    toast.success("120-Point Certified Inspection Report uploaded! Vehicle is now certified and ready for Admin to put up for auction.");
    setSelectedInspection(null);
    reloadAllData();
  };

  // Handle Sales Associate Actions
  const handleLeadStatus = async (id: string, newStatus: "contacted" | "resolved") => {
    await supabase.from("sales_notifications").update({ status: newStatus }).eq("id", id);
    reloadAllData();
  };

  // Sales Associate uploads a new car -> saved as "pending" so it stays hidden
  // from the public website until an admin approves it.
  const handleSalesUploadCar = async (record: any) => {
    const finalRecord = {
      ...record,
      status: "pending",
      created_by: currentUser.id,
      created_by_name: currentUser.name,
      created_at: new Date().toISOString()
    };
    const { error } = await saveCar(finalRecord);
    if (error) throw error;

    // Alert every admin profile so the review desk knows a listing is waiting.
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "Admin");
    const adminList = admins || [{ id: "u-admin" }];
    await Promise.all(adminList.map((admin: { id: string }) =>
      notificationService.createNotification({
        recipientId: admin.id,
        senderId: currentUser.id,
        title: "New Car Awaits Approval",
        message: `Sales Associate ${currentUser.name} uploaded ${record.brand} ${record.model} (${record.year}) at ₹${Number(record.price).toLocaleString("en-IN")}. Review it in Admin CMS > Cars to publish it live.`,
        type: "action",
        metadata: { car_title: `${record.brand} ${record.model}`, status: "pending" }
      })
    ));

    setIsCarWizardOpen(false);
    toast.success(`${record.brand} ${record.model} submitted to Admin for review. It will go live on the website after approval.`);
    setActiveTab("my_cars");
    reloadAllData();
    setTimeout(() => window.dispatchEvent(new Event("1stcars_settings_updated")), 0);
  };

  // Cars uploaded by THIS associate (never other associates' listings).
  const myCars = React.useMemo(() => {
    return carRows.filter((c) => {
      const owner = c.created_by || c.payload?.created_by;
      return owner && String(owner) === String(currentUser.id);
    });
  }, [carRows, currentUser.id]);

  const openEditOwnCar = (car: any) => {
    const data = { ...(car.payload || {}), ...car };
    setEditingOwnCar(car);
    setOwnCarDraft({
      variant: data.variant || "",
      color: data.color || "",
      price: data.price ?? "",
      km_driven: data.km_driven ?? data.mileage ?? "",
      fuel: data.fuel || "Petrol",
      transmission: data.transmission || "Automatic",
      bodyType: data.bodyType || "Sedan",
      city: data.city || "Surat",
      reg_number: data.reg_number || ""
    });
  };

  const handleSaveOwnCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOwnCar) return;
    const draft = { ...ownCarDraft };
    const price = Number(draft.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid selling price.");
      return;
    }
    const kmDriven = Number(draft.km_driven);
    if (isNaN(kmDriven) || kmDriven <= 0) {
      toast.error("Please enter a valid KM driven.");
      return;
    }

    setIsSavingOwnCar(true);
    try {
      const current = { ...(editingOwnCar.payload || {}), ...editingOwnCar };
      const mergedRecord = {
        ...current,
        ...draft,
        price,
        km_driven: kmDriven,
        mileage: kmDriven,
        emi: Math.round(price / 60),
        id: editingOwnCar.id,
        created_by: current.created_by || currentUser.id,
        created_by_name: current.created_by_name || currentUser.name
      };
      const { error } = await saveCar(mergedRecord, editingOwnCar.id);
      if (error) throw error;

      setEditingOwnCar(null);
      toast.success("Your car listing has been updated.");
      reloadAllData();
      setTimeout(() => window.dispatchEvent(new Event("1stcars_settings_updated")), 0);
    } catch (err) {
      toast.error("Failed to update car: " + errorMessage(err));
    } finally {
      setIsSavingOwnCar(false);
    }
  };

  // Offers placed on THIS seller's own inspected cars (never other sellers').
  const sellerOffers = React.useMemo(() => {
    if (currentUser.role !== "Seller") return [];
    const sellerInspIds = new Set(inspections.filter(i => i.seller_id === currentUser.id).map(i => i.id));
    return offers.filter(o => sellerInspIds.has(o.inspection_id));
  }, [currentUser, inspections, offers]);

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-24 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Dashboard Heading & Meta Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#2E7D32]/10 p-6 md:p-8 rounded-3xl shadow-xs">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
              Welcome back, <span className="text-[#2E7D32]">{currentUser.name}</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              🏢 Profile Role: <strong className="text-slate-800">{currentUser.role} Dashboard</strong> • Location: {currentUser.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={reloadAllData}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold uppercase tracking-wider text-xs h-11 px-4 rounded-xl bg-white flex items-center gap-2 flex-1 md:flex-initial"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={onLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-xs h-11 px-5 rounded-xl flex-1 md:flex-initial"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* LOADING STATE */}
        <div className="relative">
          <div className="space-y-8">
            {/* Live System Alerts Feed (Rule 1-6 Alerts Hub) */}
            {userNotifs.length > 0 && (
              <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Bell className="h-5 w-5 text-[#2E7D32] animate-bounce" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Live System Alerts Hub</h3>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllRead} 
                      className="text-[10px] font-bold text-[#2E7D32] hover:underline uppercase tracking-wider bg-transparent border-0 cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-72 overflow-y-auto pr-2">
                  {userNotifs.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`border rounded-2xl p-4 text-xs font-semibold flex flex-col justify-between gap-3 transition-all text-left ${
                        notif.is_read 
                          ? "bg-[#FAF9F6] border-slate-100 text-slate-500 opacity-85" 
                          : "bg-[#2E7D32]/5 border-[#2E7D32]/10 text-slate-800 shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-black tracking-tight text-slate-900 text-xs">{notif.title}</span>
                          {!notif.is_read && (
                            <span className="bg-rose-500 w-1.5 h-1.5 rounded-full shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">{notif.message}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-2">{new Date(notif.created_at).toLocaleTimeString()}</p>
                      </div>
                      {!notif.is_read && (
                        <button 
                          onClick={() => markRead(notif.id)} 
                          className="text-[10px] font-black text-left text-[#2E7D32] hover:underline uppercase tracking-wider bg-transparent border-0 cursor-pointer self-start"
                        >
                          Dismiss Alert
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT BAR: SUB-NAVIGATION */}
            {(currentUser.role as string) !== "Admin" && (
              <div className="lg:col-span-3 bg-white border border-[#2E7D32]/10 rounded-3xl p-5 shadow-xs space-y-4">
              <p className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest px-2.5">Dashboard Hub</p>
              
              <div className="flex flex-col gap-1">
                {/* BUYER LINKS */}
                {currentUser.role === "Buyer" && (
                  <>
                    {[
                      { id: "saved_cars", label: "Saved Cars Collection", icon: Heart },
                      { id: "test_drives", label: "My Test Drive Bookings", icon: Calendar },
                      { id: "orders", label: "Active Orders & Deposits", icon: CreditCard }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === tab.id 
                            ? "bg-[#2E7D32] text-white" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <tab.icon className="h-4.5 w-4.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* SELLER LINKS */}
                {currentUser.role === "Seller" && (
                  <>
                    {[
                      { id: "inspections", label: "Inspection Status", icon: ClipboardList },
                      { id: "auctions", label: "My Car Auctions", icon: Gavel },
                      { id: "offers", label: "Dealer Offers Bids", icon: DollarSign }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === tab.id 
                            ? "bg-[#2E7D32] text-white" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <tab.icon className="h-4.5 w-4.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* DEALER LINKS */}
                {currentUser.role === "Dealer" && (
                  <>
                    {[
                      { id: "auctions", label: "Live Auctions Arena", icon: Hammer },
                      { id: "dealer_inventory", label: "My Purchased Stock", icon: Car }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === tab.id 
                            ? "bg-[#2E7D32] text-white" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <tab.icon className="h-4.5 w-4.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* INSPECTOR LINKS */}
                {currentUser.role === "Inspector" && (
                  <>
                    {[
                      { id: "assigned", label: "Assigned Field Checklist", icon: ClipboardList }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === tab.id 
                            ? "bg-[#2E7D32] text-white" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <tab.icon className="h-4.5 w-4.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* SALES ASSOCIATE LINKS */}
                {currentUser.role === "Sales Associate" && (
                  <>
                    {[
                      { id: "test_drives", label: "Customer Requests Log", icon: Calendar },
                      { id: "leads", label: "CRM Active Leads Desk", icon: ClipboardList },
                      { id: "upload_car", label: "Upload New Car", icon: Upload },
                      { id: "my_cars", label: "My Car Listings", icon: Car }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === tab.id 
                            ? "bg-[#2E7D32] text-white" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <tab.icon className="h-4.5 w-4.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </>
                )}

              </div>

              {/* Browse inventory help callout */}
              <div className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-2 text-center">
                <p className="text-[9px] font-black text-[#2E7D32] uppercase tracking-widest">Public Catalog</p>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Want to browse standard certified cars?</p>
                <Button
                  onClick={onNavigateToInventory}
                  className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider h-8 rounded-lg"
                >
                  Browse Cars
                </Button>
              </div>

            </div>
          )}

            {/* RIGHT BAR: MAIN WORKSPACE CONTAINER */}
            <div className={`${currentUser.role === "Admin" ? "lg:col-span-12" : "lg:col-span-9"} space-y-6`}>
              
              {/* =======================================================
                  1. BUYER DASHBOARD TABS 
                  ======================================================= */}
              
              {/* Saved Cars Collection */}
              {currentUser.role === "Buyer" && activeTab === "saved_cars" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Saved Premium Cars</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Quick access to vehicles you saved for review.</p>
                  </div>

                  {savedCars.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catalogCars.filter(car => savedCars.includes(car.id)).map(car => (
                        <div key={car.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">{car.brand}</span>
                            <h4 className="font-black text-slate-900 text-sm leading-none">{car.model}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">{car.year} • {car.fuel} • {car.transmission}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-sm font-black text-slate-900">₹{(car.price * 80).toLocaleString()}</div>
                            <Button 
                              onClick={onNavigateToInventory}
                              size="sm"
                              className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase tracking-wider h-7 px-2.5 rounded-lg"
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <Heart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">Your collection is empty.</p>
                      <Button
                        variant="link"
                        onClick={onNavigateToInventory}
                        className="text-[#2E7D32] text-xs font-black uppercase tracking-wider mt-1"
                      >
                        Browse cars and click favorite
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Test Drives */}
              {currentUser.role === "Buyer" && activeTab === "test_drives" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">My Scheduled Test Drives</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Track your upcoming appointments with concierge associates.</p>
                  </div>

                  {testDrives.length > 0 ? (
                    <div className="space-y-3">
                      {testDrives.map((td: any) => (
                        <div key={td.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <span className="bg-emerald-50 text-[#2E7D32] border border-emerald-200 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black inline-block">
                              Status: {td.status || "Approved"}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm">{td.car_title || td.vehicle || `${td.car_brand || ''} ${td.car_model || 'Car'}`}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">Appointment: {td.date || td.preferred_date} @ {td.time || td.preferred_time}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelTestDrive(td.id)}
                            className="border-rose-100 hover:bg-rose-50 text-rose-600 font-bold text-[9px] uppercase tracking-wider h-8 rounded-lg"
                          >
                            Cancel Slot
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No upcoming test drives.</p>
                      <Button
                        variant="link"
                        onClick={onNavigateToInventory}
                        className="text-[#2E7D32] text-xs font-black uppercase tracking-wider mt-1"
                      >
                        Request virtual tour or test drive on details screen
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Orders */}
              {currentUser.role === "Buyer" && activeTab === "orders" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Active Deposits & Bookings</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Secure escrow purchases logged for your account.</p>
                  </div>

                  {orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.map((ord: any) => (
                        <div key={ord.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black inline-block">
                              {ord.status}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm">{ord.car_title}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">Logged Date: {ord.date} • Order ID: {ord.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount Paid</p>
                            <p className="text-base font-black text-slate-900">₹{ord.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <CreditCard className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No active transactions.</p>
                    </div>
                  )}
                </div>
              )}

              {/* =======================================================
                  2. SELLER DASHBOARD TABS
                  ======================================================= */}
              
              {/* My Car Auctions (live bidding + settle results) */}
              {currentUser.role === "Seller" && activeTab === "auctions" && (
                <SellerAuctions currentUser={currentUser} />
              )}

              {/* Inspection Status */}
              {currentUser.role === "Seller" && activeTab === "inspections" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">My Car Inspections</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time tracking of Spinny-style home inspections logged for your account.</p>
                  </div>

                  {inspections.filter(i => i.seller_id === currentUser.id || i.seller_mobile === currentUser.mobile).length > 0 ? (
                    <div className="space-y-4">
                      {inspections.filter(i => i.seller_id === currentUser.id || i.seller_mobile === currentUser.mobile).map(item => (
                        <div key={item.id} className="border border-slate-100 rounded-2xl p-5 bg-[#FAF9F6] space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 pb-3">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400">ID: {item.id}</span>
                              <h4 className="font-black text-slate-900 text-base">{item.year} {item.brand} {item.model}</h4>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{item.variant} • {item.reg_number}</p>
                            </div>
                            <Badge className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-none text-white ${
                              item.status === "pending" ? "bg-amber-600" :
                              item.status === "assigned" ? "bg-blue-600" :
                              item.status === "completed" ? "bg-emerald-600" :
                              item.status === "offered" ? "bg-sky-600" : "bg-purple-600"
                            }`}>
                              {item.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                            <div>📍 Inspection Location: <span className="text-slate-800">{item.address}</span></div>
                            <div>📅 Preferred Date/Slot: <span className="text-[#2E7D32]">{item.preferred_date} ({item.preferred_time})</span></div>
                          </div>

                          {item.overall_score && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Inspector Score: {item.overall_score}/10
                              </p>
                              <p className="text-[11px] text-slate-600 italic">" {item.notes} "</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No active inspection requests found.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Submit your vehicle parameters through the Sell Car link!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Offers (Sellers can accept/reject dealer cash bids) */}
              {currentUser.role === "Seller" && activeTab === "offers" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Active Dealer Offers</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Competitive live bids placed on your certified inspected cars.</p>
                  </div>

                  {/* Only show offers placed on the current seller's own inspected cars */}
                  {sellerOffers.length > 0 ? (
                    <div className="space-y-4">
                      {sellerOffers.map(off => {
                        const associatedInsp = inspections.find(i => i.id === off.inspection_id);
                        return (
                          <div key={off.id} className="border border-slate-100 rounded-2xl p-5 bg-[#FAF9F6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">Dealer: {off.dealer_name}</span>
                              <h4 className="font-black text-slate-900 text-sm">
                                For: {associatedInsp ? `${associatedInsp.year} ${associatedInsp.brand} ${associatedInsp.model}` : "Custom Vehicle"}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-bold">Bid Status: 
                                <span className={`ml-1 uppercase text-[9px] font-black px-2 py-0.5 rounded-full ${
                                  off.status === "pending" ? "bg-amber-100 text-amber-700" :
                                  off.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                  {off.status}
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                              <div className="text-left md:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Offer Amount</p>
                                <p className="text-lg font-black text-[#2E7D32]">₹{off.offer_amount.toLocaleString()}</p>
                              </div>

                              {off.status === "pending" && (
                                <div className="flex gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSellerOfferAction(off.id, "accepted")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSellerOfferAction(off.id, "rejected")}
                                    className="border-rose-100 hover:bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5 bg-white"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <DollarSign className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No bids currently placed on your cars.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Completed inspections enter dealer live bidding instantly.</p>
                    </div>
                  )}
                </div>
              )}

              {/* =======================================================
                  3. DEALER DASHBOARD TABS
                  ======================================================= */}
              
              {/* Live Auctions */}
              {currentUser.role === "Dealer" && activeTab === "auctions" && (
                <DealerAuctions currentUser={currentUser} />
              )}

              {/* Purchased Stock */}
              {currentUser.role === "Dealer" && activeTab === "dealer_inventory" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Purchased Showroom Stock</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Vehicles won in auctions and transferred legally.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Transfer Completed
                        </span>
                        <h4 className="font-black text-slate-900 text-sm">2018 Honda City V</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">Delhi NCR • Petrol • Manual</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Acquired Price</p>
                        <p className="text-sm font-black text-slate-800 mt-1">₹5,35,000</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =======================================================
                  4. INSPECTOR DASHBOARD TABS
                  ======================================================= */}
              
              {/* Assigned Inspections */}
              {currentUser.role === "Inspector" && activeTab === "assigned" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">My Doorstep Inspection Worklist</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Perform 200-point structural evaluations and upload report parameters.</p>
                  </div>

                  {inspections.filter(i => i.status === "assigned" && i.inspector_id === currentUser.id).length > 0 ? (
                    <div className="space-y-4">
                      {inspections.filter(i => i.status === "assigned" && i.inspector_id === currentUser.id).map(item => (
                        <div key={item.id} className="border border-slate-100 rounded-2xl p-5 bg-[#FAF9F6] space-y-4">
                          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200/50 pb-3">
                            <div>
                              <span className="text-[9px] font-mono text-slate-400">LEAD ID: {item.id}</span>
                              <h4 className="font-black text-slate-900 text-base">{item.year} {item.brand} {item.model}</h4>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{item.variant} • {item.reg_number}</p>
                            </div>
                            
                            <Button
                              onClick={() => setSelectedInspection(item)}
                              className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-3 flex items-center gap-1.5"
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload Report Card
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 font-semibold">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doorstep Address</p>
                              <p className="text-slate-800 font-bold">{item.address}, {item.city}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">Booking Time Slot</p>
                              <p className="text-[#2E7D32] font-bold">{item.preferred_date} • {item.preferred_time}</p>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-slate-100 rounded-xl text-[11px] text-slate-500 italic">
                            Seller Notes: " {item.notes} "
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">Your worklist is completely clear!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Admins assign newly submitted seller requests in real-time.</p>
                    </div>
                  )}

                  {/* 120-POINT REPORT UPLOAD MODAL */}
                  {!!selectedInspection && (
                    <Inspection120FormModal
                      inspection={selectedInspection}
                      isOpen={!!selectedInspection}
                      onClose={() => setSelectedInspection(null)}
                      onSubmitReport={handleUploadReport}
                      userRole="Inspector"
                    />
                  )}

                  {/* 120-POINT REPORT DEALER VIEW MODAL */}
                  {!!selectedDealerReport && (
                    <Inspection120FormModal
                      inspection={selectedDealerReport}
                      isOpen={!!selectedDealerReport}
                      onClose={() => setSelectedDealerReport(null)}
                      onSubmitReport={() => {
                        toast.success("Inspection report verified by Dealer.");
                        setSelectedDealerReport(null);
                      }}
                      userRole="Dealer"
                    />
                  )}

                </div>
              )}

              {/* =======================================================
                  5. SALES ASSOCIATE DASHBOARD TABS
                  ======================================================= */}
              
              {/* Test Drive Requests */}
              {currentUser.role === "Sales Associate" && activeTab === "test_drives" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Active Test Drive Requests</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Manage virtual tour requests and customer driving schedules.</p>
                  </div>

                  {/* Sales Associates only see leads assigned to them (their uploaded cars)
                    or unassigned leads from the shared pool — never leads assigned
                    to another associate. */}
                  {leads.filter(l => l.type === "test_drive" && (!l.assigned_to || l.assigned_to === currentUser.id)).length > 0 ? (
                    <div className="space-y-3">
                      {leads.filter(l => l.type === "test_drive" && (!l.assigned_to || l.assigned_to === currentUser.id)).map(lead => (
                        <div key={lead.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-[#2E7D32] text-white text-[9px] uppercase tracking-widest font-black px-2.5 py-0.5">
                                {lead.status}
                              </Badge>
                              <span className="text-[9px] font-mono text-slate-400">ID: {lead.id}</span>
                              {lead.assigned_to === currentUser.id && (
                                <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20">
                                  Auto-assigned to you
                                </span>
                              )}
                            </div>
                            <h4 className="font-black text-slate-900 text-base mt-1">{lead.name} • {lead.mobile}</h4>
                            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                              Target Vehicle: <strong className="text-[#2E7D32]">{lead.car_brand} {lead.car_model}</strong> • Prefer Slot: {lead.preferred_date} ({lead.preferred_time})
                            </p>
                          </div>

                          {lead.status === "pending" && (
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleLeadStatus(lead.id, "contacted")}
                                className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5"
                              >
                                Contacted
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleLeadStatus(lead.id, "resolved")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5"
                              >
                                Resolve
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No active requests logged.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Leads */}
              {currentUser.role === "Sales Associate" && activeTab === "leads" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">CRM Active Customer Leads</h3>
                    <p className="text-xs text-slate-400 mt-0.5">General buy queries, WhatsApp callbacks, and cash-quote bookings.</p>
                  </div>

                  {leads.filter(l => l.type !== "test_drive" && (!l.assigned_to || l.assigned_to === currentUser.id)).length > 0 ? (
                    <div className="space-y-3">
                      {leads.filter(l => l.type !== "test_drive" && (!l.assigned_to || l.assigned_to === currentUser.id)).map(lead => (
                        <div key={lead.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-600 text-white text-[9px] uppercase tracking-widest font-black px-2.5 py-0.5">
                                {lead.type.replace("_", " ")}
                              </Badge>
                              <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full ${
                                lead.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }`}>{lead.status}</span>
                            </div>
                            <h4 className="font-black text-slate-900 text-base mt-1">{lead.name} • {lead.mobile}</h4>
                            <p className="text-xs text-slate-600 font-bold">Location: {lead.city} • Target Car: {lead.car_brand} {lead.car_model}</p>
                          </div>

                          {lead.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleLeadStatus(lead.id, "resolved")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5 shrink-0"
                            >
                              Mark Solved
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No active general leads.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload New Car */}
              {currentUser.role === "Sales Associate" && activeTab === "upload_car" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-xl text-slate-900 tracking-tight">Upload a New Car</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Fill the listing wizard below. Your car is saved as <strong className="text-amber-600">Pending Review</strong> — an admin must approve it before it goes live on the website.
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsCarWizardOpen(true)}
                      className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider h-10 px-4 rounded-xl flex items-center gap-2 shrink-0"
                    >
                      <Upload className="h-4 w-4" /> Open Car Upload Wizard
                    </Button>
                  </div>

                  <div className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl text-center space-y-2">
                    <Car className="h-10 w-10 text-[#2E7D32] mx-auto" />
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Launch the 9-step wizard to list a vehicle</p>
                    <p className="text-[11px] text-slate-400 font-semibold max-w-md mx-auto leading-relaxed">
                      Brand, model, variant, year, fuel &amp; gear, RTO / city, KM &amp; price, 120-point inspection, and photos — then submit for admin review.
                    </p>
                  </div>
                </div>
              )}

              {/* My Car Listings */}
              {currentUser.role === "Sales Associate" && activeTab === "my_cars" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">My Car Listings</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cars uploaded by you ({myCars.length}). You can edit your own listings; vehicles published by other team members are managed by the Admin.
                    </p>
                  </div>

                  {myCars.length > 0 ? (
                    <div className="space-y-4">
                      {myCars.map(car => {
                        const data = { ...(car.payload || {}), ...car };
                        const isLive = !car.status || car.status === "available";
                        return (
                          <div key={car.id} className="border border-slate-100 rounded-2xl p-5 bg-[#FAF9F6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full ${
                                  isLive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : car.status === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-indigo-100 text-indigo-700"
                                }`}>
                                  {isLive ? "Live on Website" : String(car.status || "pending").replace("_", " ")}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">ID: {car.id}</span>
                              </div>
                              <h4 className="font-black text-slate-900 text-base">{data.brand} {data.model} ({data.year})</h4>
                              <p className="text-[11px] text-slate-500 font-bold">
                                {data.variant || "—"} • {data.fuel} • {data.transmission} • {Number(data.km_driven || data.mileage || 0).toLocaleString()} km • {data.city || "Surat"}
                              </p>
                              <p className="text-sm font-black text-[#2E7D32]">₹{Number(data.price || 0).toLocaleString("en-IN")}</p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                              {isLive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={onNavigateToInventory}
                                  className="border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5 flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View on Site
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => openEditOwnCar(car)}
                                className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5 flex items-center gap-1"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit Listing
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <Car className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">You haven't uploaded any cars yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Use the "Upload New Car" tab to create your first listing.</p>
                      <Button
                        onClick={() => setActiveTab("upload_car")}
                        className="mt-4 bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider h-9 px-4 rounded-xl"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload New Car
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* =======================================================
                  6. ADMIN DASHBOARD TABS
                  ======================================================= */}
              
              {currentUser.role === "Admin" && (
                <AdminCMS 
                  currentUser={currentUser}
                  onReloadAllData={reloadAllData} 
                  onNavigateToInventory={onNavigateToInventory} 
                />
              )}

            </div>
          </div>
        </div>

{isLoading && (
            <div className="absolute inset-0 z-40 bg-[#FAF9F6]/85 rounded-3xl flex items-start justify-center pt-24">
              <div className="bg-white border border-slate-100 rounded-3xl p-24 text-center shadow-sm">
                <RefreshCw className="h-10 w-10 text-[#2E7D32] animate-spin mx-auto mb-4" />
                <h3 className="font-black text-slate-800 tracking-tight text-lg">Querying Database...</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Row Level Security policy checks active</p>
              </div>
            </div>
          )}
        </div>

        {/* Sales Associate Car Upload Wizard */}
        <CreateCarWizard
          sellCatalog={sellCatalog}
          isOpen={isCarWizardOpen}
          onClose={() => setIsCarWizardOpen(false)}
          onSubmit={handleSalesUploadCar}
          submitStatus="pending"
        />

        {/* Edit My Listing Modal */}
        {!!editingOwnCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                    <Pencil className="h-4.5 w-4.5 text-[#2E7D32]" /> Edit My Listing
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">
                    {(editingOwnCar.brand || editingOwnCar.payload?.brand) + " " + (editingOwnCar.model || "")} • Only cars uploaded by you can be edited.
                  </p>
                </div>
                <button
                  onClick={() => setEditingOwnCar(null)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOwnCar} className="space-y-5 text-xs font-semibold">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selling Price (₹)</label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={String(ownCarDraft.price ?? "")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, price: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">KM Driven</label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={String(ownCarDraft.km_driven ?? "")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, km_driven: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Variant</label>
                    <Input
                      value={String(ownCarDraft.variant ?? "")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, variant: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Color</label>
                    <Input
                      value={String(ownCarDraft.color ?? "")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, color: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fuel</label>
                    <select
                      value={String(ownCarDraft.fuel ?? "Petrol")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, fuel: e.target.value }))}
                      className="w-full h-10 border border-slate-200 bg-white rounded-xl text-xs font-bold px-3 outline-none cursor-pointer focus:ring-1 focus:ring-[#2E7D32]"
                    >
                      {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transmission</label>
                    <select
                      value={String(ownCarDraft.transmission ?? "Automatic")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, transmission: e.target.value }))}
                      className="w-full h-10 border border-slate-200 bg-white rounded-xl text-xs font-bold px-3 outline-none cursor-pointer focus:ring-1 focus:ring-[#2E7D32]"
                    >
                      {["Automatic", "Manual", "DCT", "AWD"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Body Type</label>
                    <select
                      value={String(ownCarDraft.bodyType ?? "Sedan")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, bodyType: e.target.value }))}
                      className="w-full h-10 border border-slate-200 bg-white rounded-xl text-xs font-bold px-3 outline-none cursor-pointer focus:ring-1 focus:ring-[#2E7D32]"
                    >
                      {["Sedan", "SUV", "Hatchback", "Coupe", "Convertible", "EV"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">City / Location</label>
                    <Input
                      value={String(ownCarDraft.city ?? "")}
                      onChange={(e) => setOwnCarDraft((prev) => ({ ...prev, city: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-800 leading-relaxed">
                  ⏳ Listing status stays "{editingOwnCar.status === "available" ? "Live" : "Pending Review"}" after editing.
                  {editingOwnCar.status === "pending" && " A pending listing only goes live after the Admin approves it."}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOwnCar(null)}
                    className="border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-wider h-10 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingOwnCar}
                    className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider h-10 px-5 rounded-xl flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> {isSavingOwnCar ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
