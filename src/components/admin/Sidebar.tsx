import * as React from "react";
import { 
  Search, PanelLeftClose, PanelLeftOpen, ShieldCheck, 
  X, Sparkles, RefreshCw
} from "lucide-react";
import { ADMIN_NAV_SECTIONS, CMSModule } from "./adminNavData";
import { SidebarSection } from "./SidebarSection";

interface SidebarProps {
  activeModule: CMSModule;
  onSelectModule: (module: CMSModule) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onReloadData?: () => void;
  isLoadingData?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeModule,
  onSelectModule,
  isMobileOpen = false,
  onCloseMobile,
  onReloadData,
  isLoadingData,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse
}: SidebarProps) {
  // Collapsed desktop state saved in localStorage
  const [internalIsCollapsed, setInternalIsCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_admin_sidebar_collapsed");
      return stored === "true";
    }
    return false;
  });

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;

  // Track expanded state for each section
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_admin_section_expansions");
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { /* ignore */ }
      }
    }
    // Default all sections expanded
    return {
      "Overview": true,
      "Inventory": true,
      "Leads & Sales": true,
      "People & Access": true,
      "Quality & Trust": true,
      "Finance & Operations": true,
      "Site & Content": true
    };
  });

  // Search filter box
  const [searchQuery, setSearchQuery] = React.useState("");

  const toggleCollapse = () => {
    if (externalOnToggleCollapse) {
      externalOnToggleCollapse();
    } else {
      const next = !internalIsCollapsed;
      setInternalIsCollapsed(next);
      localStorage.setItem("1stcars_admin_sidebar_collapsed", String(next));
    }
  };

  const toggleSectionExpand = (sectionTitle: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      localStorage.setItem("1stcars_admin_section_expansions", JSON.stringify(next));
      return next;
    });
  };

  const handleSelect = (mod: CMSModule) => {
    onSelectModule(mod);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs lg:hidden transition-opacity" 
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#F8F6F0] border-r border-[#2E7D32]/20 text-slate-800 transition-all duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2E7D32]/20 bg-white/60 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#2E7D32] to-[#4CAF50] p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <div className="h-full w-full bg-[#F8F6F0] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[#2E7D32]" />
              </div>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-sans font-black text-base text-[#2E7D32] tracking-wider flex items-center gap-1.5 leading-none">
                  1stCars <span className="text-[#2E7D32] font-extrabold text-xs">CMS</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#2E7D32]/60 mt-1">
                  Master Admin Panel
                </span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="hidden lg:flex p-2 text-slate-400 hover:text-[#2E7D32] hover:bg-[#2E7D32]/10 rounded-xl transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 text-[#2E7D32]" />
            ) : (
              <PanelLeftClose className="h-5 w-5 text-slate-400 hover:text-[#2E7D32]" />
            )}
          </button>

          {/* Mobile Close Button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 text-slate-400 hover:text-[#2E7D32] rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick Search Box */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-3 border-b border-[#2E7D32]/15 bg-white/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full bg-white border border-[#2E7D32]/20 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Accordion Nav Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-[#2E7D32]/20">
          {ADMIN_NAV_SECTIONS.map(section => (
            <SidebarSection
              key={section.title}
              section={section}
              activeModule={activeModule}
              onSelectModule={handleSelect}
              isCollapsed={isCollapsed && !isMobileOpen}
              searchQuery={searchQuery}
              isExpanded={!!expandedSections[section.title]}
              onToggleExpand={() => toggleSectionExpand(section.title)}
            />
          ))}
        </div>

        {/* Sidebar Footer / System Engine Status */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-3 m-3 bg-white/60 border border-[#2E7D32]/20 rounded-2xl shrink-0 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Engine Ready</span>
            </div>
            {onReloadData && (
              <button
                onClick={onReloadData}
                disabled={isLoadingData}
                title="Refresh CMS Data"
                className="p-1.5 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 text-[#2E7D32] rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#2E7D32] ${isLoadingData ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
