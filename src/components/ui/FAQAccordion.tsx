import * as React from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { FaqItem } from "@/src/lib/pageContentDefaults";

export interface FAQAccordionProps {
  items: FaqItem[];
  className?: string;
}

// Preferred display order for FAQ categories; unknown categories (added via the
// Admin Panel) are appended after these, still alphabetically among themselves.
const CATEGORY_ORDER = ["Buying", "Selling", "Inspection", "Payments", "General"];

function normalizeCategory(category: string): string {
  const c = (category || "General").trim();
  return c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : "General";
}

// Clean premium accordion: category pills (scrollable on mobile), one item open
// at a time, plus/minus indicator and a smooth height transition.
export function FAQAccordion({ items, className }: FAQAccordionProps) {
  const categories = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of items) {
      const cat = normalizeCategory(item.category);
      if (!seen.has(cat)) {
        seen.add(cat);
        list.push(cat);
      }
    }
    return list.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? CATEGORY_ORDER.length : ia) - (ib === -1 ? CATEGORY_ORDER.length : ib);
    });
  }, [items]);

  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const visibleItems =
    activeCategory === "All"
      ? items
      : items.filter((i) => normalizeCategory(i.category) === activeCategory);

  return (
    <div className={cn("w-full", className)}>
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center scrollbar-none">
          {["All", ...categories].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border",
                  isActive
                    ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-md shadow-[#2E7D32]/10"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#2E7D32]/40 hover:text-[#2E7D32]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {visibleItems.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <HelpCircle className="h-10 w-10 text-[#2E7D32]/30 mx-auto mb-4" />
            <p className="text-sm font-black text-slate-700">No questions in this category yet.</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Questions added in the Admin Panel → Edit Pages → FAQ will appear here.
            </p>
          </div>
        )}

        {visibleItems.map((f) => {
          const open = openId === f.id;
          return (
            <div
              key={f.id}
              className={cn(
                "bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-300",
                open ? "border-[#2E7D32]/25 shadow-md shadow-[#2E7D32]/5" : "border-slate-200/80"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#2E7D32]">
                    {f.category}
                  </span>
                  <p className="text-sm font-black text-slate-900 mt-0.5 leading-snug">{f.question}</p>
                </div>
                <span
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border",
                    open
                      ? "bg-[#2E7D32] border-[#2E7D32] text-white"
                      : "bg-[#2E7D32]/5 border-[#2E7D32]/15 text-[#2E7D32]"
                  )}
                >
                  {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </span>
              </button>

              <div
                className={cn(
                  "grid transition-all duration-300 ease-out motion-reduce:transition-none",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 sm:px-6 pb-5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    {f.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}