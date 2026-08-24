import * as React from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { isHiddenPage } from "@/src/lib/utils";
import Markdown from "react-markdown";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { FaqLanding } from "@/src/components/FaqLanding";

interface CustomPageViewProps {
  pageId: string | null;
  onBackToHome: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToSell?: () => void;
}

export function CustomPageView({ pageId, onBackToHome, onNavigateToInventory, onNavigateToSell }: CustomPageViewProps) {
  const [page, setPage] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchPage() {
      if (!pageId) {
        setError("Invalid Page Request.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("pages")
          .select()
          .eq("id", pageId)
          .single();

        if (err || !data || isHiddenPage(data)) {
          setError("This page could not be located or may have been deleted.");
        } else {
          setPage(data);
        }
      } catch (e) {
        setError("An unexpected error occurred loading page content.");
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [pageId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-slate-50/50 py-16">
        <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-500 uppercase tracking-widest mt-6 animate-pulse">
          Loading Page...
        </p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center bg-slate-50/50 py-16 px-4 text-center">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Page Not Found</h3>
        <p className="text-sm text-slate-500 max-w-md mt-2 mb-8 font-semibold">
          {error || "The page you are trying to reach is not available."}
        </p>
        <Button onClick={onBackToHome} className="bg-emerald-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-full px-8 py-3.5">
          Return to Marketplace
        </Button>
      </div>
    );
  }

  // Render the redesigned FAQ landing for the dedicated route (pageId "p-faq")
  // AND for any page reached by slug (e.g. the footer/nav link that uses the
  // page's UUID), so the redesign applies no matter how the page is opened.
  const isFaqPage =
    pageId === "p-faq" ||
    (page && typeof page.slug === "string" && /faq/i.test(page.slug));

  if (isFaqPage) {
    return (
      <FaqLanding
        page={page}
        onBackToHome={onBackToHome}
        onNavigateToInventory={onNavigateToInventory}
        onNavigateToSell={onNavigateToSell}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-emerald-50 to-emerald-100 text-slate-900 relative pt-24 sm:pt-28 pb-12 md:pb-16 overflow-hidden border-b border-[#2E7D32]/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-5">
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> 1STCARS
            </span>
          </div>
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {page.title}
          </h1>
          {page.meta_description && (
            <p className="text-xs sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto leading-relaxed">
              {page.meta_description}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Back Link */}
        <button
          onClick={onBackToHome}
          className="inline-flex items-center text-xs font-black uppercase tracking-widest text-emerald-800 hover:text-emerald-950 transition-colors mb-6 cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Marketplace
        </button>

        {/* Dynamic Rich Text Body */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-10 shadow-lg shadow-slate-200/30">
          <div className="prose max-w-none text-slate-700 leading-relaxed font-semibold text-sm space-y-6">
            <Markdown>{page.content}</Markdown>
          </div>
        </div>

      </div>
    </div>
  );
}
