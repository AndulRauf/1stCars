import * as React from "react";
import { HelpCircle, Search, ChevronDown, ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import { PageHero } from "@/src/components/ui/PageHero";
import { CTASection } from "@/src/components/ui/CTASection";
import { cn } from "@/src/lib/utils";
import { getPageContent, PAGE_CONTENT_UPDATED_EVENT } from "@/src/lib/pageContentDefaults";
import { supabase } from "@/src/lib/supabaseClient";

interface FaqLandingProps {
  page: {
    title?: string;
    meta_description?: string | null;
    content?: string | null;
  };
  onBackToHome: () => void;
}

interface ParsedFaq {
  category: string;
  question: string;
  answer: string;
}

// Parse the FAQ page's Markdown into structured Q&A. The existing page content
// uses `##` for category headings and `###` for individual questions; we keep
// the exact wording (no invented content) and only restructure the presentation.
function parseFaqContent(md: string): ParsedFaq[] {
  const lines = md.split(/\r?\n/);
  let category = "General";
  const items: ParsedFaq[] = [];
  let current: ParsedFaq | null = null;

  const pushCurrent = () => {
    if (current && (current.question.trim() || current.answer.trim())) {
      items.push({ ...current, answer: current.answer.trim() });
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1}\s+/.test(line)) {
      // Page title (h1) — already shown in the hero, skip it.
      pushCurrent();
      current = null;
      continue;
    }
    if (/^##\s+/.test(line)) {
      // Category heading (h2) — starts a new group.
      pushCurrent();
      current = null;
      category = line.replace(/^##\s+/, "").trim();
      continue;
    }
    if (/^###\s+/.test(line)) {
      // Question heading (h3+).
      pushCurrent();
      current = {
        category,
        question: line.replace(/^###\s+/, "").replace(/^\d+[\.\)]\s*/, "").trim(),
        answer: "",
      };
      continue;
    }
    if (current) {
      current.answer += (current.answer ? "\n" : "") + line;
    }
  }
  pushCurrent();
  return items;
}

const CATEGORY_ORDER = ["Buying", "Selling", "Inspection", "Payments", "General"];

function normalizeCategory(category: string): string {
  const c = (category || "General").trim();
  return c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : "General";
}

export function FaqLanding({ page, onBackToHome }: FaqLandingProps) {
  // The `faq` table (admin-managed) is the source of truth for the Q&A.
  // We fall back to the p-faq page markdown only when the table has no rows yet.
  const [faqRows, setFaqRows] = React.useState<ParsedFaq[] | null>(null);

  // Hero copy is admin-editable via website_settings (faqPageHeading /
  // faqPageSubheading). Mirror the rest of the site (AboutUsView, etc.) so the
  // CMS actually drives the FAQ hero instead of hard-coded strings — the old
  // FAQView used these, but the rewritten FaqLanding dropped them.
  const [settings, setSettings] = React.useState<Record<string, string>>(() => getPageContent());

  React.useEffect(() => {
    const apply = () => setSettings(getPageContent());
    apply();
    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
    return () => window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
  }, []);

  const faqHeading = settings.faqPageHeading || "Frequently Asked Questions";
  const faqSubheading =
    settings.faqPageSubheading ||
    page.meta_description ||
    "Find quick answers about buying, selling and certifying cars with 1stCars.";

  React.useEffect(() => {
    let cancelled = false;

    const applyRows = (rows: any[]) => {
      if (!cancelled && rows && rows.length > 0) {
        const sorted = [...rows].sort(
          (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );
        setFaqRows(
          sorted.map((q: any) => ({
            category: q.category || "General",
            question: String(q.question || ""),
            answer: String(q.answer || ""),
          }))
        );
      }
    };

    const fetchFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("faq")
          .select("id, category, question, answer, display_order");
        if (!cancelled && !error && data && data.length > 0) applyRows(data);
      } catch {}
    };

    fetchFromSupabase();

    // Stay in sync with admin edits (realtime + light polling for CDN/Vercel cache).
    let channel: any = null;
    try {
      if ((supabase as any).channel) {
        channel = (supabase as any)
          .channel("faq-landing-live")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "faq" },
            () => fetchFromSupabase()
          )
          .subscribe();
      }
    } catch {}
    const interval = window.setInterval(fetchFromSupabase, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      try {
        if (channel) (supabase as any).removeChannel?.(channel);
      } catch {}
    };
  }, []);

  const parsed = React.useMemo(() => {
    if (faqRows && faqRows.length > 0) return faqRows;
    return page.content ? parseFaqContent(page.content) : [];
  }, [faqRows, page.content]);

  // If there's genuinely no FAQ content, fall back to the raw Markdown render.
  if (parsed.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <PageHero
          label="1STCARS HELP CENTER"
          labelIcon={<HelpCircle className="h-4 w-4" />}
          title={faqHeading}
          subtitle={faqSubheading}
          ctas={[{ label: "Back to Home", onClick: onBackToHome, variant: "secondary" }]}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-10 shadow-lg shadow-slate-200/30">
            <div className="prose max-w-none text-slate-700 leading-relaxed font-semibold text-sm space-y-6">
              <Markdown>{page.content || ""}</Markdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of parsed) {
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
  }, [parsed]);

  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [query, setQuery] = React.useState("");
  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const visibleItems = parsed
    .filter((i) => activeCategory === "All" || normalizeCategory(i.category) === activeCategory)
    .filter(
      (i) =>
        !q ||
        i.question.toLowerCase().includes(q) ||
        i.answer.toLowerCase().includes(q)
    );

  return (
    <div className="bg-background min-h-screen text-slate-900">
      {/* Hero */}
      <PageHero
        label="1STCARS HELP CENTER"
        labelIcon={<HelpCircle className="h-4 w-4" />}
        title={faqHeading}
        subtitle={faqSubheading}
        ctas={[
          { label: "Browse Cars", onClick: onBackToHome },
          { label: "Back to Home", onClick: onBackToHome, variant: "secondary" },
        ]}
      />

      {/* Search + Category filter */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32]/40 transition-all"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
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
      </div>

      {/* Accordion */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {visibleItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <HelpCircle className="h-10 w-10 text-[#2E7D32]/30 mx-auto mb-4" />
            <p className="text-sm font-black text-slate-700">No questions match your search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("All");
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#2E7D32] hover:text-[#25632a] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((f, idx) => {
              const id = `${normalizeCategory(f.category)}-${idx}`;
              const open = openIds.has(id);
              return (
                <div
                  key={id}
                  className={cn(
                    "bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-300",
                    open ? "border-[#2E7D32]/25 shadow-md shadow-[#2E7D32]/5" : "border-slate-200/80"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      {normalizeCategory(f.category) !== "General" && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#2E7D32]">
                          {normalizeCategory(f.category)}
                        </span>
                      )}
                      <p className="text-sm font-black text-slate-900 mt-0.5 leading-snug">{f.question}</p>
                    </div>
                    <span
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border",
                        open
                          ? "bg-[#2E7D32] border-[#2E7D32] text-white rotate-180"
                          : "bg-[#2E7D32]/5 border-[#2E7D32]/15 text-[#2E7D32]"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>

                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-out motion-reduce:transition-none",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 prose prose-sm max-w-none text-slate-600 font-medium leading-relaxed">
                        <Markdown>{f.answer}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <CTASection
        badge="STILL HAVE QUESTIONS?"
        title="Still have questions? Get in touch with us."
        subtitle="Our team is happy to help you with anything about buying, selling or certifying your car."
        ctas={[
          {
            label: "Contact Support",
            onClick: () => {
              window.location.href = "mailto:support@1stcars.com";
            },
          },
          { label: "Back to Home", onClick: onBackToHome, variant: "ghost" },
        ]}
      />
    </div>
  );
}
