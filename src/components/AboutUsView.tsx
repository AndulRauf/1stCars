import * as React from "react";
import {
  Award, Eye, ShieldCheck, Sparkles, Heart,
  ClipboardCheck, FileCheck, Handshake, Target
} from "lucide-react";
import { PageHero } from "@/src/components/ui/PageHero";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { CTASection } from "@/src/components/ui/CTASection";
import { getPageContent, PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_UPDATED_EVENT } from "@/src/lib/pageContentDefaults";

interface AboutUsViewProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
  onNavigateToSell?: () => void;
}

// Split a heading around the first occurrence of a highlight phrase so the
// highlighted phrase can be wrapped in the brand-green span (with fallback).
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

// Canonical brand pillars (mirrors the homepage hero trust points) — read from
// the CMS settings cache when available so admin edits still apply.
const CANONICAL_PILLARS = [
  {
    title: "Single Owned",
    desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation."
  },
  {
    title: "Non Accident Trusted",
    desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics."
  },
  {
    title: "Genuine KM",
    desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs."
  }
];

export function AboutUsView({ onBackToHome, onNavigateToInventory, onNavigateToSell }: AboutUsViewProps) {
  const [s, setS] = React.useState<Record<string, string>>(PAGE_CONTENT_DEFAULTS);
  const [pillars, setPillars] = React.useState(CANONICAL_PILLARS);

  React.useEffect(() => {
    const apply = () => setS(getPageContent());
    apply();
    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("1stcars_cms_website_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.highlight1Title || parsed.highlight2Title || parsed.highlight3Title) {
            setPillars([
              {
                title: parsed.highlight1Title || CANONICAL_PILLARS[0].title,
                desc: parsed.highlight1Desc || CANONICAL_PILLARS[0].desc
              },
              {
                title: parsed.highlight2Title || CANONICAL_PILLARS[1].title,
                desc: parsed.highlight2Desc || CANONICAL_PILLARS[1].desc
              },
              {
                title: parsed.highlight3Title || CANONICAL_PILLARS[2].title,
                desc: parsed.highlight3Desc || CANONICAL_PILLARS[2].desc
              }
            ]);
          }
        }
      } catch (e) {
        console.error("Failed to parse website settings in AboutUsView", e);
      }
    }

    return () => window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
  }, []);

  const VALUES = [
    { icon: Eye, title: s.aboutValue1Title, desc: s.aboutValue1Desc },
    { icon: ShieldCheck, title: s.aboutValue2Title, desc: s.aboutValue2Desc },
    { icon: Sparkles, title: s.aboutValue3Title, desc: s.aboutValue3Desc },
    { icon: Heart, title: s.aboutValue4Title, desc: s.aboutValue4Desc }
  ];

  const DIFFERENTIATORS = [
    { icon: ClipboardCheck, title: s.aboutDiff1Title, desc: s.aboutDiff1Desc },
    { icon: FileCheck, title: s.aboutDiff2Title, desc: s.aboutDiff2Desc },
    { icon: Handshake, title: s.aboutDiff3Title, desc: s.aboutDiff3Desc },
    { icon: Target, title: s.aboutDiff4Title, desc: s.aboutDiff4Desc }
  ];

  const MILESTONES = [
    { stat: s.aboutM1Value, label: s.aboutM1Label },
    { stat: s.aboutM2Value, label: s.aboutM2Label },
    { stat: s.aboutM3Value, label: s.aboutM3Label },
    { stat: s.aboutM4Value, label: s.aboutM4Label }
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
      {/* 1. HERO */}
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

      {/* 2. WHAT WE BELIEVE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <SectionHeader
          badge="WHAT WE STAND FOR"
          title="What We Believe"
          subtitle="The principles behind every car we certify, price and deliver."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10 animate-fade-up">
          {VALUES.map((v) => {
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

      {/* 3. WHAT MAKES 1STCARS DIFFERENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <SectionHeader
          badge="THE 1STCARS DIFFERENCE"
          title="What Makes 1stCars Different"
          subtitle="Four things that make buying and selling pre-owned cars easier with us."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10 animate-fade-up">
          {DIFFERENTIATORS.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.title}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-lg hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-[#2E7D32] text-white w-fit shadow-md shadow-[#2E7D32]/25">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">{d.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{d.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. OUR MISSION */}
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

            {/* Brand pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {pillars.map((p) => (
                <div key={p.title} className="bg-white border border-[#2E7D32]/10 rounded-2xl p-5 text-center space-y-1.5">
                  <ShieldCheck className="h-5 w-5 text-[#2E7D32] mx-auto" />
                  <p className="text-sm font-black text-slate-900 tracking-tight">{p.title}</p>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            {/* Milestones */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-[#2E7D32]/10">
              {MILESTONES.map((m) => (
                <div key={m.label} className="text-center space-y-1">
                  <p className="text-2xl sm:text-3xl font-black text-[#2E7D32] tracking-tighter">{m.stat}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. OUR VISION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <SectionHeader badge={s.aboutVisionTitle} title={s.aboutVisionText} />
      </div>

      {/* 6. FINAL CTA */}
      <CTASection
        badge="GET STARTED"
        title="Ready to make your next car move?"
        subtitle="Explore certified cars or get a free valuation for your current vehicle."
        ctas={[
          { label: "Explore Cars", onClick: onNavigateToInventory },
          { label: "Sell Your Car", onClick: handleSellClick, variant: "ghost" }
        ]}
      />
    </div>
  );
}