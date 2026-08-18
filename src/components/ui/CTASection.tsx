import * as React from "react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

export interface CTASectionCta {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost";
  icon?: React.ReactNode;
}

export interface CTASectionProps {
  badge?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  ctas?: CTASectionCta[];
  className?: string;
}

// Shared closing CTA band — dark slate gradient with green accents, the same
// visual language as the home page concierge CTA section.
export function CTASection({ badge, title, subtitle, ctas, className }: CTASectionProps) {
  return (
    <section
      className={cn(
        "relative py-12 md:py-16 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden mt-16 sm:mt-20",
        className
      )}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-[#2E7D32]/5 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6 animate-fade-up">
        <div className="space-y-4 max-w-2xl mx-auto">
          {badge && (
            <span className="inline-block bg-[#2E7D32] text-white px-3.5 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-full shadow-md shadow-[#2E7D32]/25">
              {badge}
            </span>
          )}
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white leading-none">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 font-semibold max-w-lg mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {ctas && ctas.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {ctas.map((cta, i) => {
              const classes =
                cta.variant === "ghost"
                  ? "bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs tracking-wider uppercase px-7 py-3.5 rounded-full backdrop-blur-md transition-all cursor-pointer"
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
    </section>
  );
}