import * as React from "react";
import { 
  Heart, Calendar, CreditCard, Clock, ShieldCheck, 
  Trash2, ArrowRight, DollarSign, Hammer, BarChart3, 
  Users, Settings, Upload, Check, X, AlertCircle, 
  UserCheck, RefreshCw, Star, ClipboardList, Car, Gauge, Bell
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Badge } from "@/src/components/ui/Badge";
import { CARS_DATA } from "@/src/data/cars";
import { 
  Profile, Inspection, 
  Offer, Auction, SalesNotification, UserRole 
} from "@/src/lib/db";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService, useNotifications } from "@/src/lib/notifications";
import { AdminCMS } from "./AdminCMS";
import { toast } from "@/src/lib/toast";
import { Inspection120FormModal } from "./Inspection120FormModal";
import { Full120PointReport } from "@/src/data/inspection120Data";

interface RoleDashboardsProps {
  currentUser: Profile;
  onLogout: () => void;
  onNavigateToInventory: () => void;
  onReloadAllData?: () => void;
}

export function RoleDashboards({ currentUser, onLogout, onNavigateToInventory, onReloadAllData }: RoleDashboardsProps) {
  const [activeTab, setActiveTab] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  // Common Database States
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [auctions, setAuctions] = React.useState<Auction[]>([]);
  const [leads, setLeads] = React.useState<SalesNotification[]>([]);
  
  // Buyer-specific states
  const [savedCars, setSavedCars] = React.useState<string[]>([]);
  const [testDrives, setTestDrives] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);

  // Real-time alerts feed hook
  const { notifications: userNotifs, unreadCount, markRead, markAllRead } = useNotifications(currentUser?.id);

  // Selected sub-views / modal triggers
  const [selectedInspection, setSelectedInspection] = React.useState<Inspection | null>(null);
  const [reportForm, setReportForm] = React.useState({
    overallScore: 8.5,
    engine: "Excellent condition, silent compression",
    brakes: "90% brake pads remaining",
    electronics: "Diagnostics clear, no error codes",
    exterior: "Minor scratch on front-left door, original factory paint",
    interior: "Premium dry-cleaned interiors, minor leather scuff",
    notes: "Superb luxury segment car, highly recommended for dealer bidding."
  });

  const [bidAmount, setBidAmount] = React.useState<{ [aucId: string]: string }>({});

  const reloadAllData = async () => {
    setIsLoading(true);
    try {
      const { data: profs } = await supabase.from("profiles").select();
      const { data: insps } = await supabase.from("inspections").select();
      const { data: offs } = await supabase.from("offers").select();
      const { data: aucs } = await supabase.from("auctions").select();
      const { data: lds } = await supabase.from("sales_notifications").select();

      if (profs) setProfiles(profs);
      if (insps) setInspections(insps);
      if (offs) setOffers(offs);
      if (aucs) setAuctions(aucs);
      if (lds) setLeads(lds);

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
    // 1. Update Offer
    await supabase.from("offers").update({ status: action }).eq("id", offerId);
    
    // 2. If accepted, update the associated inspection to 'sold'
    const targetOffer = offers.find(o => o.id === offerId);
    if (targetOffer && action === "accepted") {
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

  // Handle Dealer: Place Bid on live auction
  const handlePlaceBid = async (auctionId: string) => {
    const amountStr = bidAmount[auctionId];
    if (!amountStr) {
      toast.error("Please enter a valid bid amount.");
      return;
    }
    const amount = parseInt(amountStr);
    const auction = auctions.find(a => a.id === auctionId);

    if (!auction) return;
    if (amount <= auction.current_bid) {
      toast.error(`Your bid must be strictly higher than the current bid of ₹${auction.current_bid.toLocaleString()}`);
      return;
    }

    // Place the bid
    await supabase.from("auctions").update({
      current_bid: amount,
      highest_bidder_name: currentUser.name
    }).eq("id", auctionId);

    // Also trigger/update any pending offers to match
    const targetInsp = inspections.find(i => `${i.brand} ${i.model}`.toLowerCase() === auction.car_title.toLowerCase());
    if (targetInsp) {
      // Check if existing pending offers exist, otherwise insert
      const existingOffer = offers.find(o => o.inspection_id === targetInsp.id && o.dealer_id === currentUser.id);
      if (existingOffer) {
        await supabase.from("offers").update({ offer_amount: amount }).eq("id", existingOffer.id);
      } else {
        await supabase.from("offers").insert([{
          inspection_id: targetInsp.id,
          dealer_id: currentUser.id,
          dealer_name: currentUser.name,
          offer_amount: amount,
          status: "pending"
        }]);
      }

      // Rule 6: Dealer places bid → Notify Seller and Admin.
      await notificationService.triggerBidPlaced({
        sellerId: targetInsp.seller_id,
        dealerName: currentUser.name,
        carTitle: auction.car_title,
        bidAmount: amount,
        inspectionId: targetInsp.id
      });
    }

    // Reset input
    setBidAmount(prev => ({ ...prev, [auctionId]: "" }));
    toast.success("Congratulations! Your premium bid was updated successfully in the Supabase live table, and notifications have been sent.");
    reloadAllData();
  };

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

    // 2. Automagically list this car in live Dealer Auctions table to simulate full flow
    if (targetInsp) {
      const auctionRecord = {
        car_title: `${targetInsp.brand} ${targetInsp.model}`,
        year: targetInsp.year,
        km_driven: targetInsp.km_driven,
        fuel: targetInsp.fuel,
        transmission: targetInsp.transmission,
        city: targetInsp.city,
        base_price: targetInsp.year > 2020 ? 800000 : 400000,
        current_bid: targetInsp.year > 2020 ? 810000 : 410000,
        highest_bidder_name: "Starting Bid Base",
        ends_at: new Date(Date.now() + 3600000 * 24).toISOString(), // 24 hours
        status: "active"
      };

      await supabase.from("auctions").insert([auctionRecord]);

      // Notify Admin
      await notificationService.triggerReportSubmitted({
        inspectionId: targetInsp.id,
        inspectorName: currentUser.name,
        brand: targetInsp.brand,
        model: targetInsp.model,
        score: reportData.overallScorePercent
      });
    }

    toast.success("120-Point Certified Inspection Report uploaded! Vehicle submitted to Admin review and Live Dealer Auctions.");
    setSelectedInspection(null);
    reloadAllData();
  };

  // Handle Sales Associate Actions
  const handleLeadStatus = async (id: string, newStatus: "contacted" | "resolved") => {
    await supabase.from("sales_notifications").update({ status: newStatus }).eq("id", id);
    reloadAllData();
  };

  // Handle Admin: Change user role
  const handleAdminChangeRole = async (userId: string, newRole: UserRole) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    toast.success(`User role changed to ${newRole}`);
    reloadAllData();
  };

  // Clear Sandbox Data Utility
  const handleResetSandbox = () => {
    if (confirm("Reset database mock structures to pristine seed settings? All custom modifications will be flushed.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Compute stats for Admin KPI Overview
  const adminStats = React.useMemo(() => {
    return {
      users: profiles.length,
      inspectionsPending: inspections.filter(i => i.status === "pending").length,
      inspectionsTotal: inspections.length,
      offersPlaced: offers.length,
      auctionsActive: auctions.filter(a => a.status === "active").length,
      leadsPending: leads.filter(l => l.status === "pending").length
    };
  }, [profiles, inspections, offers, auctions, leads]);

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-32 pb-24 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Dashboard Heading & Meta Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#2E7D32]/10 p-6 md:p-8 rounded-3xl shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-[#2E7D32] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Authenticated Portal
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {currentUser.id}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
              Welcome back, <span className="text-[#2E7D32]">{currentUser.name}</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              🏢 Profile Role: <strong className="text-slate-800">{currentUser.role} Dashboard</strong> • Location: {currentUser.city}
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={reloadAllData}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold uppercase tracking-wider text-xs h-11 px-4 rounded-xl bg-white flex items-center gap-2 flex-1 md:flex-initial"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh Data
            </Button>
            <Button
              onClick={onLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-xs h-11 px-5 rounded-xl flex-1 md:flex-initial"
            >
              Secure Logout
            </Button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-24 text-center">
            <RefreshCw className="h-10 w-10 text-[#2E7D32] animate-spin mx-auto mb-4" />
            <h3 className="font-black text-slate-800 tracking-tight text-lg">Querying Database...</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Row Level Security policy checks active</p>
          </div>
        ) : (
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
                      { id: "offers", label: "Dealer Offers Bids", icon: DollarSign },
                      { id: "park_sell", label: "Park & Sell Program", icon: Car }
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
                      { id: "leads", label: "CRM Active Leads Desk", icon: ClipboardList }
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

                {/* ADMIN LINKS */}
                {currentUser.role === "Admin" && (
                  <>
                    {[
                      { id: "overview", label: "Dashboard Overview", icon: BarChart3 },
                      { id: "admin_cars", label: "Cars Inventory", icon: Car },
                      { id: "admin_users", label: "Users & Security Roles", icon: Users },
                      { id: "admin_staff", label: "Staff Directory", icon: UserCheck },
                      { id: "admin_settings", label: "System Settings", icon: Settings }
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
                      {CARS_DATA.filter(car => savedCars.includes(car.id)).map(car => (
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
                            <h4 className="font-black text-slate-900 text-sm">{td.car_title}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">Appointment: {td.date} @ {td.time}</p>
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

                  {offers.length > 0 ? (
                    <div className="space-y-4">
                      {offers.map(off => {
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

              {/* Park & Sell */}
              {currentUser.role === "Seller" && activeTab === "park_sell" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">1stCars Park & Sell Program</h3>
                    <p className="text-xs text-slate-400 mt-0.5">consignment list with full premium showroom display privileges.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
                      <h4 className="font-black text-[#2E7D32] text-sm uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="h-4.5 w-4.5" /> High Valuation Program
                      </h4>
                      <p className="leading-relaxed text-slate-600 font-medium">
                        Leave your vehicle at our secured luxury hubs. We manage full professional cosmetic grooming, premium photography, high-visibility digital catalog features, and handle 100% of customer inquiries.
                      </p>
                      <ul className="space-y-1 text-slate-500 font-bold list-disc pl-4">
                        <li>Free detailed professional car detailing</li>
                        <li>High exposure to 20k+ monthly premium buyers</li>
                        <li>Escrow deposit protection</li>
                      </ul>
                    </div>

                    <div className="p-5 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-3">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-1.5">
                        <Gauge className="h-4.5 w-4.5 text-[#2E7D32]" /> Eligibility Checklist
                      </h4>
                      <p className="leading-relaxed text-slate-600 font-medium">
                        Vehicles must be under 7 years old, have run less than 80,000 km, have clear financial records, and successfully pass our mandatory 1stMark 200-point inspection check.
                      </p>
                      <Button
                        onClick={onNavigateToInventory}
                        className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase tracking-wider h-10 rounded-xl mt-2"
                      >
                        Browse Luxury Hubs
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* =======================================================
                  3. DEALER DASHBOARD TABS
                  ======================================================= */}
              
              {/* Live Auctions */}
              {currentUser.role === "Dealer" && activeTab === "auctions" && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Dealer Bidding Arena</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Compete with other certified dealerships on newly certified inspected cars.</p>
                  </div>

                  {auctions.filter(a => a.status === "active").length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {auctions.filter(a => a.status === "active").map(auc => (
                        <div key={auc.id} className="border border-[#2E7D32]/10 rounded-2xl p-5 bg-[#FAF9F6] space-y-4 text-left shadow-sm">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Live Auction
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">Ends: {new Date(auc.ends_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <h4 className="font-black text-slate-900 text-base mt-1.5">{auc.year} {auc.car_title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{auc.km_driven.toLocaleString()} KM • {auc.fuel} • {auc.transmission}</p>
                          </div>

                          <div className="h-px bg-slate-200/50" />

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Starting Bid</p>
                              <p className="text-sm font-black text-slate-800 mt-1">₹{auc.base_price.toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                              <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest leading-none">Current High Bid</p>
                              <p className="text-sm font-black text-[#2E7D32] mt-1">₹{auc.current_bid.toLocaleString()}</p>
                            </div>
                          </div>

                          <p className="text-[10px] font-bold text-slate-500">
                            🏆 High Bidder: <strong className="text-[#2E7D32]">{auc.highest_bidder_name || "Starting Bid"}</strong>
                          </p>

                          <div className="flex gap-2">
                            <Input
                              placeholder="₹ Enter higher bid"
                              type="number"
                              value={bidAmount[auc.id] || ""}
                              onChange={(e) => setBidAmount(prev => ({ ...prev, [auc.id]: e.target.value }))}
                              className="h-10 text-xs rounded-xl flex-1 bg-white"
                            />
                            <Button
                              onClick={() => handlePlaceBid(auc.id)}
                              className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-bold uppercase tracking-wider px-4 rounded-xl h-10"
                            >
                              Place Bid
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <Hammer className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No active auctions found at this moment.</p>
                    </div>
                  )}
                </div>
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
                  <Inspection120FormModal
                    inspection={selectedInspection}
                    isOpen={!!selectedInspection}
                    onClose={() => setSelectedInspection(null)}
                    onSubmitReport={handleUploadReport}
                    userRole="Inspector"
                  />

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

                  {leads.filter(l => l.type === "test_drive").length > 0 ? (
                    <div className="space-y-3">
                      {leads.filter(l => l.type === "test_drive").map(lead => (
                        <div key={lead.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-[#2E7D32] text-white text-[9px] uppercase tracking-widest font-black px-2.5 py-0.5">
                                {lead.status}
                              </Badge>
                              <span className="text-[9px] font-mono text-slate-400">ID: {lead.id}</span>
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

                  {leads.filter(l => l.type !== "test_drive").length > 0 ? (
                    <div className="space-y-3">
                      {leads.filter(l => l.type !== "test_drive").map(lead => (
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

              {/* =======================================================
                  6. ADMIN DASHBOARD TABS
                  ======================================================= */}
              
              {currentUser.role === "Admin" && (
                <AdminCMS 
                  onReloadAllData={reloadAllData} 
                  onNavigateToInventory={onNavigateToInventory} 
                />
              )}

              {/* Overview */}
              {currentUser.role === "Admin" && activeTab === "overview" && false && (
                <div className="space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Total Profiles", val: adminStats.users, color: "border-slate-100 bg-white" },
                      { label: "Pending Inspections", val: adminStats.inspectionsPending, color: "border-amber-200 bg-amber-50/40 text-amber-700" },
                      { label: "Live Auctions", val: adminStats.auctionsActive, color: "border-indigo-200 bg-indigo-50/40 text-indigo-700" },
                      { label: "CRM Open Leads", val: adminStats.leadsPending, color: "border-rose-200 bg-rose-50/40 text-rose-700" }
                    ].map((stat, i) => (
                      <div key={i} className={`border p-5 rounded-2xl flex flex-col justify-between shadow-xs ${stat.color}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                        <span className="text-2xl font-black mt-1 leading-none">{stat.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-xs text-xs font-semibold">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">System Health</h4>
                      <div className="space-y-3 font-medium">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Database Engine:</span>
                          <span className="text-emerald-600 font-bold">Supabase Local Emulator (OK)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Inspections Recorded:</span>
                          <span className="text-slate-800 font-bold">{adminStats.inspectionsTotal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dealer Offers Active:</span>
                          <span className="text-slate-800 font-bold">{adminStats.offersPlaced}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-xs text-xs font-semibold">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Staff Assignment Hub</h4>
                      <div className="space-y-3 font-medium">
                        {inspections.filter(i => i.status === "pending").map(item => (
                          <div key={item.id} className="p-2.5 bg-[#FAF9F6] border border-slate-100 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="font-black text-slate-800">{item.brand} {item.model}</p>
                              <p className="text-[10px] text-slate-400">{item.city} • {item.preferred_date}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={async () => {
                                // Assign to default inspector Vikram
                                await supabase.from("inspections").update({
                                  status: "assigned",
                                  inspector_id: "u-inspector"
                                }).eq("id", item.id);
                                toast.success("Inspection request successfully assigned to Vikram Rathore.");
                                reloadAllData();
                              }}
                              className="bg-[#2E7D32] text-white text-[9px] h-7 font-black uppercase tracking-wider rounded-md"
                            >
                              Assign Vikram
                            </Button>
                          </div>
                        ))}
                        {inspections.filter(i => i.status === "pending").length === 0 && (
                          <p className="text-slate-400 italic text-center py-4">No unassigned inspections.</p>
                        )}
                      </div>
                    </div>

                    {/* Price Certification & Approval (Rule 3) */}
                    <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-xs text-xs font-semibold md:col-span-2">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Completed Reports & Price Certification (Rule 3)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-medium">
                        {inspections.filter(i => i.status === "completed").map(item => (
                          <div key={item.id} className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl flex flex-col justify-between gap-3 text-left">
                            <div>
                              <p className="font-black text-slate-800 text-sm">{item.brand} {item.model}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                Reg: {item.reg_number} • Score: <strong className="text-[#2E7D32]">{item.overall_score || "N/A"} / 10</strong>
                              </p>
                              <div className="mt-2 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100 italic">
                                Notes: "{item.notes}"
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={async () => {
                                // Admin certifies price and approves inspection
                                await supabase.from("inspections").update({
                                  status: "approved"
                                }).eq("id", item.id);

                                // Rule 3: Admin approves → Notify Seller
                                await notificationService.triggerInspectionApproved({
                                  sellerId: item.seller_id,
                                  inspectionId: item.id,
                                  brand: item.brand,
                                  model: item.model,
                                  certifiedPrice: item.year > 2020 ? 850000 : 450000
                                });

                                toast.success(`Inspection approved and ₹${(item.year > 2020 ? 850000 : 450000).toLocaleString()} price certified. Seller has been notified.`);
                                reloadAllData();
                              }}
                              className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] h-9 font-black uppercase tracking-wider rounded-xl mt-2"
                            >
                              ✔️ Approve & Certify Price
                            </Button>
                          </div>
                        ))}
                        {inspections.filter(i => i.status === "completed").length === 0 && (
                          <p className="text-slate-400 italic text-center py-4 col-span-1 md:col-span-2">No completed evaluations awaiting price certification.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Cars List */}
              {currentUser.role === "Admin" && activeTab === "admin_cars" && false && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">System Vehicles</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Core inventory records rendered inside the master catalog list.</p>
                  </div>

                  <div className="space-y-2">
                    {CARS_DATA.map(car => (
                      <div key={car.id} className="border border-slate-100 rounded-xl p-3 bg-[#FAF9F6] flex justify-between items-center text-xs">
                        <div>
                          <p className="font-black text-slate-800">{car.brand} {car.model}</p>
                          <p className="text-slate-400 font-medium">{car.year} • {car.bodyType} • {car.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">₹{(car.price * 80).toLocaleString()}</p>
                          <span className="bg-[#2E7D32]/10 text-[#2E7D32] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                            {car.certified ? "Certified" : "Consignment"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Users */}
              {currentUser.role === "Admin" && activeTab === "admin_users" && false && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">User Security Profiles</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Admin privilege control center. Elevate or downgrade roles to test individual views seamlessly.</p>
                  </div>

                  <div className="space-y-3">
                    {profiles.map(p => (
                      <div key={p.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold text-slate-700">
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-none">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{p.email} • {p.mobile || "No Mobile"}</p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Active Role</span>
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mt-1">
                              {p.role}
                            </span>
                          </div>

                          <select
                            value={p.role}
                            onChange={(e) => handleAdminChangeRole(p.id, e.target.value as UserRole)}
                            className="h-9 border border-slate-200 bg-white rounded-lg text-[11px] font-black uppercase tracking-widest px-2.5 outline-none cursor-pointer focus:ring-1 focus:ring-[#2E7D32]"
                          >
                            <option>Buyer</option>
                            <option>Seller</option>
                            <option>Dealer</option>
                            <option>Inspector</option>
                            <option>Sales Associate</option>
                            <option>Admin</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Staff */}
              {currentUser.role === "Admin" && activeTab === "admin_staff" && false && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Active Staff Directory</h3>
                    <p className="text-xs text-slate-400 mt-0.5">System-level operators with structural dashboard access rights.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {profiles.filter(p => p.role !== "Buyer" && p.role !== "Seller" && p.role !== "Dealer").map(staff => (
                      <div key={staff.id} className="border border-slate-100 p-4 rounded-2xl bg-[#FAF9F6] flex gap-3 text-left items-center">
                        <div className="h-10 w-10 bg-emerald-50 text-[#2E7D32] rounded-xl flex items-center justify-center shrink-0 font-black">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{staff.name}</p>
                          <p className="text-[10px] text-slate-400 leading-none mt-0.5">{staff.email}</p>
                          <span className="bg-[#2E7D32]/10 text-[#2E7D32] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-1.5 inline-block">
                            {staff.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Settings */}
              {currentUser.role === "Admin" && activeTab === "admin_settings" && false && (
                <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">System Settings</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Control Sandbox parameters and clear emulated database logs.</p>
                  </div>

                  <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
                    <p className="text-xs font-black text-rose-800 uppercase tracking-widest">Destructive Maintenance Area</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Clearing local databases will restore the pristine mock parameters, resolving any diagnostic collisions or corrupted testing parameters.
                    </p>
                    <Button
                      onClick={handleResetSandbox}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider h-10 px-5 rounded-xl"
                    >
                      ⚠️ Clear Local Database Sandbox
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
