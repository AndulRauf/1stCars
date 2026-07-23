import * as React from "react";
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Gauge, 
  Settings, Award, Clock, HelpCircle, FileText, Search, User, 
  Phone, Mail, Calendar, MapPin, ChevronRight, Check, Heart, HelpCircle as HelpIcon,
  Gavel, Users, DollarSign, CheckCircle
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { toast } from "@/src/lib/toast";
import { OFFICIAL_120_CATEGORIES } from "@/src/data/inspection120Data";

interface FirstMarkCertificationProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
}

export function FirstMarkCertification({ onBackToHome, onNavigateToInventory }: FirstMarkCertificationProps) {
  // Navigation tabs or active subsection
  const [activeTab, setActiveTab] = React.useState<"chassis" | "odometer" | "120point" | "warranty" | "workflow">("chassis");
  
  // Interactive Certificate Lookup Engine
  const [certLookupQuery, setCertLookupQuery] = React.useState("");
  const [searchedCert, setSearchedCert] = React.useState<any | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  // Quote / Warranty Calculator states
  const [selectedVehicleType, setSelectedVehicleType] = React.useState<"sedan" | "suv" | "sports" | "supercar">("suv");
  const [includeWarranty, setIncludeWarranty] = React.useState(true);
  const [vehicleAge, setVehicleAge] = React.useState<number>(3); // years old

  // Interactive 120-point checklist active category category index (0 to 11)
  const [selectedCategoryIdx, setSelectedCategoryIdx] = React.useState<number>(0);

  // Booking state
  const [bookingForm, setBookingForm] = React.useState({
    name: "",
    mobile: "",
    email: "",
    city: "Surat",
    vehicleModel: "",
    preferredDate: "",
    agreeToTerms: true
  });
  const [isBooked, setIsBooked] = React.useState(false);

  // Mock Certificates Database
  const mockCertificates: Record<string, any> = {
    "1MC-992-GT3": {
      id: "1MC-992-GT3",
      owner: "R. Sterling",
      vehicle: "Porsche 911 GT3 (992)",
      kilometers: "8,400 km (Verified Perfect)",
      chassisStatus: "Original Paint, Zero Structural Weld Spots, 100% Non-Accident Clear",
      inspectionDate: "2026-05-14",
      grade: "Grade A+ (99% Score)",
      score: "119 / 120 Points Passed",
      certificationResult: "Certified",
      warrantyCoverage: "Active (12-Month Premium Coverage Included)",
      inspector: "Lead Master Inspector: Vijay Patel"
    },
    "1MC-G63-AMG": {
      id: "1MC-G63-AMG",
      owner: "M. Duarte",
      vehicle: "Mercedes-Benz G63 AMG",
      kilometers: "18,200 km (Verified Perfect)",
      chassisStatus: "Original Heavy Frame, 0% Misalignment, 100% Non-Accident Clear",
      inspectionDate: "2026-06-20",
      grade: "Grade A (94% Score)",
      score: "113 / 120 Points Passed",
      certificationResult: "Certified",
      warrantyCoverage: "Active (12-Month Premium Coverage Included)",
      inspector: "Lead Master Inspector: Aarav Mehta"
    },
    "1MC-BMW-M5": {
      id: "1MC-BMW-M5",
      owner: "K. Singhania",
      vehicle: "BMW M5 Competition",
      kilometers: "12,900 km (Verified Perfect)",
      chassisStatus: "Alloy Subframe Scanned, No Heat Recoil Markers, 100% Non-Accident Clear",
      inspectionDate: "2026-07-02",
      grade: "Grade A+ (97% Score)",
      score: "116 / 120 Points Passed",
      certificationResult: "Certified",
      warrantyCoverage: "Eligible for Upgrade (12-Month Warranty Add-on Available)",
      inspector: "Senior Structural Tech: Ronald D'Souza"
    }
  };

  const handleCertificateLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certLookupQuery.trim()) {
      toast.error("Please enter a Certificate ID");
      return;
    }

    setIsSearching(true);
    setSearchedCert(null);

    setTimeout(() => {
      const code = certLookupQuery.trim().toUpperCase();
      const match = mockCertificates[code];
      
      if (match) {
        setSearchedCert(match);
        toast.success("120-Point Certificate authenticated!");
      } else {
        toast.error("No certificate matches that ID. Try '1MC-992-GT3' or '1MC-G63-AMG'");
      }
      setIsSearching(false);
    }, 600);
  };

  const handleBookInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.mobile || !bookingForm.vehicleModel) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsBooked(true);
    toast.success("120-Point Inspection booking received! Our inspector will contact you.");
  };

  // Pricing calculation logic for the interactive 120-point certification package
  const calculatePackagePrice = () => {
    let basePrice = 9500;
    
    if (selectedVehicleType === "suv") basePrice = 12500;
    if (selectedVehicleType === "sports") basePrice = 18000;
    if (selectedVehicleType === "supercar") basePrice = 28000;

    let warrantyCost = 0;
    if (includeWarranty) {
      const multiplier = vehicleAge <= 2 ? 1 : vehicleAge <= 5 ? 1.3 : 1.7;
      
      if (selectedVehicleType === "sedan") warrantyCost = 15000 * multiplier;
      else if (selectedVehicleType === "suv") warrantyCost = 20000 * multiplier;
      else if (selectedVehicleType === "sports") warrantyCost = 35000 * multiplier;
      else if (selectedVehicleType === "supercar") warrantyCost = 65000 * multiplier;
    }

    return {
      inspectionFee: basePrice,
      warrantyCost: Math.round(warrantyCost),
      total: Math.round(basePrice + warrantyCost)
    };
  };

  const priceDetails = calculatePackagePrice();

  return (
    <div className="bg-[#F8F6F0] min-h-screen text-slate-900 pb-20">
      
      {/* Dynamic Header Hero Section */}
      <div className="bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-950 text-white relative py-12 md:py-20 overflow-hidden border-b border-[#2E7D32]/20">
        <div className="absolute top-0 left-0 w-full h-full bg-[#2E7D32]/5 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              <Award className="h-4 w-4" /> OFFICIAL 120-POINT CERTIFIED STANDARD
            </span>
          </div>

          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
            1stMark <span className="text-[#2E7D32]">Certification</span>
          </h1>
          <p className="text-xs sm:text-base text-slate-300 font-semibold max-w-2xl mx-auto leading-relaxed">
            The ultimate benchmark for pre-owned car certification. Every vehicle undergoes our rigorous 120-Point Inspection across 12 vital mechanical and structural categories to assign an official Vehicle Grade (A+, A, B+, B, C).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              onClick={onNavigateToInventory}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-lg shadow-[#2E7D32]/25 cursor-pointer"
            >
              Browse 120-Point Inspected Cars
            </Button>
            <a
              href="#inspection-checklist"
              className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              Explore 120 Checklist Items
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Core Pillars of 1stMark Certification */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main 3 Pillars Navigation */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Our 120-Point Verification Pillars</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Strict, meticulous checks conducted by master inspectors</p>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab("chassis")}
                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "chassis" 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Structural Check</span>
              </button>
              <button
                onClick={() => setActiveTab("odometer")}
                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "odometer" 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Gauge className="h-4 w-4" />
                <span>Odometer Scan</span>
              </button>
              <button
                onClick={() => setActiveTab("warranty")}
                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "warranty" 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Award className="h-4 w-4" />
                <span>Grade Matrix</span>
              </button>
            </div>

            {/* Pillar 1: Chassis Non-Accident Check */}
            {activeTab === "chassis" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="h-10 w-10 bg-emerald-100/80 rounded-2xl flex items-center justify-center text-[#2E7D32] mb-2">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">100% Non-Accident Structural Guarantee</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  We check the absolute structural core of the vehicle. A car may look pristine on the outside, but underneath, structural repairs tell a different story. 1stMark certification checks all 30 structural chassis checkpoints including aprons, pillars, floorboards, cross members, and chassis rails.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">01. Original Spot Welds</span>
                    <p className="text-[11px] text-slate-500 font-semibold">Verification of robotized factory spot-welds across A, B, and C pillars.</p>
                  </div>
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">02. Ultrasonic Paint Gauge</span>
                    <p className="text-[11px] text-slate-500 font-semibold">Precision paint depth measurement (microns) to detect repaints & body putty filler.</p>
                  </div>
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">03. Subframe & Apron Scans</span>
                    <p className="text-[11px] text-slate-500 font-semibold">Engine compartment apron and radiator support cross member alignment checks.</p>
                  </div>
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">04. Underbody Floorboards</span>
                    <p className="text-[11px] text-slate-500 font-semibold">Underbody chassis rails, floor pans, and exhaust line structural integrity.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pillar 2: Odometer Verification */}
            {activeTab === "odometer" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="h-10 w-10 bg-emerald-100/80 rounded-2xl flex items-center justify-center text-[#2E7D32] mb-2">
                  <Gauge className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Rigorous Kilometer & Odometer Audit</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Odometer tampering is eliminated through electronic OBD scans, service history log cross-matching, and physical component wear audits.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex gap-3.5 items-start">
                    <div className="h-5.5 w-5.5 bg-emerald-50 rounded-full flex items-center justify-center text-[#2E7D32] font-black text-xs shrink-0 mt-0.5 border border-emerald-100">1</div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Service History Logs</h4>
                      <p className="text-[11px] text-slate-500 font-semibold">Complete maintenance history tracing across OEM authorized networks.</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="h-5.5 w-5.5 bg-emerald-50 rounded-full flex items-center justify-center text-[#2E7D32] font-black text-xs shrink-0 mt-0.5 border border-emerald-100">2</div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">ECU Electronic Sweep</h4>
                      <p className="text-[11px] text-slate-500 font-semibold">Querying locked internal sub-modules (ABS, TCU, Key Fob memory).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pillar 3: Vehicle Grade Matrix */}
            {activeTab === "warranty" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="h-10 w-10 bg-emerald-100/80 rounded-2xl flex items-center justify-center text-[#2E7D32] mb-2">
                  <Award className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Official Vehicle Grade Matrix</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Vehicles are assigned a grade based on the percentage of passed checkpoints out of 120 points total:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-slate-900">Grade A+ (95–100%)</p>
                      <p className="text-[10px] text-emerald-800 font-semibold">114–120 Points Passed • Pristine</p>
                    </div>
                    <Badge className="bg-[#2E7D32] text-white">Certified</Badge>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-slate-900">Grade A (90–94%)</p>
                      <p className="text-[10px] text-emerald-800 font-semibold">108–113 Points Passed • Excellent</p>
                    </div>
                    <Badge className="bg-[#2E7D32] text-white">Certified</Badge>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-slate-900">Grade B+ (85–89%)</p>
                      <p className="text-[10px] text-amber-800 font-semibold">102–107 Points Passed</p>
                    </div>
                    <Badge className="bg-amber-600 text-white">Minor Repairs</Badge>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-slate-900">Grade B (80–84%)</p>
                      <p className="text-[10px] text-amber-800 font-semibold">96–101 Points Passed</p>
                    </div>
                    <Badge className="bg-amber-700 text-white">Minor Repairs</Badge>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center sm:col-span-2">
                    <div>
                      <p className="text-xs font-black text-slate-900">Grade C (Below 80%)</p>
                      <p className="text-[10px] text-rose-800 font-semibold">&lt;96 Points Passed • Failed Certification</p>
                    </div>
                    <Badge className="bg-rose-600 text-white">Not Certified</Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive 120-Point Checklist Directory Explorer */}
          <div id="inspection-checklist" className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-left">
            <div>
              <span className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">Full Transparent Protocol</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Interactive 120-Point Inspection Directory</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Select a category to view all verified checkpoints</p>
            </div>

            {/* Checklist Category Selector Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {OFFICIAL_120_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryIdx(idx)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer ${
                    selectedCategoryIdx === idx 
                      ? "bg-[#2E7D32] text-white border-[#2E7D32]" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {cat.title.split("(")[0]}
                </button>
              ))}
            </div>

            {/* Checklist items list */}
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-black text-slate-900">{OFFICIAL_120_CATEGORIES[selectedCategoryIdx].title}</span>
                <span className="text-xs font-bold text-[#2E7D32]">{OFFICIAL_120_CATEGORIES[selectedCategoryIdx].totalPoints} Points</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {OFFICIAL_120_CATEGORIES[selectedCategoryIdx].questions.map((q) => (
                  <div 
                    key={q.id} 
                    className="flex items-start gap-3 p-3.5 border border-slate-100 hover:border-emerald-200 rounded-xl hover:bg-emerald-50/20 transition-all group bg-[#FAF9F6]"
                  >
                    <div className="h-5 w-5 bg-emerald-100 text-[#2E7D32] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#2E7D32] transition-colors">{q.question}</h4>
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">120-Point Standard Check</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Certificate Lookup Engine & Inspection Booking Form */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          {/* Certificate Verification Card */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-[#2E7D32]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Certificate Authenticator</h3>
            </div>
            <p className="text-xs text-slate-300 font-semibold leading-relaxed">
              Enter any 1stMark Certificate ID to instantly authenticate inspection scores and structural records.
            </p>

            <form onSubmit={handleCertificateLookup} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={certLookupQuery}
                  onChange={(e) => setCertLookupQuery(e.target.value)}
                  placeholder="e.g. 1MC-992-GT3 or 1MC-G63-AMG"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSearching}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md cursor-pointer"
              >
                {isSearching ? "Authenticating..." : "Verify Certificate"}
              </Button>
            </form>

            {searchedCert && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400">{searchedCert.vehicle}</span>
                  <Badge className="bg-[#2E7D32] text-white text-[9px]">{searchedCert.grade}</Badge>
                </div>
                <p className="text-[11px] text-slate-300">Owner: {searchedCert.owner}</p>
                <p className="text-[11px] text-slate-300">Score: {searchedCert.score}</p>
                <p className="text-[10px] text-emerald-300 font-mono mt-1">{searchedCert.chassisStatus}</p>
              </div>
            )}
          </div>

          {/* Book Inspection Form */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Request 120-Point Inspection</h3>
            <p className="text-xs text-slate-500 font-semibold">
              Get your vehicle officially inspected and certified by our master technicians.
            </p>

            {!isBooked ? (
              <form onSubmit={handleBookInspection} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    placeholder="Your Full Name"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#2E7D32] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={bookingForm.mobile}
                    onChange={(e) => setBookingForm({ ...bookingForm, mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#2E7D32] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehicle Make & Model *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.vehicleModel}
                    onChange={(e) => setBookingForm({ ...bookingForm, vehicleModel: e.target.value })}
                    placeholder="e.g. 2022 Honda City ZX"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#2E7D32] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">City Location *</label>
                  <select
                    value={bookingForm.city}
                    onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#2E7D32] outline-none bg-white"
                  >
                    <option value="Surat">Surat (Flagship Hub)</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Vadodara">Vadodara</option>
                    <option value="Mumbai">Mumbai</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md cursor-pointer mt-2"
                >
                  Schedule Doorstep Inspection
                </Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-[#2E7D32] mx-auto" />
                <h4 className="text-xs font-black text-slate-900 uppercase">Inspection Request Received!</h4>
                <p className="text-[11px] text-slate-600 font-semibold">Our Surat master inspector will call you shortly to confirm doorstep location & appointment timing.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
