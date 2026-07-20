import * as React from "react";
import { supabase } from "@/src/lib/supabaseClient";
import Markdown from "react-markdown";
import { ArrowLeft, BookOpen, Clock, FileText, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

interface CustomPageViewProps {
  pageId: string | null;
  onBackToHome: () => void;
}

export function CustomPageView({ pageId, onBackToHome }: CustomPageViewProps) {
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

        if (err || !data) {
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
          Retrieving Vetted CMS Page...
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

  return (
    <div className="min-h-screen bg-[#F8F6F0] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <button
          onClick={onBackToHome}
          className="inline-flex items-center text-xs font-black uppercase tracking-widest text-emerald-800 hover:text-emerald-950 transition-colors mb-6 cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Marketplace
        </button>

        {/* Hero Section Container */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-600/10 text-emerald-800">
                ⭐ Verified CMS Page
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" /> Updated Just Now
              </span>
            </div>

            <h1 className="font-sans text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              {page.title}
            </h1>

            {page.meta_description && (
              <p className="text-sm md:text-base text-slate-500 font-semibold leading-relaxed border-l-4 border-emerald-600/30 pl-4 py-1 italic">
                {page.meta_description}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Rich Text Body */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-10 shadow-lg shadow-slate-200/30">
          <div className="prose max-w-none text-slate-700 leading-relaxed font-semibold text-sm space-y-6">
            <Markdown>{page.content}</Markdown>
          </div>
        </div>

        {/* Footer Accent */}
        <div className="mt-12 text-center">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            🏎️ 1stCars Luxury pre-owned standards • Vetted Document
          </p>
        </div>

      </div>
    </div>
  );
}
