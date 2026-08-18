import * as React from "react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

export interface PageHeroCta {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
}

export interface PageHeroProps {
  label?: React.ReactNode;
  labelIcon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  ctas?: PageHeroCta[];
  className?: string;
}

// Shared inner-page hero — the exact recipe used by the Buy Cars, Sell Car and
// 1stMark Certification pages: soft green gradient, blurred accents, pill
// label, black tracking-tight headline, pill CTAs.
export function PageHero({ label, labelIcon, title, subtitle, ctas, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-b from-emerald-50 to-emerald-100 text-slate-900 relative pt-24 sm:pt-28 pb-12 md:pb-16 overflow-hidden border-b border-[#2E7D32]/20",
        className
      )}
    >
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-5 animate-fade-up">
        {label && (
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              {labelIcon}
              {label}
            </span>
          </div>
        )}

        <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xs sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}

        {ctas && ctas.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {ctas.map((cta, i) => {
              const classes =
                cta.variant === "secondary"
                  ? "bg-white/60 hover:bg-white/80 border border-[#2E7D32]/20 text-[#2E7D32] font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full backdrop-blur-md transition-all cursor-pointer"
                  : "bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full shadow-lg shadow-[#2E7D32]/25 cursor-pointer";
              if (cta.href) {
                return (
                  <a key={i} href={cta.href} className={cn("inline-flex items-center justify-center gap-2", classes)}>
                    {cta.icon}
                    {cta.label}
                  </a>
                );
              }
              return (
                <Button key={i} onClick={cta.onClick} className={classes}>
                  {cta.icon}
                  {cta.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}