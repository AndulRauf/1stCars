import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NavSection, NavItem, CMSModule } from "./adminNavData";

interface SidebarSectionProps {
  section: NavSection;
  activeModule: CMSModule;
  onSelectModule: (id: CMSModule) => void;
  isCollapsed: boolean;
  searchQuery: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function SidebarSection({
  section,
  activeModule,
  onSelectModule,
  isCollapsed,
  searchQuery,
  isExpanded,
  onToggleExpand,
}: SidebarSectionProps) {
  // Filter items if searching
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return section.items;
    const q = searchQuery.toLowerCase().trim();
    return section.items.filter(
      item =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        section.title.toLowerCase().includes(q)
    );
  }, [section, searchQuery]);

  if (filteredItems.length === 0) return null;

  // Force expand if searching
  const shouldExpand = searchQuery.trim().length > 0 || isExpanded;

  return (
    <div className="mb-2">
      {/* Section Header */}
      {!isCollapsed ? (
        <button
          onClick={onToggleExpand}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#2E7D32] transition-colors rounded-lg group cursor-pointer"
        >
          <span className="flex items-center gap-1.5 group-hover:text-[#2E7D32]">
            {section.title}
          </span>
          {shouldExpand ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2E7D32]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2E7D32]" />
          )}
        </button>
      ) : (
        <div className="my-1 border-t border-[#2E7D32]/20" />
      )}

      {/* Section Items */}
      {(shouldExpand || isCollapsed) && (
        <div className="mt-1 space-y-0.5">
          {filteredItems.map(item => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  isCollapsed ? "justify-center" : "justify-between"
                } ${
                  isActive
                    ? "bg-[#2E7D32] text-white shadow-lg shadow-[#2E7D32]/25 font-black"
                    : "text-slate-600 hover:bg-[#2E7D32]/10 hover:text-[#2E7D32]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive ? "text-white scale-110" : "text-slate-400 group-hover:text-[#2E7D32]"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
