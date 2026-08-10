import * as React from "react";
import { Edit3, Home as HomeIcon, Car, Tag, Award, Users, HelpCircle, Plus, Trash2, Check, Save, RotateCcw, type LucideIcon } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "@/src/lib/toast";
import { PAGE_CONTENT_DEFAULTS, FaqItem, DEFAULT_FAQ_ITEMS } from "@/src/lib/pageContentDefaults";

interface PageEditorProps {
  websiteSettings: any;
  setWebsiteSettings: (s: any) => void;
  onSave: (e: React.FormEvent) => void;
}

type PageTab = "home" | "buy" | "sell" | "certification" | "about" | "faq";

const TABS: { id: PageTab; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "home", label: "Home Page", icon: HomeIcon, hint: "Hero, trust points, fleet, certified & testimonial sections" },
  { id: "buy", label: "Buy Cars", icon: Car, hint: "Inventory page hero, filters & CTA labels" },
  { id: "sell", label: "Sell Car", icon: Tag, hint: "Sell page banner, valuation form & CTA labels" },
  { id: "certification", label: "1stMark Certification", icon: Award, hint: "Certification page hero & section headings" },
  { id: "about", label: "About Us", icon: Users, hint: "Story, values, workflow steps & contact strip" },
  { id: "faq", label: "FAQ", icon: HelpCircle, hint: "FAQ page heading + the questions & answers" }
];

const TEXT_FIELDS: { key: string; label: string; textarea?: boolean; full?: boolean }[][] = [
  // ---- Home ----
  [
    { key: "heroTitle", label: "Hero Banner Main Title" },
    { key: "heroSubtitle", label: "Hero Banner Subtitle / Description", textarea: true, full: true },
    { key: "buyButtonText", label: "Buy Section CTA Button" },
    { key: "sellButtonText", label: "Sell Section CTA Button" },
    { key: "highlight1Title", label: "Trust Point 1 Title" },
    { key: "highlight1Desc", label: "Trust Point 1 Description", full: true },
    { key: "highlight2Title", label: "Trust Point 2 Title" },
    { key: "highlight2Desc", label: "Trust Point 2 Description", full: true },
    { key: "highlight3Title", label: "Trust Point 3 Title" },
    { key: "highlight3Desc", label: "Trust Point 3 Description", full: true },
    { key: "buyCarsHeadingText", label: "Fleet Section Heading" },
    { key: "buyCarsSubheadingText", label: "Fleet Section Subtitle", textarea: true, full: true },
    { key: "certifiedBadgeText", label: "Certified Section Badge" },
    { key: "certifiedHeadingText", label: "Certified Section Heading" },
    { key: "certifiedSubheadingText", label: "Certified Section Subtitle", textarea: true, full: true },
    { key: "testimonialBadgeText", label: "Testimonials Badge" },
    { key: "testimonialHeadingText", label: "Testimonials Heading" },
    { key: "testimonialSubheadingText", label: "Testimonials Subtitle", textarea: true, full: true },
    { key: "ctaBadgeText", label: "CTA Section Badge" },
    { key: "ctaHeadingText", label: "CTA Section Heading" },
    { key: "ctaSubheadingText", label: "CTA Section Subtitle", textarea: true, full: true }
  ],
  // ---- Buy Cars ----
  [
    { key: "buyCarsHeadingText", label: "Buy Cars Page Title", textarea: true, full: true },
    { key: "buyCarsSubheadingText", label: "Buy Cars Page Subtitle", textarea: true, full: true },
    { key: "filterHeadingText", label: "Filter Sidebar Heading" },
    { key: "searchButtonText", label: "Search Button Text" },
    { key: "detailsButtonText", label: "Details & Booking Button Text" },
    { key: "inspectionButtonText", label: "Inspection Booking Button Text" },
    { key: "valuationButtonText", label: "Valuation Button Text" }
  ],
  // ---- Sell Car ----
  [
    { key: "sellCarBannerTitle", label: "Sell Car Page Banner Title" },
    { key: "sellCarBannerDesc", label: "Sell Car Page Banner Subtitle", textarea: true, full: true },
    { key: "sellCarFormHeading", label: "Valuation Form Heading" },
    { key: "sellCarFormSubheading", label: "Valuation Form Subtitle" },
    { key: "sellButtonText", label: "Sell CTA Button Text" }
  ],
  // ---- 1stMark Certification ----
  [
    { key: "certHeroBadge", label: "Page Badge / Eyebrow", full: true },
    { key: "certHeroHeadingA", label: "Page Title (First Part)" },
    { key: "certHeroHeadingHighlight", label: "Page Title (Highlighted Part)" },
    { key: "certHeroSubheading", label: "Page Subtitle / Description", textarea: true, full: true },
    { key: "certBrowseButton", label: "Browse Cars CTA Button" },
    { key: "certChecklistButton", label: "Checklist CTA Button" },
    { key: "certPillarsTitle", label: "Pillars Section Heading", full: true },
    { key: "certPillarsSubtitle", label: "Pillars Section Subtitle", full: true },
    { key: "certChecklistLabel", label: "Checklist Section Eyebrow", full: true },
    { key: "certChecklistTitle", label: "Checklist Section Heading", full: true },
    { key: "certChecklistSubtitle", label: "Checklist Section Subtitle", full: true }
  ],
  // ---- About Us ----
  [
    { key: "aboutHeroBadge", label: "Hero Badge / Eyebrow", full: true },
    { key: "aboutHeroHeading", label: "Hero Heading", full: true },
    { key: "aboutHeroHighlight", label: "Hero Heading Highlighted Word", full: true },
    { key: "aboutHeroSubtitle", label: "Hero Subtitle / Description", textarea: true, full: true },
    { key: "aboutBrowseButton", label: "Browse Certified Cars Button" },
    { key: "aboutBackButton", label: "Back to Home Button" },
    { key: "aboutM1Value", label: "Milestone 1 Value" },
    { key: "aboutM1Label", label: "Milestone 1 Label" },
    { key: "aboutM2Value", label: "Milestone 2 Value" },
    { key: "aboutM2Label", label: "Milestone 2 Label" },
    { key: "aboutM3Value", label: "Milestone 3 Value" },
    { key: "aboutM3Label", label: "Milestone 3 Label" },
    { key: "aboutM4Value", label: "Milestone 4 Value" },
    { key: "aboutM4Label", label: "Milestone 4 Label" },
    { key: "aboutStoryBadge", label: "Our Story Badge", full: true },
    { key: "aboutStoryHeading", label: "Our Story Heading", textarea: true, full: true },
    { key: "aboutStoryHighlight", label: "Our Story Highlighted Phrase", full: true },
    { key: "aboutStoryPara1", label: "Story Paragraph 1", textarea: true, full: true },
    { key: "aboutStoryPara2", label: "Story Paragraph 2", textarea: true, full: true },
    { key: "aboutVisionTitle", label: "Vision Title" },
    { key: "aboutVisionText", label: "Vision Description" },
    { key: "aboutMissionTitle", label: "Mission Title" },
    { key: "aboutMissionText", label: "Mission Description" },
    { key: "aboutQuoteText", label: "Quote / Testimonial Block", textarea: true, full: true },
    { key: "aboutTeamLabel", label: "Team Label" },
    { key: "aboutTeamSubtitle", label: "Team Subtitle" },
    { key: "aboutStat1Value", label: "Stat 1 Value" },
    { key: "aboutStat1Label", label: "Stat 1 Label" },
    { key: "aboutStat2Value", label: "Stat 2 Value" },
    { key: "aboutStat2Label", label: "Stat 2 Label" },
    { key: "aboutStat3Value", label: "Stat 3 Value" },
    { key: "aboutStat3Label", label: "Stat 3 Label" },
    { key: "aboutValue1Title", label: "Value 1 Title" },
    { key: "aboutValue1Desc", label: "Value 1 Description" },
    { key: "aboutValue2Title", label: "Value 2 Title" },
    { key: "aboutValue2Desc", label: "Value 2 Description" },
    { key: "aboutValue3Title", label: "Value 3 Title" },
    { key: "aboutValue3Desc", label: "Value 3 Description" },
    { key: "aboutValue4Title", label: "Value 4 Title" },
    { key: "aboutValue4Desc", label: "Value 4 Description" },
    { key: "aboutStep1Title", label: "Workflow Step 1 Title" },
    { key: "aboutStep1Desc", label: "Workflow Step 1 Description", full: true },
    { key: "aboutStep2Title", label: "Workflow Step 2 Title" },
    { key: "aboutStep2Desc", label: "Workflow Step 2 Description", full: true },
    { key: "aboutStep3Title", label: "Workflow Step 3 Title" },
    { key: "aboutStep3Desc", label: "Workflow Step 3 Description", full: true },
    { key: "aboutContactHeading", label: "Contact Strip Heading", full: true },
    { key: "aboutContactSubtitle", label: "Contact Strip Subtitle", textarea: true, full: true },
    { key: "aboutContactPhone", label: "Contact Phone" },
    { key: "aboutContactEmail", label: "Contact Email" },
    { key: "aboutContactAddress", label: "Contact Address", full: true }
  ]
];

// Text-field group index per page tab (matches the TEXT_FIELDS array order).
const TEXT_FIELDS_BY_TAB: Record<Exclude<PageTab, "faq">, number> = {
  home: 0,
  buy: 1,
  sell: 2,
  certification: 3,
  about: 4
};

function Field({
  label,
  value,
  textarea,
  full,
  onChange
}: {
  label: string;
  value: string;
  textarea?: boolean;
  full?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{label}</label>
      {textarea ? (
        <textarea
          rows={2}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700 text-xs"
        />
      ) : (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-semibold text-slate-700"
        />
      )}
    </div>
  );
}

export function PageEditor({ websiteSettings, setWebsiteSettings, onSave }: PageEditorProps) {
  const [activeTab, setActiveTab] = React.useState<PageTab>("home");

  // FAQ items (mirror the Admin CMS → FAQs module storage: localStorage + Supabase `faq`).
  const [faqItems, setFaqItems] = React.useState<FaqItem[]>([]);
  const [faqLoaded, setFaqLoaded] = React.useState(false);
  const [savingFaqs, setSavingFaqs] = React.useState(false);

  React.useEffect(() => {
    let disposed = false;
    (async () => {
      let items: FaqItem[] = [...DEFAULT_FAQ_ITEMS];
      try {
        const raw = localStorage.getItem("1stcars_cms_faqs");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
        }
      } catch (e) {
        console.error("Failed to parse FAQ items from storage", e);
      }
      try {
        const { data } = await supabase.from("faq").select();
        if (data && data.length > 0) {
          items = data.map((q: any) => ({ id: q.id, category: q.category || "General", question: q.question, answer: q.answer }));
        }
      } catch (e) {
        console.error("Failed to load FAQ items from database", e);
      }
      if (disposed) return;
      setFaqItems(items);
      setFaqLoaded(true);
    })();
    return () => {
      disposed = true;
    };
  }, []);

  const handleSaveFaqs = async () => {
    setSavingFaqs(true);
    try {
      const clean = faqItems.filter((f) => f.question.trim() && f.answer.trim());
      localStorage.setItem("1stcars_cms_faqs", JSON.stringify(clean));
      for (const row of clean) {
        await supabase.from("faq").upsert(
          { id: row.id, category: row.category || "General", question: row.question, answer: row.answer },
          { onConflict: "id" }
        );
      }
      window.dispatchEvent(new Event("1stcars_settings_updated"));
      toast.success("FAQ page questions & answers saved successfully.");
    } catch (e) {
      console.error("Failed to save FAQ items:", e);
      toast.error("FAQ items saved locally, but the database sync failed.");
    } finally {
      setSavingFaqs(false);
    }
  };

  const set = (key: string) => (value: string) => setWebsiteSettings({ ...websiteSettings, [key]: value });

  const handleReset = () => {
    setWebsiteSettings({ ...websiteSettings, ...PAGE_CONTENT_DEFAULTS });
    toast.info("Page content reset to defaults. Click Save Changes to apply.");
  };

  const renderFields = (fields: typeof TEXT_FIELDS[number]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          value={websiteSettings[f.key] || ""}
          textarea={f.textarea}
          full={f.full}
          onChange={set(f.key)}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-8 text-xs font-semibold">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-[#2E7D32]" /> Edit Website Pages
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          Pick a page below, edit the copy, then hit Save Changes. Custom pages are managed further down.
        </p>
      </div>

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                active
                  ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-md shadow-[#2E7D32]/15"
                  : "bg-white text-slate-500 border-slate-200 hover:border-[#2E7D32]/40 hover:text-[#2E7D32]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active page editor */}
      {activeTab !== "faq" && (
        <div className="p-5 md:p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{TABS.find((t) => t.id === activeTab)?.hint}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-600 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Page to Defaults
            </button>
          </div>
          {renderFields(TEXT_FIELDS[TEXT_FIELDS_BY_TAB[activeTab as Exclude<PageTab, "faq">]])}
        </div>
      )}

      {/* FAQ editor */}
      {activeTab === "faq" && (
        <div className="p-5 md:p-6 bg-[#FAF9F6] border border-slate-100 rounded-2xl space-y-5">
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">FAQ Page</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Page heading, subtitle, and the questions shown on the public /faq page.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Field label="FAQ Page Heading" value={websiteSettings.faqPageHeading || ""} full onChange={set("faqPageHeading")} />
            <Field label="FAQ Page Subtitle" value={websiteSettings.faqPageSubheading || ""} textarea full onChange={set("faqPageSubheading")} />
          </div>

          <div className="border-t border-slate-200/60 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Questions &amp; Answers ({faqItems.length})</p>
              <Button
                type="button"
                onClick={() => setFaqItems((prev) => [...prev, { id: `fq-${Date.now()}`, category: "General", question: "", answer: "" }])}
                className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Question
              </Button>
            </div>

            {!faqLoaded ? (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading questions...</p>
            ) : faqItems.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No questions yet. Click "Add Question" to create one.</p>
            ) : (
              <div className="space-y-3">
                {faqItems.map((item, idx) => (
                  <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFaqItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-500 cursor-pointer"
                        title="Remove question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Category</label>
                        <input
                          type="text"
                          value={item.category || ""}
                          onChange={(e) => setFaqItems((prev) => prev.map((f, i) => (i === idx ? { ...f, category: e.target.value } : f)))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-semibold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Question</label>
                        <input
                          type="text"
                          value={item.question || ""}
                          onChange={(e) => setFaqItems((prev) => prev.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f)))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 outline-none focus:ring-1 focus:ring-[#2E7D32] text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Answer</label>
                      <textarea
                        rows={2}
                        value={item.answer || ""}
                        onChange={(e) => setFaqItems((prev) => prev.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f)))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#2E7D32] resize-none font-medium text-slate-700 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-4">
              <Button
                type="button"
                onClick={handleSaveFaqs}
                disabled={savingFaqs}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-[10px] h-9 px-5 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" /> {savingFaqs ? "Saving Questions..." : "Save Questions & Answers"}
              </Button>
              <span className="text-[9px] text-slate-400 font-bold">Synced to the FAQs module and the public /faq page.</span>
            </div>
          </div>
        </div>
      )}

      {/* Save bar */}
      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button onClick={onSave} className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-black uppercase tracking-wider text-[10px] h-10 px-6 rounded-xl flex items-center gap-2 cursor-pointer">
          <Save className="h-4 w-4" /> Save Changes
        </Button>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Updates apply instantly across the live website</p>
      </div>
    </div>
  );
}
