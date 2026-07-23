import * as React from "react";
import { Search, SlidersHorizontal, Grid, List, RotateCcw, ChevronLeft, ChevronRight, Fuel, ShieldAlert, Check, Share2, X } from "lucide-react";
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

const ITEMS_PER_PAGE = 10;

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
    buyCarsSubheadingText: "1stCars is Gujarat's premier aggregator platform connecting Car Buyers, Sellers, and Dealers. Every vehicle undergoes strict 1stMark certification for Single Owned status, Non-Accident trusted frame, and Genuine KM verification."
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
    budgetMax: 50000000,
    yearMin: 2015,
    yearMax: 2026,
    city: selectedCity || "All Cities",
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
      budgetMax: 50000000,
      yearMin: 2015,
      yearMax: 2026,
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
        budgetMax: 50000000,
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
      result = result.filter((car) => {
        if (filters.fuel === "EV") {
          return car.fuel === "EV" || car.fuel === "Electric";
        }
        return car.fuel === filters.fuel;
      });
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
      const selectedCityLower = filters.city.toLowerCase();
      result = result.filter(
        (car) =>
          car.cities?.some((c) => c.toLowerCase() === selectedCityLower) ||
          car.regCity?.toLowerCase() === selectedCityLower ||
          car.location?.toLowerCase().includes(selectedCityLower)
      );
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

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const paginatedCars = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCars.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedCars, currentPage]);

  // Fuel options (Petrol, Diesel, CNG, EV)
  const fuels = ["All", "Petrol", "Diesel", "CNG", "EV"];
  // Transmissions
  const transmissions = ["All", "Automatic", "Manual", "AWD"];

  const activeBudgetLabel = React.useMemo(() => {
    const found = BUDGET_RANGES.find(
      (r) => r.min === filters.budgetMin && r.max === filters.budgetMax
    );
    return found ? found.label : "Custom Range";
  }, [filters.budgetMin, filters.budgetMax]);

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-20">
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
            {settings.buyCarsSubheadingText || "1stCars is Gujarat's premier aggregator platform connecting Car Buyers, Sellers, and Dealers. Every vehicle undergoes strict 1stMark certification for Single Owned status, Non-Accident trusted frame, and Genuine KM verification."}
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
                className="bg-white border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] outline-none cursor-pointer shadow-2xs"
              >
                <option value="featured" className="bg-white text-slate-900 font-semibold py-1">Featured Status</option>
                <option value="price_asc" className="bg-white text-slate-900 font-semibold py-1">Price: Low to High</option>
                <option value="price_desc" className="bg-white text-slate-900 font-semibold py-1">Price: High to Low</option>
                <option value="year_desc" className="bg-white text-slate-900 font-semibold py-1">Year: Newest First</option>
                <option value="mileage_asc" className="bg-white text-slate-900 font-semibold py-1">KM Driven: Lowest</option>
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

        {/* Mobile Filter Sheet Drawer */}
        {showFiltersMobile && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              onClick={() => setShowFiltersMobile(false)}
            />

            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl border-t border-slate-200 lg:hidden overflow-hidden">
              {/* Top Drag Handle */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between px-5 pb-2.5 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#2E7D32]" /> Advanced Filters
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-[#2E7D32] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                  <button
                    onClick={() => setShowFiltersMobile(false)}
                    className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body - Compact Dropdowns */}
              <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3.5">
                {/* Brand Filter */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Brand Partner
                  </label>
                  <select
                    value={filters.brand}
                    onChange={(e) => handleFilterChange("brand", e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                  >
                    <option value="All">All Brands</option>
                    {FAMOUS_BRANDS.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* City Filter */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    City Hub / Location
                  </label>
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                  >
                    {CITIES_DATA.map((city) => (
                      <option key={city} value={city}>
                        {city === "All Cities" ? "📍 All Gujarat" : city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Ranges */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Budget Tier
                  </label>
                  <select
                    value={activeBudgetLabel}
                    onChange={(e) => handleBudgetRangeChange(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                  >
                    {BUDGET_RANGES.map((range) => (
                      <option key={range.label} value={range.label}>{range.label}</option>
                    ))}
                  </select>
                </div>

                {/* Fuel & Transmission (2 Cols) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Fuel Tech
                    </label>
                    <select
                      value={filters.fuel}
                      onChange={(e) => handleFilterChange("fuel", e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                    >
                      {fuels.map((f) => (
                        <option key={f} value={f}>{f === "All" ? "All Fuels" : f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Transmission
                    </label>
                    <select
                      value={filters.transmission}
                      onChange={(e) => handleFilterChange("transmission", e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                    >
                      {transmissions.map((t) => (
                        <option key={t} value={t}>{t === "All" ? "All Transmissions" : t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Year Range (2 Cols) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Min Model Year
                    </label>
                    <select
                      value={filters.yearMin}
                      onChange={(e) => handleFilterChange("yearMin", parseInt(e.target.value))}
                      className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                    >
                      {[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Max Model Year
                    </label>
                    <select
                      value={filters.yearMax}
                      onChange={(e) => handleFilterChange("yearMax", parseInt(e.target.value))}
                      className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                    >
                      {[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sticky Footer Button */}
              <div className="p-3.5 bg-white border-t border-slate-100 shrink-0">
                <Button
                  onClick={() => setShowFiltersMobile(false)}
                  className="w-full bg-[#2E7D32] hover:bg-[#236327] text-white h-11 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-[#2E7D32]/20"
                >
                  Apply Filters ({filteredAndSortedCars.length} Cars)
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Filters Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm h-fit space-y-6">
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
                City Hub / Location
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CITIES_DATA.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleFilterChange("city", city)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border",
                      filters.city === city
                        ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-md shadow-[#2E7D32]/10"
                        : "bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border-slate-100"
                    )}
                  >
                    {city === "All Cities" ? "📍 All Gujarat" : city}
                  </button>
                ))}
              </div>
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
                  min="2015"
                  max="2026"
                  step="1"
                  value={filters.yearMin}
                  onChange={(e) => handleFilterChange("yearMin", parseInt(e.target.value))}
                  className="w-full accent-[#2E7D32] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <input
                  type="range"
                  min="2015"
                  max="2026"
                  step="1"
                  value={filters.yearMax}
                  onChange={(e) => handleFilterChange("yearMax", parseInt(e.target.value))}
                  className="w-full accent-[#2E7D32] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Listings Pane */}
          <div className="lg:col-span-3 flex flex-col justify-between" aria-live="polite">
            {isLoading ? (
              <div className={cn(
                "grid gap-3 sm:gap-4 md:gap-6",
                isListView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              )}>
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
                  <div
                    key={`skeleton-${idx}`}
                    className={cn(
                      "bg-white border border-[#2E7D32]/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs flex flex-col animate-pulse",
                      isListView ? "md:flex-row md:min-h-[250px]" : "w-full"
                    )}
                  >
                    {/* Skeleton Image Gallery */}
                    <div className={cn(
                      "bg-slate-200/60 relative",
                      isListView ? "w-full md:w-2/5 min-h-[160px]" : "w-full h-36 sm:h-48 md:h-52"
                    )}>
                      <div className="absolute top-3 left-3 w-20 h-5 bg-slate-300 rounded-full" />
                      <div className="absolute top-3 right-3 w-7 h-7 bg-slate-300 rounded-full" />
                    </div>
                    {/* Skeleton Content Pane */}
                    <div className="flex-1 p-3.5 sm:p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1.5">
                            <div className="w-12 h-2.5 bg-slate-200 rounded" />
                            <div className="w-32 h-4 bg-slate-200 rounded" />
                          </div>
                          <div className="space-y-1 text-right">
                            <div className="w-20 h-4 bg-slate-200 rounded ml-auto" />
                            <div className="w-16 h-2.5 bg-slate-200 rounded ml-auto" />
                          </div>
                        </div>
                        <div className="h-px bg-slate-100 my-2 sm:my-3" />
                        <div className="grid grid-cols-3 gap-2 my-2 sm:my-3">
                          {Array.from({ length: 6 }).map((_, sIdx) => (
                            <div key={sIdx} className="space-y-1">
                              <div className="w-6 h-2 bg-slate-200 rounded" />
                              <div className="w-12 h-3 bg-slate-200 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2.5 sm:pt-3.5 border-t border-slate-100 flex gap-2">
                        <div className="flex-1 h-8 sm:h-9 bg-slate-200 rounded-lg sm:rounded-xl" />
                        <div className="flex-1 h-8 sm:h-9 bg-slate-200 rounded-lg sm:rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedCars.length > 0 ? (
              <div className={cn(
                "grid gap-3 sm:gap-4 md:gap-6",
                isListView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80 pt-6 mt-10">
                <p className="text-xs font-semibold text-slate-500 text-center sm:text-left order-2 sm:order-1">
                  Showing Page <span className="font-bold text-slate-800">{currentPage}</span> of{" "}
                  <span className="font-bold text-slate-800">{totalPages}</span> — Curating{" "}
                  <span className="font-bold text-[#2E7D32]">{filteredAndSortedCars.length}</span> masterpieces
                </p>

                <div className="flex items-center gap-1.5 order-1 sm:order-2 max-w-full overflow-x-auto no-scrollbar py-1 px-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((c) => Math.max(1, c - 1));
                      window.scrollTo({ top: 250, behavior: "smooth" });
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-[#2E7D32]/10 hover:text-[#2E7D32] hover:border-[#2E7D32]/30 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:hover:border-slate-200 transition-all cursor-pointer text-xs font-bold shrink-0 shadow-xs"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {getPageNumbers().map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span key={`dots-${idx}`} className="px-1.5 text-xs font-bold text-slate-400 select-none">
                            …
                          </span>
                        );
                      }
                      const pageNum = p as number;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 250, behavior: "smooth" });
                          }}
                          className={cn(
                            "min-w-9 h-9 px-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center justify-center",
                            isActive
                              ? "bg-[#2E7D32] text-white shadow-sm shadow-[#2E7D32]/20 border border-[#2E7D32]"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((c) => Math.min(totalPages, c + 1));
                      window.scrollTo({ top: 250, behavior: "smooth" });
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-[#2E7D32]/10 hover:text-[#2E7D32] hover:border-[#2E7D32]/30 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:hover:border-slate-200 transition-all cursor-pointer text-xs font-bold shrink-0 shadow-xs"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
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
