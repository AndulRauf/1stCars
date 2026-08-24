export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  emi: number;
  location: string;
  fuel: "Petrol" | "Diesel" | "CNG" | "EV" | "Electric" | "Hybrid" | string;
  transmission: "Automatic" | "Manual" | "AWD" | "DCT";
  mileage: number; // in miles/km
  bodyType: "SUV" | "Sedan" | "Coupe" | "Convertible" | "Hatchback" | "EV";
  certified: boolean;
  imageBg: string; // Tailwind color or representation
  imageUrl?: string;
  image_url?: string;
  images?: string[];
  featured: boolean;
  specifications: string[];
  features?: string[];
  inspectionSummary?: {
    overallScore: number; // e.g. 9.4
    engine: string;
    brakes: string;
    electronics: string;
    exterior: string;
    interior: string;
  };
  warrantyInfo?: {
    months: number;
    miles: number;
    coverage: string;
  };
  owners?: number;
  km_driven?: number;
  // "pending" is the Sales-Associate submit status; "hidden"/"ended" guard
  // delisted and auction-sold records from surfacing on the public catalog.
  status?: "available" | "reserved" | "sold" | "pending" | "hidden" | "ended";
  cities?: string[];


  variant?: string;
  color?: string;
  regCity?: string;
  regYear?: number;
  rtoCode?: string;
  insuranceValidity?: string;
  groundClearance?: string;
  bootCapacity?: string;
  fuelTank?: string;
  keyCount?: number;
  price_breakup?: { label: string; amount: number; desc?: string }[];
}

// NOTE: ViewType lives in @/src/lib/router (single source of truth for the
// 12 route values). This stale duplicate was removed — never redefine it here.

export interface FilterState {
  search: string;
  brand: string;
  fuel: string;
  transmission: string;
  budgetMin: number;
  budgetMax: number;
  yearMin: number;
  yearMax: number;
  city: string;
}

export interface Inspection {
  id: string;
  created_at?: string;
  seller_id?: string;
  seller_name: string;
  seller_mobile: string;
  reg_number: string;
  brand: string;
  model: string;
  variant?: string;
  fuel: string;
  transmission: string;
  year: number;
  km_driven: number;
  city: string;
  address: string;
  preferred_date?: string;
  preferred_time?: string;
  // Union merged from both historical definitions (types.ts + lib/db.ts):
  // pending | assigned | completed | rejected | auctioned | published | offered | sold
  status:
    | "pending"
    | "assigned"
    | "completed"
    | "rejected"
    | "auctioned"
    | "published"
    | "offered"
    | "sold";
  inspector_id?: string;
  inspector_name?: string;
  overall_score?: number;
  report_engine?: string;
  report_brakes?: string;
  report_electronics?: string;
  report_exterior?: string;
  report_interior?: string;
  report_120_json?: string; // Serialized Full120PointReport
  report_150_json?: string; // Legacy Serialized Report
  notes?: string;
  is_certified?: boolean;
}
