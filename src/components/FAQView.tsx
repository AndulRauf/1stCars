import * as React from "react";
import { HelpCircle } from "lucide-react";
import { PageHero } from "@/src/components/ui/PageHero";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { FAQAccordion } from "@/src/components/ui/FAQAccordion";
import { CTASection } from "@/src/components/ui/CTASection";
import { getPageContent, PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_UPDATED_EVENT, FaqItem, DEFAULT_FAQ_ITEMS, PAGE_CONTENT_STORAGE_KEY } from "@/src/lib/pageContentDefaults";
import { supabase } from "@/src/lib/supabaseClient";

interface FAQViewProps {
  onBackToHome: () => void;
  onNavigateToInventory: () => void;
  onNavigateToSell?: () => void;
}

function loadFaqs(): FaqItem[] {
  try {
    const raw = localStorage.getItem("1stcars_cms_faqs");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to parse FAQ items from storage", e);
  }
  return DEFAULT_FAQ_ITEMS;
}

export function FAQView({ onBackToHome, onNavigateToInventory, onNavigateToSell }: FAQViewProps) {
  const [s, setS] = React.useState<Record<string, string>>(PAGE_CONTENT_DEFAULTS);
  const [faqs, setFaqs] = React.useState<FaqItem[]>([]);
  const [openId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const applyLocal = () => {
      setS(getPageContent());
      setFaqs(loadFaqs());
    };

    const fetchFromSupabase = async () => {
      // Headings / subtitle are stored in settings.website_settings — mirror App.tsx sync
      // so a direct /faq load (before App sync) also shows fresh copy.
      try {
        const { data: settingsRow } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "website_settings")
          .maybeSingle();
        if (!cancelled && settingsRow?.value) {
          try {
            const parsed = JSON.parse(settingsRow.value as unknown as string);
            // Persist to local cache so getPageContent() picks it up cross-tab
            localStorage.setItem(PAGE_CONTENT_STORAGE_KEY, JSON.stringify(parsed));
            setS(getPageContent(parsed));
          } catch {}
        }
      } catch {}

      // Q&A rows are source-of-truth in public.faq — previously FAQView was
      // localStorage-only, so edits on another device/browser never appeared.
      try {
        const { data, error } = await supabase.from("faq").select("id, category, question, answer, display_order");
        if (!cancelled && !error && data && data.length > 0) {
          // Respect display_order when present
          const sorted = [...data].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
          const mapped: FaqItem[] = sorted.map((q: any) => ({
            id: String(q.id),
            category: q.category || "General",
            question: String(q.question || ""),
            answer: String(q.answer || ""),
          }));
          if (mapped.length > 0) {
            setFaqs(mapped);
            try {
              localStorage.setItem("1stcars_cms_faqs", JSON.stringify(mapped));
            } catch {}
          }
        }
      } catch {}
    };

    applyLocal();
    fetchFromSupabase();

    // Live updates: in-tab event + cross-tab storage + focus polling
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "1stcars_cms_faqs" || e.key === PAGE_CONTENT_STORAGE_KEY) {
        applyLocal();
        fetchFromSupabase();
      }
    };
    const handleFocus = () => fetchFromSupabase();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchFromSupabase();
    };

    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, applyLocal);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // Light polling for environments without realtime (covers CDN/Vercel cache)
    const interval = window.setInterval(fetchFromSupabase, 30_000);

    // Supabase Realtime subscription (no-op on mock, safe to ignore errors)
    let channel: any = null;
    try {
      if ((supabase as any).channel) {
        channel = (supabase as any)
          .channel("faq-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "faq" }, () => fetchFromSupabase())
          .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => fetchFromSupabase())
          .subscribe();
      }
    } catch {}

    return () => {
      cancelled = true;
      window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, applyLocal);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
      try {
        if (channel) (supabase as any).removeChannel?.(channel);
      } catch {}
    };
  }, []);

  const handleSellClick = () => {
    if (onNavigateToSell) {
      onNavigateToSell();
    } else {
      onBackToHome();
    }
  };

  return (
    <div className="bg-background min-h-screen text-slate-900">
      {/* Hero */}
      <PageHero
        label="1STCARS HELP CENTER"
        labelIcon={<HelpCircle className="h-4 w-4" />}
        title={s.faqPageHeading}
        subtitle={s.faqPageSubheading}
        ctas={[
          { label: "Browse Certified Cars", onClick: onNavigateToInventory },
          { label: "Back to Home", onClick: onBackToHome, variant: "secondary" }
        ]}
      />

      {/* FAQ Categories + Accordion */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <SectionHeader
          badge="QUICK ANSWERS"
          title="Frequently asked questions"
          subtitle="Everything buyers and sellers ask about certified cars, inspections, payments and ownership — organised by topic."
        />
        <div className="max-w-3xl mx-auto mt-10">
          <FAQAccordion items={faqs} className="animate-fade-up" />
        </div>
      </div>

      {/* Closing CTA */}
      <CTASection
        badge="STILL NEED HELP?"
        title="We're here to help you make the right move."
        subtitle="Browse our certified inventory, start selling your car, or reach out through the contact options on the website."
        ctas={[
          { label: "Explore Cars", onClick: onNavigateToInventory },
          { label: "Sell Your Car", onClick: handleSellClick, variant: "ghost" }
        ]}
      />
    </div>
  );
}
