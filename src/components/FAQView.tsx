import * as React from "react";
import { HelpCircle } from "lucide-react";
import { PageHero } from "@/src/components/ui/PageHero";
import { FAQAccordion } from "@/src/components/ui/FAQAccordion";
import { CTASection } from "@/src/components/ui/CTASection";
import { getPageContent, PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_UPDATED_EVENT, FaqItem, DEFAULT_FAQ_ITEMS } from "@/src/lib/pageContentDefaults";

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

  React.useEffect(() => {
    const apply = () => {
      setS(getPageContent());
      setFaqs(loadFaqs());
    };
    apply();
    window.addEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
    return () => window.removeEventListener(PAGE_CONTENT_UPDATED_EVENT, apply);
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <FAQAccordion items={faqs} className="animate-fade-up" />
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