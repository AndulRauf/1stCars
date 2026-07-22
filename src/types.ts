export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  emi: number;
  location: string;
  fuel: "Petrol" | "Diesel" | "Electric" | "Hybrid";
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
}

export type ViewType = "home" | "buy_cars" | "car_details" | "sales_dashboard";

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
  status: "pending" | "assigned" | "completed" | "rejected" | "auctioned" | "published";
  inspector_id?: string;
  inspector_name?: string;
  overall_score?: number;
  report_engine?: string;
  report_brakes?: string;
  report_electronics?: string;
  report_exterior?: string;
  report_interior?: string;
  report_150_json?: string; // Serialized Full150PointReport
  notes?: string;
  is_certified?: boolean;
}
