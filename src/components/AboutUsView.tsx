import * as React from "react";
import { 
  ShieldCheck, Award, Users, Handshake, BadgeCheck, CheckCircle2,
  ArrowRight, Sparkles, MapPin, Phone, Mail, Target, Eye, Heart, 
  FileCheck, Gauge, Clock, Star, Quote
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { getPageContent, PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_UPDATED_EVENT } from "@/src/lib/pageContentDefaults";

interface AboutUsViewProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
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

export function AboutUsView({ onBackToHome, onNavigateToInventory }: AboutUsViewProps) {
  const [s, setS] = React.useState<Record<string, string>>(PAGE_CONTENT_DEFAULTS);

  React.useEffect(() => {
    const apply = () => setS(getPageContent());
    apply();
    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
    return () => window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
  }, []);

  const VALUES = [
    { icon: ShieldCheck, title: s.aboutValue1Title, desc: s.aboutValue1Desc },
    { icon: BadgeCheck, title: s.aboutValue2Title, desc: s.aboutValue2Desc },
    { icon: Handshake, title: s.aboutValue3Title, desc: s.aboutValue3Desc },
    { icon: Heart, title: s.aboutValue4Title, desc: s.aboutValue4Desc }
  ];

  const MILESTONES = [
    { stat: s.aboutM1Value, label: s.aboutM1Label },
    { stat: s.aboutM2Value, label: s.aboutM2Label },
    { stat: s.aboutM3Value, label: s.aboutM3Label },
    { stat: s.aboutM4Value, label: s.aboutM4Label }
  ];

  const WORKFLOW = [
    { step: "01", icon: FileCheck, title: s.aboutStep1Title, desc: s.aboutStep1Desc },
    { step: "02", icon: Sparkles, title: s.aboutStep2Title, desc: s.aboutStep2Desc },
    { step: "03", icon: Handshake, title: s.aboutStep3Title, desc: s.aboutStep3Desc }
  ];

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-900 pb-20">

      {/* Hero */}
      <div className="bg-gradient-to-b from-emerald-50 to-emerald-100 text-slate-900 relative pt-28 sm:pt-32 pb-14 md:pb-20 overflow-hidden border-b border-[#2E7D32]/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              <Award className="h-4 w-4" /> {s.aboutHeroBadge}
            </span>
          </div>
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {renderHighlighted(s.aboutHeroHeading, s.aboutHeroHighlight)}
          </h1>
          <p className="text-xs sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto leading-relaxed">
            {s.aboutHeroSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              onClick={onNavigateToInventory}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-lg shadow-[#2E7D32]/25 cursor-pointer"
            >
              {s.aboutBrowseButton} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={onBackToHome}
              className="bg-white/60 hover:bg-white/80 border border-[#2E7D32]/20 text-[#2E7D32] font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              {s.aboutBackButton}
            </Button>
          </div>
        </div>
      </div>

      {/* Milestone stats band */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-lg shadow-[#2E7D32]/5">
          {MILESTONES.map((m) => (
            <div key={m.label} className="text-center space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-[#2E7D32] tracking-tighter">{m.stat}</p>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Our story */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#2E7D32]/10 text-[#2E7D32] rounded-full text-[11px] font-black uppercase tracking-widest">
            <Target className="h-4 w-4" /> {s.aboutStoryBadge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight">
            {renderHighlighted(s.aboutStoryHeading, s.aboutStoryHighlight)}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {s.aboutStoryPara1}
          </p>
          {s.aboutStoryPara2 && (
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {s.aboutStoryPara2}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] shrink-0">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">{s.aboutVisionTitle}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{s.aboutVisionText}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">{s.aboutMissionTitle}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{s.aboutMissionText}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#F1F6F1] to-[#E4EEE6] rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden border border-[#2E7D32]/15">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#2E7D32]/10 via-transparent to-transparent pointer-events-none hidden md:block" />
          <Quote className="h-10 w-10 text-[#2E7D32]/30 mb-6" />
          <p className="text-lg md:text-2xl font-black leading-snug tracking-tight text-slate-900">
            {s.aboutQuoteText}
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="h-12 w-12 bg-[#2E7D32]/10 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-[#2E7D32]" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{s.aboutTeamLabel}</p>
              <p className="text-xs text-slate-500 font-semibold">{s.aboutTeamSubtitle}</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[#2E7D32]/10 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-slate-900">{s.aboutStat1Value}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{s.aboutStat1Label}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.aboutStat2Value}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{s.aboutStat2Label}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.aboutStat3Value}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{s.aboutStat3Label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <span className="inline-block bg-[#2E7D32]/10 text-[#2E7D32] px-3.5 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-full">
            WHAT WE STAND FOR
          </span>
          <h2 className="font-sans text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none">
            Our Core Values
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-lg hover:shadow-[#2E7D32]/5 hover:-translate-y-0.5 transition-all duration-300">
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

      {/* How we work */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <span className="inline-block bg-[#2E7D32]/10 text-[#2E7D32] px-3.5 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-full">
            <Sparkles className="h-3.5 w-3.5 inline mr-1" /> HOW WE WORK
          </span>
          <h2 className="font-sans text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none">
            Selling With 1stCars Is Effortless
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {WORKFLOW.map((w) => {
            const Icon = w.icon;
            return (
              <div key={w.step} className="relative bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-xs">
                <span className="absolute top-4 right-5 text-4xl font-black text-slate-100 select-none">{w.step}</span>
                <div className="p-3 rounded-xl bg-[#2E7D32] text-white w-fit shadow-md shadow-[#2E7D32]/25">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">{w.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{w.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Certification highlight */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-gradient-to-br from-[#F1F6F1] to-[#E4EEE6] rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 rounded-full text-[11px] font-black uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" /> 1STMARK CERTIFIED
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
                Every Car Passes Our <span className="text-[#2E7D32]">120-Point</span> Inspection
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                From chassis integrity and odometer verification to engine diagnostics and electronics, each vehicle is graded across 12 vital categories before it ever reaches our showroom floor.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Genuine odometer & RC documentation verification",
                  "Single-owner, non-accident frame guarantee",
                  "Mechanical, structural & electronics assessment",
                  "Transparent A+, A, B+, B, C vehicle grading"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#2E7D32] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Star, title: "120-Point", desc: "Certification Standard" },
                { icon: Gauge, title: "0 Hidden", desc: "Odometer Tampering" },
                { icon: Clock, title: "24Hr", desc: "Inspection Turnaround" },
                { icon: ShieldCheck, title: "100%", desc: "Verified Listings" }
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="bg-white border border-[#2E7D32]/10 rounded-2xl p-5 backdrop-blur-sm text-center space-y-1">
                    <Icon className="h-6 w-6 text-[#2E7D32] mx-auto" />
                    <p className="text-lg font-black text-slate-900 tracking-tight">{b.title}</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contact strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 md:p-10 shadow-xs">
          <div className="text-center space-y-3 max-w-xl mx-auto mb-8">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none">
              {s.aboutContactHeading}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {s.aboutContactSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Call Us</p>
                <p className="text-sm text-slate-600 font-medium">{s.aboutContactPhone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Email Us</p>
                <p className="text-sm text-slate-600 font-medium">{s.aboutContactEmail}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Visit Us</p>
                <p className="text-sm text-slate-600 font-medium">{s.aboutContactAddress}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
