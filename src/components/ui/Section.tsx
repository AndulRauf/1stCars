import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  bg?: "cream" | "dark" | "white" | "muted" | "primary";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAlign?: "left" | "center" | "right";
  containerClassName?: string;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    {
      className,
      bg = "cream",
      padding = "lg",
      title,
      subtitle,
      headerAlign = "left",
      containerClassName,
      children,
      ...props
    },
    ref
  ) => {
    const bgStyles = {
      cream: "bg-background text-slate-900",
      dark: "bg-[#0f172a] text-slate-100 border-t border-slate-900",
      white: "bg-white text-slate-900 border-y border-slate-100",
      muted: "bg-slate-50 text-slate-900 border-y border-slate-100",
      primary: "bg-primary text-white",
    };

    const paddingStyles = {
      none: "py-0",
      sm: "py-4 md:py-6",
      md: "py-8 md:py-10",
      lg: "py-10 md:py-14",
      xl: "py-12 md:py-18",
    };

    const alignmentClasses = {
      left: "text-left items-start",
      center: "text-center items-center",
      right: "text-right items-end",
    };

    return (
      <section
        ref={ref}
        className={cn("w-full relative overflow-hidden", bgStyles[bg], paddingStyles[padding], className)}
        {...props}
      >
        <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col w-full", containerClassName)}>
          {(title || subtitle) && (
            <div className={cn("flex flex-col mb-8 max-w-3xl", alignmentClasses[headerAlign], headerAlign === "center" && "mx-auto")}>
              {subtitle && (
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                  {subtitle}
                </span>
              )}
              {title && (
                <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter leading-none">
                  {title}
                </h2>
              )}
            </div>
          )}
          {children}
        </div>
      </section>
    );
  }
);

Section.displayName = "Section";

export { Section };
