// URL Routing & Deep-linking helper for 1stCars

export type ViewType = 
  | "home" 
  | "buy_cars" 
  | "car_details" 
  | "sales_dashboard" 
  | "sell_car" 
  | "role_dashboards" 
  | "firstmark_certification" 
  | "custom_page" 
  | "error_404" 
  | "error_500";

export interface RouteParams {
  view: ViewType;
  carId?: string;
  pageId?: string;
  brand?: string;
  model?: string;
  variant?: string;
  city?: string;
  search?: string;
}

// Slugify helper (e.g. "BMW 3 Series" => "bmw-3-series")
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// Unslugify helper
export function unslugify(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse current window.location.pathname and search params into structured route info
 */
export function parseCurrentUrl(): RouteParams {
  if (typeof window === "undefined") {
    return { view: "home" };
  }

  const pathname = window.location.pathname.toLowerCase().replace(/\/$/, "");
  const searchParams = new URLSearchParams(window.location.search);

  // Extract query params
  const brandQuery = searchParams.get("brand") || undefined;
  const modelQuery = searchParams.get("model") || undefined;
  const variantQuery = searchParams.get("variant") || undefined;
  const cityQuery = searchParams.get("city") || undefined;
  const searchQuery = searchParams.get("search") || searchParams.get("q") || undefined;

  // Route 1: Home
  if (pathname === "" || pathname === "/" || pathname === "/home") {
    return { view: "home", brand: brandQuery, model: modelQuery, city: cityQuery };
  }

  // Route 2: Sell Car
  if (pathname === "/sell-car" || pathname === "/sell" || pathname === "/sell-your-car" || pathname === "/sellcar" || pathname === "/sell_car") {
    return { view: "sell_car" };
  }

  // Route 3: 1stMark Certification
  if (pathname === "/certification" || pathname === "/1stmark-certification" || pathname === "/1stmark" || pathname === "/1stmark-certified") {
    return { view: "firstmark_certification" };
  }

  // Route 4: Dashboards / Portal
  if (pathname === "/dashboard" || pathname === "/account" || pathname === "/role-dashboards" || pathname === "/my-account" || pathname === "/admin" || pathname === "/login" || pathname === "/portal" || pathname === "/admin-panel") {
    return { view: "role_dashboards" };
  }

  if (pathname === "/sales-portal" || pathname === "/sales-dashboard" || pathname === "/sales") {
    return { view: "sales_dashboard" };
  }

  // Route 5: Car Detail Page (`/cars/:carId` or `/car/:carId` or `/buy/:brand/:model/:carId`)
  const carMatch = pathname.match(/^\/(?:cars|car)\/([^\/]+)$/);
  if (carMatch) {
    const carId = carMatch[1];
    return { view: "car_details", carId };
  }

  // Route 6: Custom Page (`/page/:id` or `/p/:id`)
  const pageMatch = pathname.match(/^\/(?:page|p)\/([^\/]+)$/);
  if (pageMatch) {
    const pageId = pageMatch[1];
    return { view: "custom_page", pageId };
  }

  // Route 7: Buy Cars / Filters (`/buy-cars`, `/buy`, `/buy/:brand`, `/buy/:brand/:model`)
  if (pathname === "/buy-cars" || pathname === "/buy" || pathname.startsWith("/buy/")) {
    const segments = pathname.replace(/^\/buy\/?/, "").split("/").filter(Boolean);
    let brand = brandQuery;
    let model = modelQuery;

    if (segments.length === 1) {
      if (segments[0] !== "cars") {
        brand = unslugify(segments[0]);
      }
    } else if (segments.length >= 2) {
      brand = unslugify(segments[0]);
      model = unslugify(segments[1]);
    }

    return { 
      view: "buy_cars", 
      brand: brand || undefined, 
      model: model || undefined, 
      variant: variantQuery,
      city: cityQuery,
      search: searchQuery
    };
  }

  // Route 8: Error 404
  if (pathname === "/404") {
    return { view: "error_404" };
  }

  // Default fallback for unrecognized routes -> buy_cars if starts with car name, otherwise home
  return { view: "home" };
}

/**
 * Format a canonical URL path for a given view and route parameters
 */
export function formatUrl(view: ViewType, params?: { carId?: string; pageId?: string; brand?: string; model?: string; variant?: string; city?: string; search?: string }): string {
  switch (view) {
    case "home":
      return "/";
    
    case "sell_car":
      return "/sell-car";

    case "firstmark_certification":
      return "/certification";

    case "role_dashboards":
      return "/dashboard";

    case "sales_dashboard":
      return "/sales-portal";

    case "car_details":
      return params?.carId ? `/cars/${params.carId}` : "/buy-cars";

    case "custom_page":
      return params?.pageId ? `/page/${params.pageId}` : "/";

    case "buy_cars": {
      if (params?.brand && params?.model) {
        return `/buy/${slugify(params.brand)}/${slugify(params.model)}`;
      }
      if (params?.brand) {
        return `/buy/${slugify(params.brand)}`;
      }
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.city && params.city !== "All Cities") searchParams.set("city", params.city);
      
      const queryStr = searchParams.toString();
      return queryStr ? `/buy-cars?${queryStr}` : "/buy-cars";
    }

    case "error_404":
      return "/404";

    case "error_500":
      return "/500";

    default:
      return "/";
  }
}

/**
 * Update browser URL address bar and history state
 */
export function navigateTo(
  view: ViewType, 
  params?: { carId?: string; pageId?: string; brand?: string; model?: string; variant?: string; city?: string; search?: string },
  options?: { replace?: boolean }
) {
  if (typeof window === "undefined") return;

  const url = formatUrl(view, params);

  if (options?.replace) {
    window.history.replaceState({ view, ...params }, "", url);
  } else if (window.location.pathname + window.location.search !== url) {
    window.history.pushState({ view, ...params }, "", url);
  }

  // Smooth scroll top on navigation
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Get dynamic page title for browser tab
 */
export function getPageTitle(view: ViewType, carName?: string, pageTitle?: string): string {
  const brand = "1stCars — Certified Used Cars";

  switch (view) {
    case "home":
      return `1stCars | Certified Premium Used Cars & Pre-Owned Luxury`;
    case "sell_car":
      return `Sell Your Car Instantly From Home | 1stCars Free Home Inspection`;
    case "buy_cars":
      return `Buy Certified Used Cars | 1stCars 120-Point Inspected Inventory`;
    case "car_details":
      return carName ? `${carName} | 1stCars Certified Pre-Owned` : `Certified Vehicle Details | 1stCars`;
    case "firstmark_certification":
      return `1stMark Certification — 120-Point Inspection Standard | 1stCars`;
    case "role_dashboards":
      return `My Portal & Dashboards | 1stCars`;
    case "sales_dashboard":
      return `Sales Associate Management Portal | 1stCars`;
    case "custom_page":
      return pageTitle ? `${pageTitle} | 1stCars` : `1stCars`;
    default:
      return brand;
  }
}
