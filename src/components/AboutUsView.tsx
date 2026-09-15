import * as React from "react";
import { Award, ShieldCheck, Sparkles, ClipboardCheck, FileCheck, CheckCircle2, Target } from "lucide-react";
import { PageHero } from "@/src/components/ui/PageHero";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { CTASection } from "@/src/components/ui/CTASection";
import { getPageContent, PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_UPDATED_EVENT } from "@/src/lib/pageContentDefaults";

interface AboutUsViewProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
  onNavigateToSell?: () => void;
}

function renderHighlighted(text: string, highlight: string, className = "text-[#2E7D32]") {
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
    return <>{text}</>;
  }
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);
  return (
    <>
      {before}
      <span className={className}>{match}</span>
      {after}
    </>
  );
}

export function AboutUsView({ onBackToHome, onNavigateToInventory, onNavigateToSell }: AboutUsViewProps) {
  const [s, setS] = React.useState<Record<string, string>>(PAGE_CONTENT_DEFAULTS);

  React.useEffect(() => {
    const apply = () => setS(getPageContent());
    apply();
    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
    return () => window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
  }, []);

  const WHY_CARDS = [
    { icon: ClipboardCheck, title: s.aboutValue1Title, desc: s.aboutValue1Desc },
    { icon: FileCheck, title: s.aboutValue2Title, desc: s.aboutValue2Desc },
    { icon: ShieldCheck, title: s.aboutValue3Title, desc: s.aboutValue3Desc },
    { icon: Sparkles, title: s.aboutValue4Title, desc: s.aboutValue4Desc }
  ];

  const DIFFERENTIATORS = [
    { title: s.aboutDiff1Title, desc: s.aboutDiff1Desc },
    { title: s.aboutDiff2Title, desc: s.aboutDiff2Desc },
    { title: s.aboutDiff3Title, desc: s.aboutDiff3Desc },
    { title: s.aboutDiff4Title, desc: s.aboutDiff4Desc }
  ];

  const TRUST_HIGHLIGHTS = [
    { stat: s.aboutM1Value, label: s.aboutM1Label },
    { stat: s.aboutM2Value, label: s.aboutM2Label },
    { stat: s.aboutM3Value, label: s.aboutM3Label }
  ];

  const handleSellClick = () => {
    if (onNavigateToSell) {
      onNavigateToSell();
    } else {
      onBackToHome();
    }
  };

  return (
    <div className="bg-background min-h-screen text-slate-900">
      {/* HERO */}
      <PageHero
        label={s.aboutHeroBadge}
        labelIcon={<Award className="h-4 w-4" />}
        title={renderHighlighted(s.aboutHeroHeading, s.aboutHeroHighlight)}
        subtitle={s.aboutHeroSubtitle}
        ctas={[
          { label: s.aboutBrowseButton, onClick: onNavigateToInventory },
          { label: s.aboutBackButton, onClick: handleSellClick, variant: "secondary" }
        ]}
      />

      {/* WHY 1STCARS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <SectionHeader
          badge="WHY 1STCARS"
          title="Built Around Trust"
          subtitle="We believe buying or selling a pre-owned car should be simple, transparent and fair."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10 animate-fade-up">
          {WHY_CARDS.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-lg hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] w-fit">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">{v.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* THE 1STCARS DIFFERENCE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <SectionHeader
          badge="THE 1STCARS DIFFERENCE"
          title="Why Choose 1stCars?"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {DIFFERENTIATORS.map((d) => (
            <div
              key={d.title}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs"
            >
              <CheckCircle2 className="h-5 w-5 text-[#2E7D32] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-xs text-slate-900 tracking-tight">{d.title}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OUR MISSION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-gradient-to-br from-[#F1F6F1] to-[#E4EEE6] rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden border border-[#2E7D32]/15">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 rounded-full text-[11px] font-black uppercase tracking-widest">
              <Target className="h-4 w-4" /> OUR MISSION
            </span>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              {s.aboutMissionTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-xl mx-auto">
              {s.aboutMissionText}
            </p>
          </div>
        </div>
      </div>

      {/* TRUST HIGHLIGHTS */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TRUST_HIGHLIGHTS.map((m) => (
            <div key={m.label} className="text-center space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-[#2E7D32] tracking-tighter">{m.stat}</p>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* OUR VISION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <SectionHeader
          badge="OUR VISION"
          title={s.aboutVisionTitle}
          subtitle={s.aboutVisionText}
        />
      </div>

      {/* FINAL CTA */}
      <CTASection
        badge="GET STARTED"
        title="Ready for Your Next Car Move?"
        subtitle="Explore certified cars or start selling your car with 1stCars."
        ctas={[
          { label: "Explore Cars", onClick: onNavigateToInventory },
          { label: "Sell Your Car", onClick: handleSellClick, variant: "ghost" }
        ]}
      />
    </div>
  );
}
