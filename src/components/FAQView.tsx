import * as React from "react";
import { HelpCircle, ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { getPageContent, PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_UPDATED_EVENT } from "@/src/lib/pageContentDefaults";
import { cn } from "@/src/lib/utils";

interface FAQViewProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  { id: "fq-1", category: "Certification", question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
  { id: "fq-2", category: "Trust", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification guarantees three core pillars: Single Owned, Non-Accident Trusted, and Genuine KM verified through OBD diagnostics and service log sweeps." }
];

function loadFaqs(): FaqItem[] {
  try {
    const raw = localStorage.getItem("1stcars_cms_faqs");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_FAQS;
}

export function FAQView({ onBackToHome, onNavigateToInventory }: FAQViewProps) {
  const [s, setS] = React.useState<Record<string, string>>(PAGE_CONTENT_DEFAULTS);
  const [faqs, setFaqs] = React.useState<FaqItem[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const apply = () => {
      setS(getPageContent());
      setFaqs(loadFaqs());
    };
    apply();
    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
    return () => window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
  }, []);

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-900 pb-20">

      {/* Hero */}
      <div className="bg-gradient-to-b from-emerald-50 to-emerald-100 text-slate-900 relative pt-28 sm:pt-32 pb-14 md:pb-16 overflow-hidden border-b border-[#2E7D32]/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" /> 1STCARS HELP CENTER
            </span>
          </div>
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {s.faqPageHeading}
          </h1>
          <p className="text-xs sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto leading-relaxed">
            {s.faqPageSubheading}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              onClick={onNavigateToInventory}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-lg shadow-[#2E7D32]/25 cursor-pointer"
            >
              Browse Certified Cars <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={onBackToHome}
              className="bg-white/60 hover:bg-white/80 border border-[#2E7D32]/20 text-[#2E7D32] font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-3">
        {faqs.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <HelpCircle className="h-10 w-10 text-[#2E7D32]/30 mx-auto mb-4" />
            <p className="text-sm font-black text-slate-700">No questions published yet.</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">Questions added in the Admin Panel → Edit Pages → FAQ will appear here.</p>
          </div>
        )}
        {faqs.map((f) => {
          const open = openId === f.id;
          return (
            <div key={f.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : f.id)}
                className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#2E7D32]">{f.category}</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5 leading-snug">{f.question}</p>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-slate-400 shrink-0 transition-transform duration-300", open && "rotate-180 text-[#2E7D32]")} />
              </button>
              <div className={cn("px-5 sm:px-6 transition-all duration-300 overflow-hidden", open ? "pb-5 max-h-96" : "max-h-0")}>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{f.answer}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
