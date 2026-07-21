import * as React from "react";
import { Search, SlidersHorizontal, Grid, List, RotateCcw, ChevronLeft, ChevronRight, Fuel, ShieldAlert, Check, Share2 } from "lucide-react";
import { Car, FilterState } from "@/src/types";
import { CARS_DATA, FAMOUS_BRANDS, BUDGET_RANGES, CITIES_DATA } from "@/src/data/cars";
import { CarCard } from "./CarCard";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { cn } from "@/src/lib/utils";
import { toast } from "@/src/lib/toast";

interface BuyCarsViewProps {
  onViewDetails: (id: string) => void;
  savedCars: string[];
  onSaveToggle: (id: string, model: string) => void;
  selectedCity?: string;
  onCityChange?: (city: string) => void;
  initialBrand?: string;
  initialModel?: string;
  initialSearch?: string;
}

const ITEMS_PER_PAGE = 3;

export function BuyCarsView({
  onViewDetails,
  savedCars,
  onSaveToggle,
  selectedCity,
  onCityChange,
  initialBrand,
  initialModel,
  initialSearch,
}: BuyCarsViewProps) {
  const [settings, setSettings] = React.useState({
    buyCarsHeadingText: "Explore Our Handpicked Certified Fleet",
    buyCarsSubheadingText: "Every vehicle on this list is fully vetted and owned directly by 1stCars. Enjoy straightforward pricing, single-owner status, certified non-accident frames, and instant deliveries."
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse website settings in BuyCarsView", e);
        }
      }
    }

    const handleUpdate = () => {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
    };

    window.addEventListener("1stcars_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("1stcars_settings_updated", handleUpdate);
    };
  }, []);

  // Filter States
  const [filters, setFilters] = React.useState<FilterState>({
    search: initialSearch || "",
    brand: initialBrand || "All",
    fuel: "All",
    transmission: "All",
    budgetMin: 0,
    budgetMax: 1000000,
    yearMin: 2020,
    yearMax: 2024,
    city: "All Cities",
  });

  // Sync initial parameters when route changes
  React.useEffect(() => {
    if (initialBrand || initialSearch) {
      setFilters(prev => ({
        ...prev,
        brand: initialBrand || prev.brand,
        search: initialSearch || (initialModel ? `${initialBrand || ''} ${initialModel}` : prev.search)
      }));
    }
  }, [initialBrand, initialModel, initialSearch]);

  // UI Settings States
  const [isListView, setIsListView] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<string>("featured");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showFiltersMobile, setShowFiltersMobile] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Sync prop city to local filter state
  React.useEffect(() => {
    if (selectedCity) {
      setFilters((prev) => ({ ...prev, city: selectedCity }));
    }
  }, [selectedCity]);

  // Trigger loading skeleton on filter and sort change
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters, sortBy]);

  // Filter Reset Handlers
  const handleResetFilters = () => {
    setFilters({
      search: "",
      brand: "All",
      fuel: "All",
      transmission: "All",
      budgetMin: 0,
      budgetMax: 1000000,
      yearMin: 2020,
      yearMax: 2024,
      city: "All Cities",
    });
    setSortBy("featured");
    setCurrentPage(1);
    onCityChange?.("All Cities");
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset page on filter alteration
    if (key === "city") {
      onCityChange?.(value);
    }
  };

  const handleBudgetRangeChange = (label: string) => {
    const foundRange = BUDGET_RANGES.find((r) => r.label === label);
    if (foundRange) {
      setFilters((prev) => ({
        ...prev,
        budgetMin: foundRange.min,
        budgetMax: foundRange.max,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        budgetMin: 0,
        budgetMax: 1000000,
      }));
    }
    setCurrentPage(1);
  };

  // Filter and Sort Engine
  const filteredAndSortedCars = React.useMemo(() => {
    let result = [...CARS_DATA];

    // Search query match (model or brand or features)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (car) =>
          car.brand.toLowerCase().includes(q) ||
          car.model.toLowerCase().includes(q) ||
          car.specifications.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Brand filter
    if (filters.brand !== "All") {
      result = result.filter((car) => car.brand === filters.brand);
    }

    // Fuel filter
    if (filters.fuel !== "All") {
      result = result.filter((car) => car.fuel === filters.fuel);
    }

    // Transmission filter
    if (filters.transmission !== "All") {
      result = result.filter((car) => car.transmission === filters.transmission);
    }

    // Budget range filter
    result = result.filter(
      (car) => car.price >= filters.budgetMin && car.price <= filters.budgetMax
    );

    // Year range filter
    result = result.filter(
      (car) => car.year >= filters.yearMin && car.year <= filters.yearMax
    );

    // City filter
    if (filters.city !== "All Cities") {
      result = result.filter((car) => car.cities?.includes(filters.city));
    }

    // Sorting Engine
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "year_desc") {
      result.sort((a, b) => b.year - a.year);
    } else if (sortBy === "mileage_asc") {
      result.sort((a, b) => a.mileage - b.mileage);
    }

    return result;
  }, [filters, sortBy]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredAndSortedCars.length / ITEMS_PER_PAGE) || 1;
  const paginatedCars = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCars.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedCars, currentPage]);

  // Fuel options
  const fuels = ["All", "Petrol", "Electric", "AWD", "Hybrid"];
  // Transmissions
  const transmissions = ["All", "Automatic", "Manual", "AWD"];

  const activeBudgetLabel = React.useMemo(() => {
    const found = BUDGET_RANGES.find(
      (r) => r.min === filters.budgetMin && r.max === filters.budgetMax
    );
    return found ? found.label : "Custom Range";
  }, [filters.budgetMin, filters.budgetMax]);

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="mb-10 text-center md:text-left">
          <p className="text-xs font-black tracking-widest text-[#2E7D32] uppercase mb-2">
            1stCars Curated Collection
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            {settings.buyCarsHeadingText || "Explore Our Handpicked Certified Fleet"}
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            {settings.buyCarsSubheadingText || "Every vehicle on this list is fully vetted and owned directly by 1stCars. Enjoy straightforward pricing, single-owner status, certified non-accident frames, and instant deliveries."}
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-4 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left search */}
          <div className="relative w-full md:w-96">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search Porsche, AWD, M4 Competition..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF9F6] border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Right Toolbar controls */}
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="md:hidden flex items-center gap-2 border-[#2E7D32]/10 text-slate-700 h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>

            <div className="flex items-center space-x-3.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:inline">
                Sort By
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              >
                <option value="featured">Featured Status</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="year_desc">Year: Newest First</option>
                <option value="mileage_asc">KM Driven: Lowest</option>
              </select>
            </div>

            {/* Layout Toggles */}
            <div className="bg-[#FAF9F6] p-1.5 rounded-xl border border-slate-100 items-center space-x-1 hidden sm:flex">
              <button
                onClick={() => setIsListView(false)}
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  !isListView ? "bg-white text-[#2E7D32] shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
                aria-label="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsListView(true)}
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  isListView ? "bg-white text-[#2E7D32] shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
                aria-label="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Filters Sidebar (Desktop) */}
          <div className={cn(
            "lg:col-span-1 bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm h-fit space-y-6 transition-all duration-300",
            showFiltersMobile ? "block fixed inset-x-4 top-24 bottom-6 z-40 overflow-y-auto" : "hidden lg:block"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="h-4.5 w-4.5 text-[#2E7D32]" /> Advanced Filters
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-[#2E7D32] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Brand Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                Brand Partner
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleFilterChange("brand", "All")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                    filters.brand === "All"
                      ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10"
                      : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border border-slate-100"
                  )}
                >
                  All
                </button>
                {FAMOUS_BRANDS.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => handleFilterChange("brand", brand)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                      filters.brand === brand
                        ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10"
                        : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border border-slate-100"
                    )}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                City / Location
              </label>
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange("city", e.target.value)}
                className="w-full bg-[#FAF9F6] border border-slate-100 rounded-xl text-xs font-bold text-slate-700 py-3 px-4 outline-none"
              >
                {CITIES_DATA.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Ranges */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                Budget Tier
              </label>
              <div className="space-y-2">
                {BUDGET_RANGES.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleBudgetRangeChange(range.label)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border",
                      activeBudgetLabel === range.label
                        ? "bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/20"
                        : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border-slate-100"
                    )}
                  >
                    <span>{range.label}</span>
                    {activeBudgetLabel === range.label && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                Fuel Technology
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {fuels.map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFilterChange("fuel", f)}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-xl text-center transition-all cursor-pointer border",
                      filters.fuel === f
                        ? "bg-[#2E7D32] text-white border-transparent"
                        : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border-slate-100"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Transmission Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                Transmission Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {transmissions.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleFilterChange("transmission", t)}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-xl text-center transition-all cursor-pointer border",
                      filters.transmission === t
                        ? "bg-[#2E7D32] text-white border-transparent"
                        : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border-slate-100"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Year Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Model Year Range
                </label>
                <span className="text-xs font-black text-[#2E7D32]">
                  {filters.yearMin} - {filters.yearMax}
                </span>
              </div>
              <div className="flex items-center space-x-3 pt-1">
                <input
                  type="range"
                  min="2020"
                  max="2024"
                  step="1"
                  value={filters.yearMin}
                  onChange={(e) => handleFilterChange("yearMin", parseInt(e.target.value))}
                  className="w-full accent-[#2E7D32] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <input
                  type="range"
                  min="2020"
                  max="2024"
                  step="1"
                  value={filters.yearMax}
                  onChange={(e) => handleFilterChange("yearMax", parseInt(e.target.value))}
                  className="w-full accent-[#2E7D32] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Mobile close actions overlay */}
            {showFiltersMobile && (
              <Button
                onClick={() => setShowFiltersMobile(false)}
                className="w-full bg-[#2E7D32] text-white h-11 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Apply Filters ({filteredAndSortedCars.length} Cars)
              </Button>
            )}
          </div>

          {/* Listings Pane */}
          <div className="lg:col-span-3 flex flex-col justify-between" aria-live="polite">
            {isLoading ? (
              <div className={cn(
                "grid gap-6",
                isListView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}>
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
                  <div
                    key={`skeleton-${idx}`}
                    className={cn(
                      "bg-white border border-[#2E7D32]/10 rounded-3xl overflow-hidden shadow-xs flex flex-col animate-pulse",
                      isListView ? "md:flex-row md:min-h-[290px]" : "w-full"
                    )}
                  >
                    {/* Skeleton Image Gallery */}
                    <div className={cn(
                      "bg-slate-200/60 relative",
                      isListView ? "w-full md:w-2/5 min-h-[220px]" : "w-full h-60"
                    )}>
                      <div className="absolute top-5 left-5 w-24 h-6 bg-slate-300 rounded-full" />
                      <div className="absolute top-5 right-5 w-9 h-9 bg-slate-300 rounded-full" />
                    </div>
                    {/* Skeleton Content Pane */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-2">
                            <div className="w-16 h-3 bg-slate-200 rounded" />
                            <div className="w-40 h-6 bg-slate-200 rounded" />
                          </div>
                          <div className="space-y-1.5 text-right">
                            <div className="w-24 h-6 bg-slate-200 rounded ml-auto" />
                            <div className="w-20 h-3 bg-slate-200 rounded ml-auto" />
                          </div>
                        </div>
                        <div className="h-px bg-slate-100 my-4" />
                        <div className="grid grid-cols-3 gap-4 my-4">
                          {Array.from({ length: 6 }).map((_, sIdx) => (
                            <div key={sIdx} className="space-y-1.5">
                              <div className="w-8 h-2.5 bg-slate-200 rounded" />
                              <div className="w-16 h-3.5 bg-slate-200 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex gap-3">
                        <div className="flex-1 h-10 bg-slate-200 rounded-xl" />
                        <div className="flex-1 h-10 bg-slate-200 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedCars.length > 0 ? (
              <div className={cn(
                "grid gap-6",
                isListView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}>
                {paginatedCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    isSaved={savedCars.includes(car.id)}
                    onSaveToggle={onSaveToggle}
                    onViewDetails={onViewDetails}
                    isListView={isListView}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-16 text-center max-w-lg mx-auto my-12 shadow-xs">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-5">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">No Matching Inventory</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  We currently do not have any vehicle that meets these exact search criteria. Try broadening your filters or reset the filter pane.
                </p>
                <Button
                  onClick={handleResetFilters}
                  className="mt-6 bg-[#2E7D32] text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md shadow-[#2E7D32]/10"
                >
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-8 mt-10">
                <p className="text-xs font-semibold text-slate-400">
                  Showing Page <span className="font-extrabold text-slate-600">{currentPage}</span> of <span className="font-extrabold text-slate-600">{totalPages}</span> — Curating {filteredAndSortedCars.length} masterpieces
                </p>

                <div className="flex items-center space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                    className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-600 hover:bg-[#2E7D32]/5 disabled:opacity-30 disabled:hover:bg-white disabled:pointer-events-none transition-all cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-9 h-9 rounded-xl font-bold text-xs transition-all cursor-pointer",
                        currentPage === i + 1
                          ? "bg-[#2E7D32] text-white shadow-md shadow-[#2E7D32]/10"
                          : "bg-white border border-slate-100 text-slate-600 hover:bg-[#2E7D32]/5"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                    className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-600 hover:bg-[#2E7D32]/5 disabled:opacity-30 disabled:hover:bg-white disabled:pointer-events-none transition-all cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
