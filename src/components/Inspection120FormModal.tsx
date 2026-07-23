import React, { useState } from "react";
import { 
  X, Check, AlertCircle, Wrench, Sparkles, ShieldCheck, Award, 
  Plus, Trash2, Gauge, Gavel, Globe, CheckCircle2, FileText, ChevronDown, ChevronUp,
  ArrowRight, Users, DollarSign, CheckCircle
} from "lucide-react";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { 
  Full120PointReport, 
  Inspection120Category, 
  getInitial120Report,
  calculate120ReportScore 
} from "@/src/data/inspection120Data";
import { toast } from "@/src/lib/toast";

interface Inspection120FormModalProps {
  inspection: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (inspectionId: string, reportData: Full120PointReport) => void;
  onStartAuction?: (inspection: any, reportData: Full120PointReport) => void;
  onPublishToWebsite?: (inspection: any, reportData: Full120PointReport) => void;
  userRole?: "Inspector" | "Admin" | string;
}

export const Inspection120FormModal: React.FC<Inspection120FormModalProps> = ({
  inspection,
  isOpen,
  onClose,
  onSubmitReport,
  onStartAuction,
  onPublishToWebsite,
  userRole = "Inspector"
}) => {
  if (!isOpen || !inspection) return null;

  // Initialize report state from stored report_150_json / report_120_json or initial report
  const [reportData, setReportData] = useState<Full120PointReport>(() => {
    const rawJson = inspection.report_120_json || inspection.report_150_json;
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.categories && parsed.categories.length === 12) {
          return parsed;
        }
      } catch (err) {
        console.error("Failed to parse stored report json", err);
      }
    }
    const initial = getInitial120Report();
    if (inspection.notes) initial.notes = inspection.notes;
    return initial;
  });

  const [activeTab, setActiveTab] = useState<"checklist" | "workflow" | "specs" | "features" | "overview">("checklist");
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string>("cat_1");

  // Handler for category question toggle
  const handleToggleQuestion = (catId: string, qId: string) => {
    setReportData(prev => {
      const updatedCategories = prev.categories.map(cat => {
        if (cat.id !== catId) return cat;
        const updatedQuestions = cat.questions.map(q => {
          if (q.id !== qId) return q;
          return { ...q, passed: !q.passed };
        });

        const passedCount = updatedQuestions.filter(q => q.passed).length;
        const totalCount = updatedQuestions.length;
        const passRate = `${Math.round((passedCount / totalCount) * 100)}% PASS`;
        const pointsText = `${passedCount} / ${totalCount} Points Passed`;

        return {
          ...cat,
          questions: updatedQuestions,
          pointsPassedText: pointsText,
          scorePercentageText: passRate
        };
      });

      // Recalculate global score & grade
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

  // Handler for category summary text change
  const handleCategorySummaryChange = (catId: string, summaryText: string) => {
    setReportData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => cat.id === catId ? { ...cat, summary: summaryText } : cat)
    }));
  };

  // Handler for updating mechanical specs
  const handleSpecChange = (field: keyof typeof reportData.specs, value: string) => {
    setReportData(prev => ({
      ...prev,
      specs: { ...prev.specs, [field]: value }
    }));
  };

  // Handler for feature list
  const handleAddFeature = () => {
    if (!newFeatureInput.trim()) return;
    setReportData(prev => ({
      ...prev,
      keyFeatures: [...prev.keyFeatures, newFeatureInput.trim()]
    }));
    setNewFeatureInput("");
  };

  const handleRemoveFeature = (index: number) => {
    setReportData(prev => ({
      ...prev,
      keyFeatures: prev.keyFeatures.filter((_, i) => i !== index)
    }));
  };

  // Quick Action Handlers
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport(inspection.id, reportData);
    toast.success("120-Point Certified Inspection Evaluation Saved!");
    onClose();
  };

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

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto text-left"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-[#2E7D32]/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 md:p-6 border-b border-emerald-500/20 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#2E7D32] text-white border-none text-[9px] font-black uppercase tracking-widest px-2.5">
                  120-Point Certified Inspection
                </Badge>
                <Badge className={`${getGradeBadgeColor(reportData.grade)} text-[10px] font-extrabold px-2 py-0.5`}>
                  Grade {reportData.grade} ({reportData.overallScorePercent}%)
                </Badge>
                <span className="text-xs text-emerald-400 font-mono font-bold">REG: {inspection.reg_number || "GJ05-ER-4050"}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
                {inspection.year} {inspection.brand} {inspection.model}
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Variant: <strong className="text-white">{inspection.variant || "XZ+ Lux / ZX"}</strong> • Seller: {inspection.seller_name} ({inspection.seller_mobile}) • City: {inspection.city}
              </p>
            </div>

            <button 
              onClick={onClose}
              className="p-2 border border-slate-700/60 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Selection Navigation */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t border-white/10 text-xs">
            {[
              { id: "checklist", label: "120-Point Checklist", icon: ShieldCheck },
              { id: "workflow", label: "Marketplace Workflow", icon: ArrowRight },
              { id: "specs", label: "Mechanical Specs", icon: Wrench },
              { id: "features", label: "Key Features", icon: Sparkles },
              { id: "overview", label: "Grade & Final Report", icon: Award }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-[#2E7D32] text-white shadow-md shadow-emerald-900/40" 
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body Container */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">

          {/* TAB 1: 120-POINT CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Official 120-Point Technical Evaluation Checklist</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click any point to toggle Pass/Fail status. Passed: {reportData.totalPassedPoints} / 120 ({reportData.overallScorePercent}%)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getResultBadgeColor(reportData.certificationResult)} font-black text-xs px-3 py-1`}>
                    {reportData.certificationResult}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                {reportData.categories.map((cat) => {
                  const isExpanded = expandedCategory === cat.id;
                  const passedCount = cat.questions.filter(q => q.passed).length;
                  const totalCount = cat.questions.length;

                  return (
                    <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      {/* Category Accordion Header */}
                      <div 
                        onClick={() => setExpandedCategory(isExpanded ? "" : cat.id)}
                        className="p-4 bg-[#FAF9F6] flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors border-b border-slate-150"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-1.5 rounded-lg ${passedCount === totalCount ? "bg-emerald-100 text-[#2E7D32]" : "bg-amber-100 text-amber-700"}`}>
                            <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{cat.title}</h4>
                            <p className="text-xs text-slate-500 font-medium">{passedCount}/{totalCount} Points Passed • <strong className="text-[#2E7D32]">{Math.round((passedCount/totalCount)*100)}% PASS</strong></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-[#2E7D32] bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                            {passedCount}/{totalCount}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Category Content when expanded */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-white border-t border-slate-100">
                          {/* Summary Input */}
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

                          {/* Questions Checklist Grid */}
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

          {/* TAB 2: MARKETPLACE WORKFLOW */}
          {activeTab === "workflow" && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                <h3 className="text-lg font-black text-white">4-Step 1stCars Auction & Sales Pipeline</h3>
                <p className="text-xs text-slate-300">
                  Track progress through inspection, admin auction approval, dealer bidding, and seller offer presentation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl border bg-emerald-50/50 border-emerald-300 relative space-y-2">
                  <div className="w-8 h-8 rounded-full bg-[#2E7D32] text-white font-black flex items-center justify-center text-xs">1</div>
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">1. Inspector Inspects</h4>
                  <p className="text-[11px] text-slate-600 font-medium">120-Point inspection completed on site with photo proof.</p>
                  <Badge className="bg-[#2E7D32] text-white text-[9px] uppercase">Completed</Badge>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 relative space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-xs">2</div>
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">2. Admin Approves</h4>
                  <p className="text-[11px] text-slate-600 font-medium">Admin reviews 120-point report & approves for dealer live auction.</p>
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (onStartAuction) onStartAuction(inspection, reportData);
                      toast.success("Inspection Approved! Vehicle listed in Dealer Auction.");
                    }}
                    className="bg-indigo-900 hover:bg-indigo-800 text-white text-[10px] py-1 px-2.5 h-auto rounded-lg font-bold w-full mt-1 cursor-pointer"
                  >
                    Approve for Auction
                  </Button>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 relative space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-xs">3</div>
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">3. Dealers Offer</h4>
                  <p className="text-[11px] text-slate-600 font-medium">Verified B2B dealers place competitive bids in live portal.</p>
                  <Badge className="bg-slate-200 text-slate-700 text-[9px] uppercase">Bidding Portal Active</Badge>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 relative space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-xs">4</div>
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">4. Offer to Seller</h4>
                  <p className="text-[11px] text-slate-600 font-medium">Admin presents highest dealer price to seller for instant payment.</p>
                  <Badge className="bg-[#2E7D32] text-white text-[9px] uppercase">Final Settlement</Badge>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MECHANICAL SPECIFICATIONS */}
          {activeTab === "specs" && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">Mechanical & Engine Specifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified technical figures checked during inspection.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engine Displacement & Code *</label>
                  <Input
                    value={reportData.specs.engine}
                    onChange={(e) => handleSpecChange("engine", e.target.value)}
                    placeholder="e.g. 1.2L K12N DualJet Dual VVT Petrol Engine"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Power Output *</label>
                  <Input
                    value={reportData.specs.maxPower}
                    onChange={(e) => handleSpecChange("maxPower", e.target.value)}
                    placeholder="e.g. 118 bhp @ 6000 rpm"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak Torque Rating *</label>
                  <Input
                    value={reportData.specs.peakTorque}
                    onChange={(e) => handleSpecChange("peakTorque", e.target.value)}
                    placeholder="e.g. 172 Nm @ 1500-4000 rpm"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transmission Gearbox *</label>
                  <Input
                    value={reportData.specs.transmission}
                    onChange={(e) => handleSpecChange("transmission", e.target.value)}
                    placeholder="e.g. 6-Speed Automatic Torque Converter"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ARAI Certified Mileage *</label>
                  <Input
                    value={reportData.specs.araiMileage}
                    onChange={(e) => handleSpecChange("araiMileage", e.target.value)}
                    placeholder="e.g. 20.5 km/l"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idle Start-Stop / Tech *</label>
                  <Input
                    value={reportData.specs.idleStartStop}
                    onChange={(e) => handleSpecChange("idleStartStop", e.target.value)}
                    placeholder="e.g. Smart Engine Idle Start-Stop Active"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEY INSTALLED FEATURES */}
          {activeTab === "features" && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">Verified Equipment & Features</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified factory options and installed comfort equipment.
                </p>
              </div>

              {/* Add New Feature Row */}
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
                  <Plus className="h-4 w-4" /> Add Feature
                </Button>
              </div>

              {/* List of Features */}
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

          {/* TAB 5: OVERVIEW & GRADE BREAKDOWN */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-6 rounded-2xl space-y-5 border border-emerald-500/20">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">1stCars 120-Point Official Grade</span>
                    <h3 className="text-2xl font-black text-white">Vehicle Certification Breakdown</h3>
                    <p className="text-xs text-slate-300">
                      Passed {reportData.totalPassedPoints} of 120 Checkpoints
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-emerald-400 font-extrabold uppercase">Grade</p>
                      <p className="text-3xl font-black text-white">{reportData.grade}</p>
                    </div>
                    <div className="text-center px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-emerald-400 font-extrabold uppercase">Score</p>
                      <p className="text-3xl font-black text-emerald-400">{reportData.overallScorePercent}%</p>
                    </div>
                  </div>
                </div>

                {/* Grade matrix reference */}
                <div className="bg-white/5 p-4 rounded-xl text-xs space-y-2 border border-white/10">
                  <p className="font-bold text-emerald-300">Grade Matrix Reference:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-semibold text-slate-300">
                    <span className="p-1.5 bg-emerald-950/60 rounded border border-emerald-500/30">Grade A+ (95-100%)</span>
                    <span className="p-1.5 bg-emerald-900/60 rounded border border-emerald-500/30">Grade A (90-94%)</span>
                    <span className="p-1.5 bg-amber-950/60 rounded border border-amber-500/30">Grade B+ (85-89%)</span>
                    <span className="p-1.5 bg-amber-900/60 rounded border border-amber-500/30">Grade B (80-84%)</span>
                    <span className="p-1.5 bg-rose-950/60 rounded border border-rose-500/30">Grade C (&lt;80% Not Certified)</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                {/* 1stMark Certification Checkbox */}
                <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white/5 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={reportData.isCertified}
                    onChange={(e) => setReportData(prev => ({ ...prev, isCertified: e.target.checked }))}
                    className="w-5 h-5 accent-[#2E7D32] rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-black text-white">Issue 1stMark Certified Certificate</p>
                    <p className="text-[10px] text-emerald-300">Unlocks 12-Month Warranty and publishing on 1stCars marketplace</p>
                  </div>
                </label>
              </div>

              {/* Inspector Final Review Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">
                  Inspector / Admin Review Notes *
                </label>
                <textarea
                  value={reportData.notes}
                  onChange={(e) => setReportData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  required
                  placeholder="Provide comprehensive review notes..."
                  className="w-full border border-slate-200 rounded-2xl p-3.5 outline-none bg-white text-xs font-semibold focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>

              {/* Admin Workflows Header */}
              {userRole === "Admin" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Admin Action Center</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    As an Administrator, you can save report changes, start a B2B live auction with dealers, or publish this 1stMark Certified car directly to the retail website.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (onStartAuction) {
                          onStartAuction(inspection, reportData);
                          onClose();
                        }
                      }}
                      className="p-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Gavel className="h-4 w-4 text-indigo-300" />
                      <span>Start Auction with Dealers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onPublishToWebsite) {
                          onPublishToWebsite(inspection, reportData);
                          onClose();
                        }
                      }}
                      className="p-3 bg-[#2E7D32] hover:bg-[#25632a] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Globe className="h-4 w-4 text-emerald-300" />
                      <span>Publish to 1stCars Website</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <p className="text-[11px] text-slate-400 font-bold">
              1stCars 120-Point Certified Technical Standard • Inspector: {userRole}
            </p>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full md:w-auto h-11 px-5 rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full md:w-auto h-11 px-6 bg-[#2E7D32] hover:bg-[#25632a] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md"
              >
                <Check className="h-4 w-4 mr-1.5" /> Save 120-Point Report
              </Button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
