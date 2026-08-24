import * as React from "react";
import { ChevronRight, Home, RefreshCw } from "lucide-react";
import { CMSModule, getSectionAndItemForModule } from "./adminNavData";
import { Button } from "@/src/components/ui/Button";

interface BreadcrumbProps {
  activeModule: CMSModule;
  onReload?: () => void;
  isLoading?: boolean;
}

export function Breadcrumb({ activeModule, onReload, isLoading }: BreadcrumbProps) {
  const { sectionTitle, itemLabel, itemIcon: Icon } = getSectionAndItemForModule(activeModule);

  return (
    <div className="bg-slate-900 border-b border-slate-800/80 text-white px-4 py-2.5 sm:px-5 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Home className="h-3.5 w-3.5 text-slate-400" />
          <span>Admin</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
        <span className="text-slate-400 uppercase text-[10px] font-black tracking-wider">
          {sectionTitle}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
        <div className="flex items-center gap-1.5 bg-[#ff5a07]/10 text-[#ff5a07] border border-[#ff5a07]/30 px-2.5 py-1 rounded-lg font-black uppercase text-[11px] tracking-wider">
          {Icon && <Icon className="h-3.5 w-3.5 text-[#ff5a07]" />}
          <span>{itemLabel}</span>
        </div>
      </div>

      {onReload && (
        <Button
          onClick={onReload}
          size="sm"
          className="h-8 text-[10px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg px-3 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 text-[#ffb81e] ${isLoading ? "animate-spin" : ""}`} />
          <span>Reload Engine</span>
        </Button>
      )}
    </div>
  );
}
