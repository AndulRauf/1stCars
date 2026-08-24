import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface SectionHeaderProps {
  badge?: React.ReactNode;
  badgeIcon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}

// Shared section heading block — pill badge, black tracking-tight title and a
// muted subtitle, matching the section headers on the strongest pages.
export function SectionHeader({ badge, badgeIcon, title, subtitle, align = "center", className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "space-y-3 max-w-2xl",
        align === "center" ? "text-center mx-auto" : "text-left",
        className
      )}
    >
      {badge && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 bg-[#2E7D32]/10 text-[#2E7D32] px-3.5 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-full",
            align === "center" && "justify-center"
          )}
        >
          {badgeIcon}
          {badge}
        </span>
      )}
      <h2 className="font-sans text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}