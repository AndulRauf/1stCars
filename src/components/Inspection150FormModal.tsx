import React, { useState } from "react";
import { 
  X, Check, AlertCircle, Wrench, Sparkles, ShieldCheck, Award, 
  Plus, Trash2, Gauge, Gavel, Globe, CheckCircle2, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { 
  Full150PointReport, 
  Inspection150Category, 
  getInitial150Report 
} from "@/src/data/inspection150Data";
import { toast } from "@/src/lib/toast";

interface Inspection150FormModalProps {
  inspection: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (inspectionId: string, reportData: Full150PointReport) => void;
  onStartAuction?: (inspection: any, reportData: Full150PointReport) => void;
  onPublishToWebsite?: (inspection: any, reportData: Full150PointReport) => void;
  userRole?: "Inspector" | "Admin" | string;
}

export const Inspection150FormModal: React.FC<Inspection150FormModalProps> = ({
  inspection,
  isOpen,
  onClose,
  onSubmitReport,
  onStartAuction,
  onPublishToWebsite,
  userRole = "Inspector"
}) => {
  if (!isOpen || !inspection) return null;

  // Initialize report state from stored report_150_json or initial report
  const [reportData, setReportData] = useState<Full150PointReport>(() => {
    if (inspection.report_150_json) {
      try {
        return JSON.parse(inspection.report_150_json);
      } catch (err) {
        console.error("Failed to parse stored 150 report json", err);
      }
    }
    const initial = getInitial150Report();
    if (inspection.overall_score) initial.overallScore = Number(inspection.overall_score);
    if (inspection.notes) initial.notes = inspection.notes;
    if (inspection.report_engine) initial.categories[0].summary = inspection.report_engine;
    if (inspection.report_exterior) initial.categories[1].summary = inspection.report_exterior;
    if (inspection.report_brakes) initial.categories[2].summary = inspection.report_brakes;
    if (inspection.report_electronics) initial.categories[3].summary = inspection.report_electronics;
    if (inspection.report_interior) initial.categories[5].summary = inspection.report_interior;
    return initial;
  });

  const [activeTab, setActiveTab] = useState<"specs" | "features" | "checklist" | "overview">("checklist");
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string>("cat_1");

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

  // Handler for category question toggle
  const handleToggleQuestion = (catId: string, qId: string) => {
    setReportData(prev => {
      const updatedCategories = prev.categories.map(cat => {
        if (cat.id !== catId) return cat;
        const updatedQuestions = cat.questions.map(q => {
          if (q.id !== qId) return q;
          return { ...q, passed: !q.passed };
        });

        // Recalculate category points passed
        const passedCount = updatedQuestions.filter(q => q.passed).length;
        const totalCount = updatedQuestions.length;
        const passRate = `${Math.round((passedCount / totalCount) * 100)}% PASS`;
        const points = `${passedCount} / ${totalCount} Points Passed`;

        return {
          ...cat,
          questions: updatedQuestions,
          score: passRate,
          points: points
        };
      });

      return { ...prev, categories: updatedCategories };
    });
  };

  // Handler for category summary text change
  const handleCategorySummaryChange = (catId: string, summaryText: string) => {
    setReportData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => cat.id === catId ? { ...cat, summary: summaryText } : cat)
    }));
  };

  // Quick Action Handlers
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport(inspection.id, reportData);
    toast.success("150-Point Inspection Evaluation Saved Successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto text-left">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-[#2E7D32]/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 md:p-6 border-b border-emerald-500/20 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#2E7D32] text-white border-none text-[9px] font-black uppercase tracking-widest px-2.5">
                  150-Point Certified Inspection
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
              { id: "checklist", label: "150-Point Checklist", icon: ShieldCheck },
              { id: "specs", label: "Mechanical Specs", icon: Wrench },
              { id: "features", label: "Key Installed Features", icon: Sparkles },
              { id: "overview", label: "Overall Score & Actions", icon: Award }
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

          {/* TAB 1: 150-POINT CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Interactive 150-Point Technical Evaluation</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click any question to toggle Pass/Fail status. Edit category summary notes for exact documentation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2E7D32] text-white font-black text-xs px-3 py-1">
                    150 Checkpoints Verified
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
                            <p className="text-xs text-slate-500 font-medium">{cat.points} • <strong className="text-[#2E7D32]">{cat.score}</strong></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-[#2E7D32] bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                            {passedCount}/{totalCount} Passed
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
                              Category Technician Summary & Notes *
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
                                    {q.passed ? "PASSED - STANDARD SPEC" : "ATTENTION / DEFECT NOTED"}
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

          {/* TAB 2: MECHANICAL SPECIFICATIONS */}
          {activeTab === "specs" && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">Mechanical & Structural Specifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hand-checked parameters representing standard factory output and verified technical figures.
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
                    placeholder="e.g. 89 hp @ 6000 rpm"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak Torque Rating *</label>
                  <Input
                    value={reportData.specs.peakTorque}
                    onChange={(e) => handleSpecChange("peakTorque", e.target.value)}
                    placeholder="e.g. 113 Nm @ 4400 rpm"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transmission Gearbox *</label>
                  <Input
                    value={reportData.specs.transmission}
                    onChange={(e) => handleSpecChange("transmission", e.target.value)}
                    placeholder="e.g. 5-Speed Slick Manual Transmission"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ARAI Certified Mileage *</label>
                  <Input
                    value={reportData.specs.araiMileage}
                    onChange={(e) => handleSpecChange("araiMileage", e.target.value)}
                    placeholder="e.g. 23.2 km/l"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idle Start-Stop / Hybrid Tech *</label>
                  <Input
                    value={reportData.specs.idleStartStop}
                    onChange={(e) => handleSpecChange("idleStartStop", e.target.value)}
                    placeholder="e.g. Smart Idle Start-Stop Enabled"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KEY INSTALLED FEATURES */}
          {activeTab === "features" && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">Installed Luxury & Performance Options</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Custom configured equipment installed on this vehicle from factory.
                </p>
              </div>

              {/* Add New Feature Row */}
              <div className="flex gap-2">
                <Input
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  placeholder="Type new installed feature (e.g. Dual Sunroof, 360 Camera)..."
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

          {/* TAB 4: OVERVIEW, CERTIFICATION & ADMIN/INSPECTOR ACTIONS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-5 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Master Condition Index</span>
                    <h3 className="text-2xl font-black text-white">Overall Vehicle Health Score</h3>
                    <p className="text-xs text-slate-300">Set the official evaluation score from 1.0 to 10.0</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={reportData.overallScore}
                      onChange={(e) => setReportData(prev => ({ ...prev, overallScore: Number(e.target.value) }))}
                      className="w-24 h-14 bg-white text-[#2E7D32] font-black text-2xl text-center rounded-2xl border-2 border-emerald-400 outline-none shadow-lg"
                    />
                    <span className="text-sm font-black text-slate-300">/ 10</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                {/* 1stMark Certification Checkbox */}
                <label className="flex items-center space-x-3 cursor-pointer p-2 bg-white/5 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={reportData.isCertified}
                    onChange={(e) => setReportData(prev => ({ ...prev, isCertified: e.target.checked }))}
                    className="w-5 h-5 accent-[#2E7D32] rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-black text-white">1stMark Certified Verification Stamp</p>
                    <p className="text-[10px] text-emerald-300">Unlocks direct website publication for direct retail buyers & 100% moneyback warranty</p>
                  </div>
                </label>
              </div>

              {/* Inspector Final Review Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">
                  Inspector / Admin Final Review Remarks *
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
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Admin Post-Inspection Action Center</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    As an Administrator, you can save report changes, start a B2B live auction with dealers, or publish this 1stMark Certified car directly to the retail website.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Action 1: Start Live Auction */}
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

                    {/* Action 2: Publish to Website */}
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
                      <span>Upload to Website (Direct Buyers)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <p className="text-[11px] text-slate-400 font-bold">
              150-Point Technical Protocol v2026 • Verified 1stMark Certified Standards
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
                <Check className="h-4 w-4 mr-1.5" /> Save 150-Point Report
              </Button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
