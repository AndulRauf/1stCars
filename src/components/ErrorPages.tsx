import * as React from "react";
import { ShieldAlert, RefreshCw, Home, HelpCircle, PhoneCall } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

interface ErrorPageProps {
  onGoHome: () => void;
  onRetry?: () => void;
}

export function Error404Page({ onGoHome }: ErrorPageProps) {
  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-20 flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 text-center">
        <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-xs animate-bounce">
          <ShieldAlert className="h-10 w-10" />
        </div>
        
        <p className="text-xs font-black tracking-widest text-[#2E7D32] uppercase mb-3">
          Error Code: 404 — Page Unavailable
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-4">
          Lost Your <span className="text-[#2E7D32]">Coordinates?</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-10">
          The curated masterpiece or dashboard view you are trying to access has been moved, archived, or is currently undergoing private mechanical valuation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={onGoHome}
            className="w-full sm:w-auto bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-[#2E7D32]/10 flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> Go Back Home
          </Button>
          <a
            href="#contact-section"
            className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <PhoneCall className="h-4 w-4 text-[#2E7D32]" /> Contact Concierge
          </a>
        </div>
      </div>
    </div>
  );
}

export function Error500Page({ onGoHome, onRetry }: ErrorPageProps) {
  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-20 flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 text-center">
        <div className="w-20 h-20 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-8 shadow-xs animate-pulse">
          <HelpCircle className="h-10 w-10" />
        </div>
        
        <p className="text-xs font-black tracking-widest text-amber-600 uppercase mb-3">
          Error Code: 500 — Transmission Failed
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-4">
          Engine <span className="text-amber-600">Stalled</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-10">
          Our cloud servers encountered a temporary mechanical transmission fault. Our senior technical inspectors have been dispatched to restart the fleet.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="w-full sm:w-auto bg-[#2E7D32] hover:bg-[#25632a] text-white font-extrabold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-[#2E7D32]/10 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Try Reconnecting
            </Button>
          )}
          <Button
            onClick={onGoHome}
            variant="outline"
            className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-xs tracking-widest uppercase px-8 py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> Return to Showroom
          </Button>
        </div>
      </div>
    </div>
  );
}
