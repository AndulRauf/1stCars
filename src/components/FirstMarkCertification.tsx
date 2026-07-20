import * as React from "react";
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Gauge, 
  Settings, Award, Clock, HelpCircle, FileText, Search, User, 
  Phone, Mail, Calendar, MapPin, ChevronRight, Check, Heart, HelpCircle as HelpIcon
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";

interface FirstMarkCertificationProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
}

export function FirstMarkCertification({ onBackToHome, onNavigateToInventory }: FirstMarkCertificationProps) {
  // Navigation tabs or active subsection
  const [activeTab, setActiveTab] = React.useState<"chassis" | "odometer" | "150point" | "warranty">("chassis");
  
  // Interactive Certificate Lookup Engine
  const [certLookupQuery, setCertLookupQuery] = React.useState("");
  const [searchedCert, setSearchedCert] = React.useState<any | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  // Quote / Warranty Calculator states
  const [selectedVehicleType, setSelectedVehicleType] = React.useState<"sedan" | "suv" | "sports" | "supercar">("suv");
  const [includeWarranty, setIncludeWarranty] = React.useState(true);
  const [vehicleAge, setVehicleAge] = React.useState<number>(3); // years old

  // Interactive 150-point checklist accordion/filter
  const [selectedCategory, setSelectedCategory] = React.useState<"chassis" | "engine" | "electrical" | "interiors" | "roadtest">("chassis");

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
      score: "9.9/10 (Pristine Grade)",
      warrantyCoverage: "Active (6-Month Premium Coverage Included)",
      inspector: "Lead Master Inspector: Vijay Patel"
    },
    "1MC-G63-AMG": {
      id: "1MC-G63-AMG",
      owner: "M. Duarte",
      vehicle: "Mercedes-Benz G63 AMG",
      kilometers: "18,200 km (Verified Perfect)",
      chassisStatus: "Original Heavy Frame, 0% Misalignment, 100% Non-Accident Clear",
      inspectionDate: "2026-06-20",
      score: "9.6/10 (Elite Grade)",
      warrantyCoverage: "Active (6-Month Premium Coverage Included)",
      inspector: "Lead Master Inspector: Aarav Mehta"
    },
    "1MC-BMW-M5": {
      id: "1MC-BMW-M5",
      owner: "K. Singhania",
      vehicle: "BMW M5 Competition",
      kilometers: "12,900 km (Verified Perfect)",
      chassisStatus: "Alloy Subframe Scanned, No Heat Recoil Markers, 100% Non-Accident Clear",
      inspectionDate: "2026-07-02",
      score: "9.7/10 (Elite Grade)",
      warrantyCoverage: "Eligible for Upgrade (6-Month Warranty Add-on Available)",
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
        toast.success("Certificate found and successfully authenticated!");
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
    toast.success("Inspection booking request received! Our inspector will contact you to schedule.");
  };

  // Pricing calculation logic for the interactive 150-point certification package & optional 6-month warranty
  const calculatePackagePrice = () => {
    let basePrice = 9500; // Base package for standard 150-point check including odometer & chassis diagnostics
    
    if (selectedVehicleType === "suv") basePrice = 12500;
    if (selectedVehicleType === "sports") basePrice = 18000;
    if (selectedVehicleType === "supercar") basePrice = 28000;

    let warrantyCost = 0;
    if (includeWarranty) {
      // Younger vehicles have cheaper warranty; older vehicles cost more to insure
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

  const inspectionChecklists = {
    chassis: [
      { id: "c-1", point: "Chassis Alignment Check", desc: "Digital 3D laser scanners verify precise structural alignment against original factory specifications." },
      { id: "c-2", point: "Pillar Structural Integrity (A, B, C Pillars)", desc: "Acoustic thickness tests guarantee zero historical crumpling or structural welds." },
      { id: "c-3", point: "Apron & Firebox Weld Diagnostics", desc: "Careful examination of engine compartment aprons to ensure zero structural repairs from front-impact collisions." },
      { id: "c-4", point: "Underbody Floorboard Inspection", desc: "Thorough inspection of floor panels, cross members, and frame rails for scrape damage or floor welds." },
      { id: "c-5", point: "Suspension Mount & Strut Towers Inspection", desc: "Ensures the suspension towers are fully original with factory weld lines intact." },
      { id: "c-6", point: "Accident Repaint & Putty Scan", desc: "Magnetic paint depth meters verify sheet-metal thickness to differentiate aesthetic repaints from structural crash putty repairs." }
    ],
    engine: [
      { id: "e-1", point: "Engine Cylinder Compression Verification", desc: "Measures compression across all cylinders to ensure healthy piston rings and valves." },
      { id: "e-2", point: "Gearbox Synchro & Dual-Clutch Diagnostics", desc: "Comprehensive torque translation testing and clutch slip measurement." },
      { id: "e-3", point: "Cooling System Pressure & Head Gasket Check", desc: "Guarantees no internal coolant leaks or thermal head gasket warp markers." },
      { id: "e-4", point: "Turbocharger & Supercharger Spool Rating", desc: "Examines boost pressure curves, impeller shaft tolerances, and oil feed lines." },
      { id: "e-5", point: "Oil Quality & Metallic Shavings Analysis", desc: "Checks lubrication density and ensures zero metal fragments in the oil reservoir." }
    ],
    electrical: [
      { id: "el-1", point: "OBD-II System Diagnostic Sweep", desc: "Full software scan of ECU, TCU, and SRS airbag systems for stored historical error codes." },
      { id: "el-2", point: "Wiring Harness & Moisture Check", desc: "Ensures no oxidation, retrofitted wire splices, or flood damage inside connection terminals." },
      { id: "el-3", point: "Hybrid Battery SOH & Cell Balancing", desc: "State-of-Health measurement for electric/hybrid battery cells (minimum 85% required)." },
      { id: "el-4", point: "Alternator and Power Delivery Load Test", desc: "Measures electrical current output under full vehicle system loads." }
    ],
    interiors: [
      { id: "i-1", point: "SRS Airbag & Seatbelt Tensioner Audit", desc: "Ensures all safety systems are active, original, and have never been deployed." },
      { id: "i-2", point: "Odor & Flood Silt Inspection", desc: "Checks carpets, footwells, and wire housings for moisture or river silt indicating flood history." },
      { id: "i-3", point: "Cockpit Switchgear & HUD Calibration", desc: "Checks every premium physical dial, console control, and Head-Up Display for flawless feedback." }
    ],
    roadtest: [
      { id: "r-1", point: "High-speed Straight Line Tracking", desc: "Ensures zero drift or chassis pull when driving at highway speeds." },
      { id: "r-2", point: "Anti-Lock Braking (ABS) Response", desc: "Measures emergency braking distance and ABS sensor response patterns." },
      { id: "r-3", point: "NVH (Noise, Vibration, Harshness) Audit", desc: "Acoustic decibel scan to verify original factory cabin isolation." }
    ]
  };

  return (
    <div className="bg-[#F8F6F0] min-h-screen text-slate-900 pb-20">
      
      {/* Dynamic Header Hero Section */}
      <div className="bg-linear-to-b from-slate-900 to-slate-950 text-white relative py-10 md:py-16 overflow-hidden border-b border-[#2E7D32]/20">
        <div className="absolute top-0 left-0 w-full h-full bg-[#2E7D32]/5 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              <Award className="h-4 w-4" /> ELITE INSPECTION CERTIFICATE
            </span>
          </div>

          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
            1stMark <span className="text-[#2E7D32]">Certification</span>
          </h1>
          <p className="text-xs sm:text-base text-slate-300 font-semibold max-w-2xl mx-auto leading-relaxed">
            The Gold Standard for premium pre-owned vehicles. Our comprehensive 150-Point inspection ensures zero accident history, authentic kilometers, and comes with an optional 6-Month Premium Warranty.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              onClick={onNavigateToInventory}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-lg shadow-[#2E7D32]/25"
            >
              Explore Inspected Cars
            </Button>
            <a
              href="#quote-calculator"
              className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full backdrop-blur-md transition-all"
            >
              Warranty Quote Calculator
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Our Verification Pillars</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Strict, meticulous checks conducted by industry experts</p>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab("chassis")}
                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeTab === "chassis" 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Chassis Check</span>
              </button>
              <button
                onClick={() => setActiveTab("odometer")}
                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeTab === "odometer" 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Gauge className="h-4 w-4" />
                <span>True Kilometers</span>
              </button>
              <button
                onClick={() => setActiveTab("warranty")}
                className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeTab === "warranty" 
                    ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Award className="h-4 w-4" />
                <span>6-Month Warranty</span>
              </button>
            </div>

            {/* Pillar 1: Chassis Non-Accident Check */}
            {activeTab === "chassis" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="h-10 w-10 bg-emerald-100/80 rounded-2xl flex items-center justify-center text-[#2E7D32] mb-2">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">100% Non-Accident Chassis Guarantee</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  We check the absolute structural core of the vehicle. A car may look pristine on the outside, but underneath, structural repairs tell a different story. 1stMark certification checks all structural chassis parts including floorboards, weld-points, crossmembers, aprons, and pillars.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">01. Original Factory Welds</span>
                    <p className="text-[11px] text-slate-500 font-semibold">We ensure all robotized factory spot-welds are unaltered, guaranteeing no panels have been sliced or replaced due to serious impact.</p>
                  </div>
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">02. Paint Thickness Mapping</span>
                    <p className="text-[11px] text-slate-500 font-semibold">Magnetic digital paint depth gauges inspect every square inch to identify body-filler (putty) used to mask severe denting or crashes.</p>
                  </div>
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">03. Subframe Laser Scans</span>
                    <p className="text-[11px] text-slate-500 font-semibold">3D laser tracking systems analyze structural square alignment to verify the frame is straight and suspension angles are factory-spec.</p>
                  </div>
                  <div className="bg-[#FAF9F6] border border-slate-100 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">04. Pillar Integrity Scan</span>
                    <p className="text-[11px] text-slate-500 font-semibold">Ultrasonic thickness tests verify the strength of A, B, and C pillars to protect occupants in a rollover scenario.</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-500/20 rounded-2xl flex items-start gap-3 mt-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase">Zero-Tolerance Accident Policy</h4>
                    <p className="text-[11px] text-amber-900/80 font-semibold mt-0.5">
                      If a vehicle shows any signs of frame welding, pillar re-alignment, structural floorboard modifications, or heavy apron damage, it is immediately disqualified from receiving 1stMark certification.
                    </p>
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
                <h3 className="text-lg font-black text-slate-900">Rigorous Kilometer & Mileage Verification</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Odometer tampering is one of the most common issues in pre-owned car sales. 1stMark certification utilizes multi-point digital, physical, and historical record sweeps to verify that the odometer is 100% authentic.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex gap-3.5 items-start">
                    <div className="h-5.5 w-5.5 bg-emerald-50 rounded-full flex items-center justify-center text-[#2E7D32] font-black text-xs shrink-0 mt-0.5 border border-emerald-100">1</div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Service Database Check</h4>
                      <p className="text-[11px] text-slate-500 font-semibold">We trace complete historical repair and maintenance timelines across all OEM authorized service networks to flag mismatched mileage progressions.</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="h-5.5 w-5.5 bg-emerald-50 rounded-full flex items-center justify-center text-[#2E7D32] font-black text-xs shrink-0 mt-0.5 border border-emerald-100">2</div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">ECU Electronic Log Matching</h4>
                      <p className="text-[11px] text-slate-500 font-semibold">Using advanced electronic diagnostic interfaces, we query locked background memory registries inside independent sub-modules (such as ABS, gearbox, or key fob chips) which cannot be easily modified.</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="h-5.5 w-5.5 bg-emerald-50 rounded-full flex items-center justify-center text-[#2E7D32] font-black text-xs shrink-0 mt-0.5 border border-emerald-100">3</div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Wear Pattern Diagnostics</h4>
                      <p className="text-[11px] text-slate-500 font-semibold">Our expert technicians inspect hardware elements (pedal wear, steering leather gloss, brake rotor lips, seat bolster compression) to ensure physical condition matches recorded mileage.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pillar 3: 6-Month Warranty Add-On Option */}
            {activeTab === "warranty" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="h-10 w-10 bg-emerald-100/80 rounded-2xl flex items-center justify-center text-[#2E7D32] mb-2">
                  <Award className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Complimentary 6-Month Premium Warranty Option</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Every 1stMark Certified car is eligible for an optional 6-Month comprehensive premium warranty plan. This shields you from unexpected repair overheads, covering engine, dual-clutch transmission, active suspension, steering rack, and critical cooling system elements.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl text-center space-y-1.5">
                    <Settings className="h-6 w-6 text-[#2E7D32] mx-auto" />
                    <h4 className="text-[11px] font-black uppercase text-slate-900">Engine & Drivetrain</h4>
                    <p className="text-[10px] text-slate-500 font-semibold">Complete cylinder block, crankshaft, camshaft, turbo spool, and manual/automatic gearboxes.</p>
                  </div>
                  <div className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl text-center space-y-1.5">
                    <Clock className="h-6 w-6 text-[#2E7D32] mx-auto" />
                    <h4 className="text-[11px] font-black uppercase text-slate-900">Roadside Assist</h4>
                    <p className="text-[10px] text-slate-500 font-semibold">24/7 emergency towing, flat-tire changes, battery jump-starts, and dynamic key retrieval services.</p>
                  </div>
                  <div className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl text-center space-y-1.5">
                    <ShieldCheck className="h-6 w-6 text-[#2E7D32] mx-auto" />
                    <h4 className="text-[11px] font-black uppercase text-slate-900">100% Cashless Claims</h4>
                    <p className="text-[10px] text-slate-500 font-semibold">Zero-deductible network garages handle direct digital billing with no administrative headaches.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive 150-Point Checklist Viewer */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Interactive 150-Point Inspection Directory</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Browse every single mechanical, electronic, and structural check</p>
            </div>

            {/* Checklist Category Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "chassis", label: "Chassis & Frame" },
                { key: "engine", label: "Engine & Powertrain" },
                { key: "electrical", label: "ECU & Electronics" },
                { key: "interiors", label: "Cabin & Airbags" },
                { key: "roadtest", label: "Dynamic Road Test" }
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key as any)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    selectedCategory === cat.key 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Checklist rendering */}
            <div className="space-y-3.5">
              {inspectionChecklists[selectedCategory].map((chk) => (
                <div 
                  key={chk.id} 
                  className="flex items-start gap-4 p-4 border border-slate-100 hover:border-emerald-200 rounded-2xl hover:bg-emerald-50/20 transition-all group"
                >
                  <div className="h-5.5 w-5.5 bg-emerald-100 text-[#2E7D32] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase group-hover:text-[#2E7D32] transition-colors">{chk.point}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-relaxed">{chk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Interactive Warranty Quote Estimator */}
          <div id="quote-calculator" className="bg-emerald-900 text-white border border-[#2E7D32]/20 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#2E7D32]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-6">
              
              <div>
                <span className="text-[10px] font-black text-[#66BB6A] uppercase tracking-widest block mb-1">Interactive Price Calculator</span>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-none">Estimate 1stMark Certification & Optional 6-Month Warranty Cost</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* Vehicle Category */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-emerald-200 mb-2">1. Vehicle Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "sedan", label: "Executive Sedan" },
                      { key: "suv", label: "Luxury SUV" },
                      { key: "sports", label: "Sports Coupe" },
                      { key: "supercar", label: "Supercar / Exotic" }
                    ].map((vt) => (
                      <button
                        key={vt.key}
                        type="button"
                        onClick={() => setSelectedVehicleType(vt.key as any)}
                        className={`p-2.5 rounded-xl text-[10px] font-black uppercase text-center transition-all border ${
                          selectedVehicleType === vt.key 
                            ? "bg-white text-emerald-950 border-white font-extrabold shadow-sm" 
                            : "bg-emerald-800/40 text-emerald-100 border-emerald-700/50 hover:bg-emerald-800/70"
                        }`}
                      >
                        {vt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Slider */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-emerald-200 mb-2">2. Vehicle Age: <span className="text-white font-extrabold">{vehicleAge} Years Old</span></label>
                  <div className="space-y-2 mt-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={vehicleAge}
                      onChange={(e) => setVehicleAge(Number(e.target.value))}
                      className="w-full accent-white bg-emerald-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-black uppercase text-emerald-300">
                      <span>Brand New (1 Yr)</span>
                      <span>Older (8 Yrs)</span>
                    </div>
                  </div>
                </div>

                {/* Toggle Warranty */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-emerald-200 mb-2">3. 6-Month Warranty Add-on</label>
                  <button
                    type="button"
                    onClick={() => setIncludeWarranty(!includeWarranty)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      includeWarranty 
                        ? "bg-white text-emerald-950 border-white shadow-lg" 
                        : "bg-emerald-800/40 text-emerald-200 border-emerald-700/50 hover:bg-emerald-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase leading-none">Include Warranty</h4>
                        <p className="text-[9px] font-semibold mt-1 opacity-80">Covers Engine, TCU & Gearbox</p>
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                        includeWarranty ? "bg-[#2E7D32] border-[#2E7D32] text-white" : "border-emerald-500"
                      }`}>
                        {includeWarranty && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </button>
                </div>

              </div>

              {/* Price Breakdown display box */}
              <div className="bg-emerald-950 border border-emerald-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
                <div className="space-y-1.5 text-left w-full md:w-auto">
                  <div className="flex justify-between text-xs font-bold text-emerald-300">
                    <span>150-Point Expert Inspection Fee:</span>
                    <span className="font-extrabold text-white ml-6">₹{priceDetails.inspectionFee.toLocaleString()}</span>
                  </div>
                  {includeWarranty && (
                    <div className="flex justify-between text-xs font-bold text-emerald-300">
                      <span>6-Month Comprehensive Warranty:</span>
                      <span className="font-extrabold text-white ml-6">₹{priceDetails.warrantyCost.toLocaleString()}</span>
                    </div>
                  )}
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-2 pt-1 border-t border-emerald-800">
                    * Estimates apply to onsite checks anywhere across Gujarat regions (Surat, Bharuch, Vadodara, Vapi)
                  </p>
                </div>

                <div className="text-center md:text-right shrink-0">
                  <span className="text-[10px] font-black text-[#66BB6A] uppercase tracking-widest block">Total Estimated Fee</span>
                  <span className="text-3xl md:text-4xl font-black text-white">₹{priceDetails.total.toLocaleString()}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Interactive Certificate lookup + Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Lookup Existing Certificate Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#2E7D32]" /> Authenticate Certificate
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Verify an existing vehicle's 1stMark certification report instantly. Enter a Certificate ID below:
            </p>

            <form onSubmit={handleCertificateLookup} className="space-y-3">
              <div className="relative flex items-center">
                <Search className="h-4 w-4 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  placeholder="e.g. 1MC-992-GT3"
                  value={certLookupQuery}
                  onChange={(e) => setCertLookupQuery(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                />
              </div>
              <Button type="submit" disabled={isSearching} className="w-full bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider h-10 rounded-xl">
                {isSearching ? "Authenticating..." : "Search & Verify"}
              </Button>
            </form>

            {/* Lookup result display */}
            {searchedCert && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3.5 text-xs animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between border-b border-emerald-150 pb-1.5">
                  <span className="font-black text-[10px] text-[#2E7D32] uppercase tracking-widest">Report Verified ✓</span>
                  <span className="font-mono text-[10px] text-slate-500 font-bold">{searchedCert.id}</span>
                </div>
                <div className="space-y-1.5 font-bold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Vehicle Specification</span>
                    <span className="text-slate-900 font-black">{searchedCert.vehicle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Verified Mileage</span>
                    <span className="text-slate-900 font-black flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-[#2E7D32]" /> {searchedCert.kilometers}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Chassis Diagnosis</span>
                    <span className="text-slate-900 font-extrabold">{searchedCert.chassisStatus}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Overall Grade Score</span>
                    <span className="text-[#2E7D32] font-black">{searchedCert.score}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">6-Month Warranty</span>
                    <span className="text-slate-900 font-extrabold">{searchedCert.warrantyCoverage}</span>
                  </div>
                  <div className="pt-1.5 border-t border-emerald-100 text-[10px] text-slate-400 italic">
                    {searchedCert.inspector}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Book Doorstep Inspection Form */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#2E7D32]" /> Book On-Site Inspection
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              We send our fully equipped master inspection team directly to your doorstep anywhere in Gujarat.
            </p>

            {isBooked ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <div className="h-12 w-12 bg-[#2E7D32]/10 text-[#2E7D32] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-xs">Inspection Requested!</h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Our service desk is compiling your paperwork. An inspector will call you at <span className="font-black text-[#2E7D32]">{bookingForm.mobile}</span> shortly to coordinate timings.
                </p>
                <Button 
                  onClick={() => {
                    setIsBooked(false);
                    setBookingForm({ name: "", mobile: "", email: "", city: "Surat", vehicleModel: "", preferredDate: "", agreeToTerms: true });
                  }}
                  variant="outline"
                  className="w-full text-[10px] font-black uppercase"
                >
                  Book Another Check
                </Button>
              </div>
            ) : (
              <form onSubmit={handleBookInspection} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Your Name *</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={bookingForm.mobile}
                    onChange={(e) => setBookingForm({ ...bookingForm, mobile: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Your City *</label>
                    <select
                      value={bookingForm.city}
                      onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    >
                      <option value="Surat">Surat</option>
                      <option value="Bharuch">Bharuch</option>
                      <option value="Vadodara">Vadodara</option>
                      <option value="Vapi">Vapi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Inspection Date</label>
                    <input
                      type="date"
                      value={bookingForm.preferredDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferredDate: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Vehicle Make & Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. BMW X5 2022"
                    value={bookingForm.vehicleModel}
                    onChange={(e) => setBookingForm({ ...bookingForm, vehicleModel: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#2E7D32]"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="agree-to-inspection-terms"
                    checked={bookingForm.agreeToTerms}
                    onChange={(e) => setBookingForm({ ...bookingForm, agreeToTerms: e.target.checked })}
                    className="rounded border-slate-300 text-[#2E7D32] focus:ring-[#2E7D32]"
                  />
                  <label htmlFor="agree-to-inspection-terms" className="text-[10px] font-bold text-slate-500">
                    I agree to the 150-Point inspection guidelines.
                  </label>
                </div>

                <Button type="submit" className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs uppercase tracking-wider h-11 rounded-xl shadow-lg shadow-[#2E7D32]/10 mt-1">
                  Request Step-1 Booking
                </Button>
              </form>
            )}
          </div>

          {/* Quick FAQ / Info box */}
          <div className="p-5 bg-[#FAF9F6] border border-slate-150 rounded-3xl space-y-3.5 text-left">
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
              <HelpIcon className="h-4 w-4 text-slate-500" /> Frequently Asked Questions
            </h4>
            <div className="space-y-3 text-[11px] font-semibold leading-relaxed text-slate-600">
              <div>
                <p className="text-slate-900 font-bold uppercase text-[10px]">Q. Can I inspect any car before selling it?</p>
                <p className="mt-0.5">Yes, obtaining a 1stMark Certificate increases your car's resale valuation and builds buyer trust.</p>
              </div>
              <div>
                <p className="text-slate-900 font-bold uppercase text-[10px]">Q. How long does the 150-point inspection take?</p>
                <p className="mt-0.5">A complete on-site inspection takes approximately 90 to 120 minutes of meticulous checking.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
