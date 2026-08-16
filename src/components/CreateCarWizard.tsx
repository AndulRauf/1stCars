import * as React from "react";
import {
  X, Search, ChevronRight, ArrowLeft, CheckCircle2, ShieldCheck, Wrench, Sparkles, Award,
  ChevronDown, ChevronUp, Star, Upload, Trash2, Gauge, DollarSign, MapPin, Camera, Check
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Badge } from "@/src/components/ui/Badge";
import { toast } from "@/src/lib/toast";
import { SellCatalog } from "@/src/lib/sellFormData";
import {
  Full120PointReport,
  Inspection120Category,
  getInitial120Report,
  calculate120ReportScore
} from "@/src/data/inspection120Data";

interface CreateCarWizardProps {
  sellCatalog: SellCatalog;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: any) => Promise<void>;
  // Status the record is saved with. Admin CMS publishes straight away
  // ("available"); Sales Associates submit "pending" so the admin can review
  // the listing before it goes live on the website.
  submitStatus?: string;
}

const gujaratRTOs = [
  { code: "GJ-1", city: "Ahmedabad" },
  { code: "GJ-2", city: "Mehsana" },
  { code: "GJ-3", city: "Rajkot" },
  { code: "GJ-4", city: "Bhavnagar" },
  { code: "GJ-5", city: "Surat" },
  { code: "GJ-6", city: "Vadodara" },
  { code: "GJ-7", city: "Nadiad" },
  { code: "GJ-8", city: "Palanpur" },
  { code: "GJ-9", city: "Himmatnagar" },
  { code: "GJ-10", city: "Jamnagar" },
  { code: "GJ-11", city: "Junagadh" },
  { code: "GJ-12", city: "Bhuj" },
  { code: "GJ-13", city: "Surendranagar" },
  { code: "GJ-14", city: "Amreli" },
  { code: "GJ-15", city: "Valsad" },
  { code: "GJ-16", city: "Bharuch" },
  { code: "GJ-17", city: "Godhra" },
  { code: "GJ-18", city: "Gandhinagar" },
  { code: "GJ-19", city: "Bardoli" },
  { code: "GJ-20", city: "Dahod" },
  { code: "GJ-21", city: "Navsari" },
  { code: "GJ-22", city: "Rajpipla" },
  { code: "GJ-23", city: "Anand" },
  { code: "GJ-24", city: "Patan" },
  { code: "GJ-25", city: "Porbandar" },
  { code: "GJ-26", city: "Vyara" },
  { code: "GJ-27", city: "Ahmedabad East" },
  { code: "GJ-28", city: "Morbi" },
  { code: "GJ-29", city: "Dhrangadhra" },
  { code: "GJ-30", city: "Waghai (Dang)" },
  { code: "GJ-31", city: "Modasa" },
  { code: "GJ-32", city: "Veraval" },
  { code: "GJ-33", city: "Botad" },
  { code: "GJ-34", city: "Chhota Udepur" },
  { code: "GJ-35", city: "Lunawada" },
  { code: "GJ-36", city: "Morbi Rural" },
  { code: "GJ-37", city: "Khambhalia" },
  { code: "GJ-38", city: "Bavla" }
];

const WIZARD_STEPS = [
  "Brand",
  "Model",
  "Variant",
  "Year",
  "Fuel & Gear",
  "RTO / City",
  "KM & Price",
  "120-Point Inspection",
  "Photos & Publish"
];

const getResultBadgeColor = (result: string) => {
  switch (result) {
    case "Certified":
      return "bg-[#2E7D32] text-white";
    case "Certified After Minor Repairs":
      return "bg-amber-600 text-white";
    case "Major Repairs Required":
      return "bg-orange-600 text-white";
    default:
      return "bg-rose-600 text-white";
  }
};

const getGradeBadgeColor = (grade: string) => {
  switch (grade) {
    case "A+": return "bg-emerald-600 text-white";
    case "A": return "bg-[#2E7D32] text-white";
    case "B+": return "bg-amber-600 text-white";
    case "B": return "bg-amber-700 text-white";
    default: return "bg-rose-600 text-white";
  }
};

const isImageUrl = (url: string) =>
  !!url && url !== "⭐" && (url.startsWith("http") || url.startsWith("/") || url.startsWith("data:"));

export function CreateCarWizard({ sellCatalog, isOpen, onClose, onSubmit, submitStatus = "available" }: CreateCarWizardProps) {
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Search state
  const [brandSearch, setBrandSearch] = React.useState("");
  const [modelSearch, setModelSearch] = React.useState("");
  const [rtoSearch, setRtoSearch] = React.useState("");

  // Selections (sell-car-form style)
  const [selectedBrand, setSelectedBrand] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState("");
  const [selectedVariant, setSelectedVariant] = React.useState("");
  const [selectedYear, setSelectedYear] = React.useState(2022);
  const [selectedFuel, setSelectedFuel] = React.useState("Petrol");
  const [selectedTransmission, setSelectedTransmission] = React.useState("Manual");
  const [selectedRTO, setSelectedRTO] = React.useState("");

  // KM & Price are plain text boxes (unlike the sell form's KM-range chips)
  const [kmDriven, setKmDriven] = React.useState("");
  const [price, setPrice] = React.useState("");

  // 120-Point Inspection report
  const [reportData, setReportData] = React.useState<Full120PointReport>(() => getInitial120Report());
  const [inspTab, setInspTab] = React.useState<"checklist" | "specs" | "features" | "overview">("checklist");
  const [expandedCategory, setExpandedCategory] = React.useState<string>("cat_1");
  const [newFeatureInput, setNewFeatureInput] = React.useState("");

  // Photos
  const [images, setImages] = React.useState<string[]>([]);

  // Reset everything whenever the wizard is reopened
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsSubmitting(false);
      setBrandSearch("");
      setModelSearch("");
      setRtoSearch("");
      setSelectedBrand("");
      setSelectedModel("");
      setSelectedVariant("");
      setSelectedYear(2022);
      setSelectedFuel("Petrol");
      setSelectedTransmission("Manual");
      setSelectedRTO("");
      setKmDriven("");
      setPrice("");
      setReportData(getInitial120Report());
      setInspTab("checklist");
      setExpandedCategory("cat_1");
      setNewFeatureInput("");
      setImages([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ---- Derived data -------------------------------------------------------
  const allBrands = Object.keys(sellCatalog).filter(Boolean);
  const filteredBrands = allBrands.filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase()));

  const brandModels = (selectedBrand && sellCatalog[selectedBrand]?.models)
    ? sellCatalog[selectedBrand].models
    : [];
  const filteredModels = brandModels.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const matchingModel = (selectedBrand && sellCatalog[selectedBrand]?.models || []).find((m) => m.name === selectedModel);
  const variantList = matchingModel?.variants?.length ? matchingModel.variants : ["Standard", "Base", "Premium", "Top Model"];

  const filteredRTOs = gujaratRTOs.filter(
    (r) => r.code.toLowerCase().includes(rtoSearch.toLowerCase()) || r.city.toLowerCase().includes(rtoSearch.toLowerCase())
  );

  const yearsList: number[] = [];
  for (let y = new Date().getFullYear(); y >= 2000; y--) yearsList.push(y);

  const selectedRto = gujaratRTOs.find((r) => r.code === selectedRTO);
  const regNumber = selectedRTO ? `${selectedRTO}-AB-1234` : "GJ-XX-AB-1234";
  const bodyType = matchingModel?.category || "Sedan";
  const primaryImage = images[0] || "";

  // ---- Inspection handlers ------------------------------------------------
  const handleToggleQuestion = (catId: string, qId: string) => {
    setReportData((prev) => {
      const updatedCategories = prev.categories.map((cat) => {
        if (cat.id !== catId) return cat;
        const updatedQuestions = cat.questions.map((q) =>
          q.id === qId ? { ...q, passed: !q.passed } : q
        );
        const passedCount = updatedQuestions.filter((q) => q.passed).length;
        return {
          ...cat,
          questions: updatedQuestions,
          pointsPassedText: `${passedCount} / ${updatedQuestions.length} Points Passed`,
          scorePercentageText: `${Math.round((passedCount / updatedQuestions.length) * 100)}% PASS`
        };
      });
      const calc = calculate120ReportScore(updatedCategories);
      return {
        ...prev,
        categories: updatedCategories,
        totalPassedPoints: calc.totalPassed,
        overallScorePercent: calc.overallScorePercent,
        grade: calc.grade,
        certificationResult: calc.certificationResult,
        isCertified: calc.isCertified
      };
    });
  };

  const handleCategorySummaryChange = (catId: string, summaryText: string) => {
    setReportData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => (cat.id === catId ? { ...cat, summary: summaryText } : cat))
    }));
  };

  const handleSpecChange = (field: keyof typeof reportData.specs, value: string) => {
    setReportData((prev) => ({ ...prev, specs: { ...prev.specs, [field]: value } }));
  };

  const handleAddFeature = () => {
    if (!newFeatureInput.trim()) return;
    setReportData((prev) => ({ ...prev, keyFeatures: [...prev.keyFeatures, newFeatureInput.trim()] }));
    setNewFeatureInput("");
  };

  const handleRemoveFeature = (index: number) => {
    setReportData((prev) => ({ ...prev, keyFeatures: prev.keyFeatures.filter((_, i) => i !== index) }));
  };

  // ---- Photo handlers -------------------------------------------------------
  const compressImageFile = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!file.type.startsWith("image/")) return resolve(rawUrl);
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
            resolve(canvas.toDataURL("image/jpeg", quality));
          } else {
            resolve(rawUrl);
          }
        };
        img.onerror = () => resolve(rawUrl);
        img.src = rawUrl;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleSelectPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 15 - images.length);
    if (fileArray.length === 0) return;
    const urls = await Promise.all(fileArray.map((f) => compressImageFile(f)));
    const validUrls = urls.filter(Boolean);
    setImages((prev) => {
      const next = [...prev, ...validUrls].slice(0, 15);
      return next;
    });
    if (validUrls.length > 0) toast.success(`${validUrls.length} photo(s) added. The first photo is the primary.`);
  };

  const handleRemovePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMakePrimary = (index: number) => {
    setImages((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
    toast.success("Primary photo updated.");
  };

  // ---- Submit ----------------------------------------------------------------
  const handleSubmit = async () => {
    if (!selectedBrand) return toast.error("Please select a brand.");
    if (!selectedModel) return toast.error("Please select a model.");
    if (!selectedVariant) return toast.error("Please select / enter a variant.");
    if (!selectedRTO) return toast.error("Please select the RTO / city.");
    const kmNum = Number(kmDriven);
    const priceNum = Number(price);
    if (isNaN(kmNum) || kmNum <= 0) return toast.error("Please enter a valid KM driven.");
    if (isNaN(priceNum) || priceNum <= 0) return toast.error("Please enter a valid selling price.");

    setIsSubmitting(true);
    try {
      const overallScore = reportData.overallScorePercent
        ? Number((reportData.overallScorePercent / 10).toFixed(1))
        : 9.5;

      const record = {
        title: `${selectedBrand} ${selectedModel}`,
        brand: selectedBrand,
        model: selectedModel,
        variant: selectedVariant,
        year: selectedYear,
        price: priceNum,
        emi: Math.round(priceNum / 60),
        km_driven: kmNum,
        mileage: kmNum,
        fuel: selectedFuel,
        transmission: selectedTransmission,
        owner_count: 1,
        owners: 1,
        city: selectedRto?.city || "Surat",
        location: selectedRto?.city || "Surat",
        reg_number: regNumber,
        rtoCode: regNumber,
        regCity: selectedRto?.city || "Surat",
        regYear: selectedYear,
        color: "Factory Metallic",
        insurance_type: "Comprehensive",
        bodyType,
        overall_score: overallScore,
        status: submitStatus,
        certified: reportData.isCertified,
        is_certified: reportData.isCertified,
        featured: true,
        image_url: primaryImage || "🚙",
        images,
        specifications: [
          reportData.specs.engine,
          reportData.specs.maxPower,
          reportData.specs.peakTorque,
          reportData.specs.transmission,
          reportData.specs.araiMileage
        ],
        features: reportData.keyFeatures,
        inspectionSummary: {
          overallScore,
          engine: reportData.categories[0]?.summary || "100% Pass",
          exterior: reportData.categories[1]?.summary || "100% Pass",
          brakes: reportData.categories[2]?.summary || "100% Pass",
          electronics: reportData.categories[3]?.summary || "100% Pass",
          interior: reportData.categories[5]?.summary || "100% Pass"
        },
        report_120_json: JSON.stringify(reportData),
        report_150_json: JSON.stringify(reportData),
        price_breakup: []
      };

      await onSubmit(record);
      toast.success(`Car ${selectedBrand} ${selectedModel} created successfully!`);
    } catch (err) {
      console.error("Error creating car via wizard:", err);
      const message = err instanceof Error ? err.message : "Please check your details and try again.";
      toast.error(`Failed to create car: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Stepper -------------------------------------------------------------
  const renderStepper = () => (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {WIZARD_STEPS.map((label, idx) => {
        const stepNo = idx + 1;
        const isDone = stepNo < step;
        const isActive = stepNo === step;
        return (
          <button
            key={label}
            type="button"
            onClick={() => isDone && setStep(stepNo)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "bg-[#2E7D32] text-white shadow-md"
                : isDone
                  ? "bg-emerald-100 text-[#2E7D32] hover:bg-emerald-200"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black ${
              isActive ? "bg-white/20" : isDone ? "bg-[#2E7D32] text-white" : "bg-slate-200 text-slate-500"
            }`}>
              {isDone ? <Check className="h-2.5 w-2.5" /> : stepNo}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderBackFooter = (backTo: number, currentLabel: string) => (
    <div className="flex justify-between items-center pt-5 border-t border-slate-100 text-xs font-bold">
      <button
        type="button"
        onClick={() => setStep(backTo)}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="text-slate-400">{currentLabel} • Step {step} of {WIZARD_STEPS.length}</div>
    </div>
  );

  const selectedCarLabel = `${selectedBrand} ${selectedModel} · ${selectedVariant} · ${selectedYear} · ${selectedFuel} · ${selectedRTO || "RTO Pending"}`;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center p-2 md:p-5 bg-[#2E7D32]/20 backdrop-blur-sm overflow-y-auto text-left"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-[#2E7D32]/20 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F1F6F1] to-[#E4EEE6] p-5 md:p-6 border-b border-[#2E7D32]/15 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#2E7D32] text-white border-none text-[9px] font-black uppercase tracking-widest px-2.5">
                  Create New Car
                </Badge>
                <Badge className={`${getGradeBadgeColor(reportData.grade)} text-[10px] font-extrabold px-2 py-0.5`}>
                  Inspection Grade {reportData.grade} ({reportData.overallScorePercent}%)
                </Badge>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 mt-1">
                {selectedBrand ? `${selectedBrand} ${selectedModel || ""}`.trim() : "New Car Listing"}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sell-car style wizard • KM & Price text boxes • 120-Point Certified Inspection
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">{renderStepper()}</div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          {/* STEP 1: BRAND */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Which brand is the car?</h3>
                <p className="text-xs text-slate-400 font-semibold">Pick the car brand to get started</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search brand"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="h-12 rounded-xl pl-10 border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredBrands.map((b) => {
                  const logo = sellCatalog[b]?.logo;
                  const isImg = isImageUrl(logo);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(b);
                        setSelectedModel("");
                        setSelectedVariant("");
                        setModelSearch("");
                        setStep(2);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[62px] cursor-pointer ${
                        selectedBrand === b
                          ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32] shadow-sm"
                          : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                      }`}
                    >
                      {isImg ? (
                        <div className="h-6 w-full flex items-center justify-center overflow-hidden mb-0.5">
                          <img src={logo} alt={b} className="h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="text-sm font-bold uppercase tracking-tight mb-0.5">{b.substring(0, 2)}</div>
                      )}
                      <div className="text-[10px] font-bold leading-tight line-clamp-1">{b}</div>
                    </button>
                  );
                })}
                {filteredBrands.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400 font-bold">
                    No brands match "{brandSearch}". Add the brand in Sell Form &amp; Brands Editor first.
                  </div>
                )}
              </div>
              {renderBackFooter(1, "Brand")}
            </div>
          )}

          {/* STEP 2: MODEL */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Brand:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Which model?</h3>
                <p className="text-xs text-slate-400 font-semibold">Select the car's model from the list</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search model"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="h-12 rounded-xl pl-10 border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredModels.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      setSelectedModel(m.name);
                      if (m.variants && m.variants.length > 0) setSelectedVariant(m.variants[0]);
                      setStep(3);
                    }}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedModel === m.name
                        ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32] shadow-sm"
                        : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{m.image}</span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 leading-tight">{m.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-none font-bold">
                          {m.category} · {m.years}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
                {filteredModels.length === 0 && (
                  <div className="col-span-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-slate-500 font-bold">
                      Could not find model matching "{modelSearch}"
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedModel(modelSearch || "Other");
                        setSelectedVariant("Standard");
                        setStep(3);
                      }}
                      className="bg-[#2E7D32] text-white text-xs font-bold px-4 py-2 rounded-xl"
                    >
                      Add custom model "{modelSearch || "Other"}"
                    </Button>
                  </div>
                )}
              </div>
              {renderBackFooter(1, "Model")}
            </div>
          )}

          {/* STEP 3: VARIANT */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Pick your variant</h3>
                <p className="text-xs text-slate-400 font-semibold">Select trim level / variant standard</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variantList.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setSelectedVariant(v);
                      setStep(4);
                    }}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedVariant === v
                        ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                        : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                    }`}
                  >
                    <span className="text-xs font-black">{v}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                  Don't see your variant? Type here:
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. LXI Option, Premium Dualtone"
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value)}
                    className="h-10 bg-white"
                  />
                  <Button type="button" onClick={() => setStep(4)} className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-xs font-bold px-4">
                    Next
                  </Button>
                </div>
              </div>
              {renderBackFooter(2, "Variant")}
            </div>
          )}

          {/* STEP 4: YEAR */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} · {selectedVariant}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Which year is the car?</h3>
                <p className="text-xs text-slate-400 font-semibold">Select manufacturing year on the RC plate</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {yearsList.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setSelectedYear(y);
                      setStep(5);
                    }}
                    className={`p-3.5 rounded-xl border text-center text-xs font-black transition-all cursor-pointer ${
                      selectedYear === y
                        ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                        : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {renderBackFooter(3, "Year")}
            </div>
          )}

          {/* STEP 5: FUEL & TRANSMISSION */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} ({selectedVariant} · {selectedYear})</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Fuel &amp; transmission</h3>
                <p className="text-xs text-slate-400 font-semibold">Pick the gearbox, then tap the fuel type</p>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">Transmission</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Manual", "Automatic"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTransmission(t)}
                      className={`p-3 rounded-2xl border text-center text-xs font-black transition-all cursor-pointer ${
                        selectedTransmission === t
                          ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                          : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["Petrol", "Diesel", "CNG", "EV"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setSelectedFuel(f);
                      setStep(6);
                    }}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedFuel === f
                        ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                        : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                    }`}
                  >
                    <span className="text-xs font-black">{f}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
              {renderBackFooter(4, "Fuel & Gear")}
            </div>
          )}

          {/* STEP 6: RTO / CITY */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} · {selectedVariant} · {selectedYear} · {selectedFuel}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Where is the car registered?</h3>
                <p className="text-xs text-slate-400 font-semibold">Pick the Gujarat RTO office on the number plate</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search Gujarat RTO (e.g. GJ-1, Ahmedabad, Surat)"
                  value={rtoSearch}
                  onChange={(e) => setRtoSearch(e.target.value)}
                  className="h-12 rounded-xl pl-10 border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredRTOs.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => {
                      setSelectedRTO(r.code);
                      setStep(7);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      selectedRTO === r.code
                        ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32] shadow-sm"
                        : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                    }`}
                  >
                    <span className="bg-slate-200/60 text-[10px] font-black px-2 py-1 rounded text-slate-800">{r.code}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[11px] text-slate-900 truncate leading-tight">{r.city}</h4>
                    </div>
                  </button>
                ))}
                {filteredRTOs.length === 0 && (
                  <div className="col-span-full py-6 text-center text-xs text-slate-400 font-bold">
                    No matching Gujarat RTO found. Try GJ-1, GJ-2, etc.
                  </div>
                )}
              </div>
              {renderBackFooter(5, "RTO / City")}
            </div>
          )}

          {/* STEP 7: KM & PRICE TEXT BOXES */}
          {step === 7 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} · {selectedVariant} · {selectedYear} · {selectedFuel} · {selectedRTO}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">KM driven &amp; selling price</h3>
                <p className="text-xs text-slate-400 font-semibold">Enter the odometer reading and asking price</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">KM DRIVEN *</label>
                  <Input
                    type="number"
                    placeholder="e.g. 35000"
                    value={kmDriven}
                    onChange={(e) => setKmDriven(e.target.value)}
                    leftIcon={<Gauge className="h-4 w-4" />}
                    className="h-12 rounded-xl text-sm font-bold"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Total odometer reading in kilometres</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">SELLING PRICE (₹) *</label>
                  <Input
                    type="number"
                    placeholder="e.g. 850000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    leftIcon={<DollarSign className="h-4 w-4" />}
                    className="h-12 rounded-xl text-sm font-bold"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Asking / drive-away listing price</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#2E7D32] shrink-0" />
                <div>
                  <p className="text-[10px] text-[#2E7D32] font-black uppercase tracking-wider">Auto registration</p>
                  <p className="text-xs font-black text-slate-900">
                    {selectedRto?.city || "City TBD"} • {regNumber}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setStep(6)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider h-11 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(8)}
                  className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white text-xs font-black uppercase tracking-wider h-11 rounded-xl"
                >
                  Next: 120-Point Inspection <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
              <div className="text-slate-400 text-xs font-bold text-right">Step 7 of {WIZARD_STEPS.length}</div>
            </div>
          )}

          {/* STEP 8: 120-POINT INSPECTION */}
          {step === 8 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedCarLabel}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">120-Point Certified Inspection</h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Passed {reportData.totalPassedPoints} / {reportData.totalPoints || 120} ({reportData.overallScorePercent}%) • Grade {reportData.grade}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {([
                  { id: "checklist", label: "120-Point Checklist", icon: ShieldCheck },
                  { id: "specs", label: "Mechanical Specs", icon: Wrench },
                  { id: "features", label: "Key Features", icon: Sparkles },
                  { id: "overview", label: "Grade & Final Report", icon: Award }
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = inspTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setInspTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        isActive ? "bg-[#2E7D32] text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {inspTab === "checklist" && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Official 120-Point Technical Evaluation Checklist</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Click any point to toggle Pass/Fail status. Passed: {reportData.totalPassedPoints} / {reportData.totalPoints} ({reportData.overallScorePercent}%)
                      </p>
                    </div>
                    <Badge className={`${getResultBadgeColor(reportData.certificationResult)} font-black text-xs px-3 py-1`}>
                      {reportData.certificationResult}
                    </Badge>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {reportData.categories.map((cat) => {
                      const isExpanded = expandedCategory === cat.id;
                      const passedCount = cat.questions.filter((q) => q.passed).length;
                      const totalCount = cat.questions.length;
                      return (
                        <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <div
                            onClick={() => setExpandedCategory(isExpanded ? "" : cat.id)}
                            className="p-4 bg-[#FAF9F6] flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-lg ${passedCount === totalCount ? "bg-emerald-100 text-[#2E7D32]" : "bg-amber-100 text-amber-700"}`}>
                                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-sm">{cat.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">{passedCount}/{totalCount} Points Passed • <strong className="text-[#2E7D32]">{Math.round((passedCount / totalCount) * 100)}% PASS</strong></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-[#2E7D32] bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">{passedCount}/{totalCount}</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">
                                  Technician Observations for {cat.title.split("(")[0]}
                                </label>
                                <Input
                                  value={cat.summary}
                                  onChange={(e) => handleCategorySummaryChange(cat.id, e.target.value)}
                                  placeholder="Describe technical observations..."
                                  className="h-10 text-xs font-medium rounded-xl border-slate-200"
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                {cat.questions.map((q) => (
                                  <div
                                    key={q.id}
                                    onClick={() => handleToggleQuestion(cat.id, q.id)}
                                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all ${
                                      q.passed
                                        ? "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50 text-slate-800"
                                        : "bg-rose-50/70 border-rose-200 hover:bg-rose-100/70 text-rose-900"
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${
                                      q.passed ? "bg-[#2E7D32] text-white" : "bg-rose-600 text-white"
                                    }`}>
                                      {q.passed ? "✓" : "✕"}
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-bold leading-tight">{q.question}</p>
                                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                                        q.passed ? "text-emerald-700" : "text-rose-700"
                                      }`}>
                                        {q.passed ? "PASSED" : "DEFECT / REPAIR REQUIRED"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {inspTab === "specs" && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-black text-lg text-slate-900 tracking-tight">Mechanical &amp; Engine Specifications</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Verified technical figures displayed on the listing.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    {([
                      { key: "engine", label: "Engine Displacement & Code *", placeholder: "e.g. 1.2L K12N DualJet Dual VVT Petrol Engine" },
                      { key: "maxPower", label: "Max Power Output *", placeholder: "e.g. 118 bhp @ 6000 rpm" },
                      { key: "peakTorque", label: "Peak Torque Rating *", placeholder: "e.g. 172 Nm @ 1500-4000 rpm" },
                      { key: "transmission", label: "Transmission Gearbox *", placeholder: "e.g. 6-Speed Automatic Torque Converter" },
                      { key: "araiMileage", label: "ARAI Certified Mileage *", placeholder: "e.g. 20.5 km/l" },
                      { key: "idleStartStop", label: "Idle Start-Stop / Tech *", placeholder: "e.g. Smart Engine Idle Start-Stop Active" }
                    ] as const).map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
                        <Input
                          value={reportData.specs[field.key]}
                          onChange={(e) => handleSpecChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspTab === "features" && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-black text-lg text-slate-900 tracking-tight">Verified Equipment &amp; Features</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Factory options and installed comfort equipment.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newFeatureInput}
                      onChange={(e) => setNewFeatureInput(e.target.value)}
                      placeholder="Type new feature (e.g. Sunroof, 360 Degree Camera)..."
                      className="h-11 rounded-xl text-xs font-semibold"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddFeature}
                      className="bg-[#2E7D32] hover:bg-[#25632a] text-white px-4 h-11 rounded-xl font-black text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" /> Add Feature
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {reportData.keyFeatures.map((feat, idx) => (
                      <div key={idx} className="p-3 bg-[#FAF9F6] border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                        <div className="flex items-center space-x-2.5">
                          <Sparkles className="h-4 w-4 text-[#2E7D32] shrink-0" />
                          <span>{feat}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspTab === "overview" && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-br from-[#F1F6F1] to-[#E4EEE6] p-6 rounded-2xl space-y-5 border border-[#2E7D32]/15">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">1stCars 120-Point Official Grade</span>
                        <h3 className="text-2xl font-black text-slate-900">Vehicle Certification Breakdown</h3>
                        <p className="text-xs text-slate-500">Passed {reportData.totalPassedPoints} of {reportData.totalPoints} Checkpoints</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center px-4 py-2 bg-white rounded-2xl border border-[#2E7D32]/10">
                          <p className="text-[10px] text-[#2E7D32] font-extrabold uppercase">Grade</p>
                          <p className="text-3xl font-black text-slate-900">{reportData.grade}</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-white rounded-2xl border border-[#2E7D32]/10">
                          <p className="text-[10px] text-[#2E7D32] font-extrabold uppercase">Score</p>
                          <p className="text-3xl font-black text-[#2E7D32]">{reportData.overallScorePercent}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl text-xs space-y-2 border border-[#2E7D32]/10">
                      <p className="font-bold text-[#2E7D32]">Grade Matrix Reference:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-semibold text-slate-600">
                        <span className="p-1.5 bg-emerald-50 rounded border border-emerald-200">Grade A+ (95-100%)</span>
                        <span className="p-1.5 bg-emerald-50 rounded border border-emerald-200">Grade A (90-94%)</span>
                        <span className="p-1.5 bg-amber-50 rounded border border-amber-200">Grade B+ (85-89%)</span>
                        <span className="p-1.5 bg-amber-50 rounded border border-amber-200">Grade B (80-84%)</span>
                        <span className="p-1.5 bg-rose-50 rounded border border-rose-200">Grade C (&lt;80% Not Certified)</span>
                      </div>
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-xl border border-[#2E7D32]/10">
                      <input
                        type="checkbox"
                        checked={reportData.isCertified}
                        onChange={(e) => setReportData((prev) => ({ ...prev, isCertified: e.target.checked }))}
                        className="w-5 h-5 accent-[#2E7D32] rounded cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-black text-slate-800">Issue 1stMark Certified Certificate</p>
                        <p className="text-[10px] text-emerald-700">Unlocks certified badge on the 1stCars marketplace listing</p>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">Inspector / Admin Review Notes *</label>
                    <textarea
                      value={reportData.notes}
                      onChange={(e) => setReportData((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      placeholder="Provide comprehensive review notes..."
                      className="w-full border border-slate-200 rounded-2xl p-3.5 outline-none bg-white text-xs font-semibold focus:ring-2 focus:ring-[#2E7D32]"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setStep(7)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider h-11 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(9)}
                  className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white text-xs font-black uppercase tracking-wider h-11 rounded-xl"
                >
                  Next: Photos &amp; Publish <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
              <div className="text-slate-400 text-xs font-bold text-right">Step 8 of {WIZARD_STEPS.length}</div>
            </div>
          )}

          {/* STEP 9: PHOTOS & PUBLISH */}
          {step === 9 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                  <span>Selected Car:</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedCarLabel}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Photos &amp; final review</h3>
                <p className="text-xs text-slate-400 font-semibold">
                  {submitStatus === "pending"
                    ? "Upload up to 15 photos, then submit for admin review"
                    : "Upload up to 15 photos, then publish the listing"}
                </p>
              </div>

              {/* Review summary */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-[#FAF9F6] border border-slate-200/60 rounded-2xl flex items-center gap-4 text-slate-800">
                <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center text-2xl border border-slate-100 shadow-xs overflow-hidden shrink-0">
                  {isImageUrl(primaryImage) ? (
                    <img src={primaryImage} alt="Primary" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span>🚙</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] bg-[#2E7D32]/10 text-[#2E7D32] font-black uppercase px-2 py-0.5 rounded">
                    {regNumber}
                  </span>
                  <h4 className="font-black text-sm text-slate-900 mt-1">
                    {selectedBrand} {selectedModel} · {selectedVariant}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                    {selectedYear} • {selectedFuel} • {selectedTransmission} • {selectedRto?.city} • {Number(kmDriven).toLocaleString()} km
                  </p>
                  <p className="text-sm font-black text-[#2E7D32] mt-1">
                    ₹ {Number(price).toLocaleString()} • Grade {reportData.grade} ({reportData.overallScorePercent}%)
                  </p>
                </div>
              </div>

              {/* Photo upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800">Pro Vehicle Photo Gallery ({images.length} of 15)</label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">First photo is the primary listing image</p>
                  </div>
                  {images.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="text-[10px] text-red-600 hover:text-red-700 font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Clear All
                    </button>
                  )}
                </div>

                {images.length < 15 && (
                  <label className="border-2 border-dashed border-slate-200 hover:border-[#2E7D32] rounded-2xl p-6 text-center cursor-pointer bg-[#FAF9F6] transition-all space-y-2 flex flex-col items-center">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-[11px] font-black text-slate-800">Drag &amp; Drop multiple files here</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Accepts up to 15 files in one selection</p>
                    <span className="inline-block bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase px-4 py-2 rounded-xl cursor-pointer shadow-xs">
                      Select Photos (Max 15)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleSelectPhotos(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {images.map((url, index) => {
                      const isPrimary = index === 0;
                      return (
                        <div key={url + index} className={`group relative rounded-xl overflow-hidden border-2 bg-slate-50 transition-all ${
                          isPrimary ? "border-[#2E7D32] ring-2 ring-[#2E7D32]/10" : "border-slate-200 hover:border-slate-300"
                        }`}>
                          <img src={url} alt={`Vehicle angle ${index + 1}`} className="w-full h-20 object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-[#2E7D32]/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                            <div className="flex justify-between items-start">
                              <span className="bg-[#2E7D32]/80 text-white font-mono text-[8px] px-1 rounded-sm">#{index + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(index)}
                                className="p-1 bg-rose-500 hover:bg-rose-600 rounded text-white cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleMakePrimary(index)}
                                className="w-full py-0.5 bg-[#2E7D32]/90 hover:bg-[#2E7D32] text-white text-[8px] font-black uppercase rounded text-center cursor-pointer"
                              >
                                Make Primary
                              </button>
                            )}
                          </div>
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

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setStep(8)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider h-11 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="flex-1 bg-[#2E7D32] hover:bg-[#25632a] text-white text-xs font-black uppercase tracking-wider h-11 rounded-xl shadow-md"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  {isSubmitting
                    ? "Creating Listing..."
                    : submitStatus === "pending"
                      ? "Submit for Admin Review"
                      : "Create & Publish Car"}
                </Button>
              </div>
              <div className="text-slate-400 text-xs font-bold text-right">Step 9 of {WIZARD_STEPS.length}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
