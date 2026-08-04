/**
 * Supabase-ready Database Helper & DDL Schema Definitions
 * 
 * To migrate this to a live Supabase instance:
 * 1. Install @supabase/supabase-js
 * 2. Run the SQL schema DDL below in your Supabase SQL Editor
 * 3. Replace this mock implementation with the official client:
 *    import { createClient } from '@supabase/supabase-js'
 *    export const supabase = createClient(YOUR_URL, YOUR_ANON_KEY)
 */

export const SUPABASE_SQL_DDL = `-- Custom User Profiles & Roles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  role TEXT DEFAULT 'Buyer' CHECK (role IN ('Buyer', 'Seller', 'Dealer', 'Inspector', 'Sales Associate', 'Admin')),
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inspections Table (Spinny-inspired Sell Car flow)
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_name TEXT NOT NULL,
  seller_mobile TEXT NOT NULL,
  reg_number TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  year INTEGER NOT NULL,
  km_driven INTEGER NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'assigned' | 'completed' | 'offered' | 'sold'
  inspector_id UUID REFERENCES public.profiles(id),
  overall_score NUMERIC(3,1),
  report_engine TEXT,
  report_brakes TEXT,
  report_electronics TEXT,
  report_exterior TEXT,
  report_interior TEXT,
  notes TEXT
);

-- Offers Table (Dealers can place bidding offers on inspected cars)
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  offer_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL -- 'pending' | 'accepted' | 'rejected'
);

-- Active Auctions Table (Dealer Bidding Arena)
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  car_title TEXT NOT NULL,
  year INTEGER NOT NULL,
  km_driven INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  city TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  current_bid INTEGER NOT NULL,
  highest_bidder_name TEXT,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL -- 'active' | 'ended'
);

-- Bookings / Sales Leads table
CREATE TABLE IF NOT EXISTS public.sales_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  city TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  car_id TEXT NOT NULL,
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  type TEXT NOT NULL, -- 'test_drive' | 'buy_now' | 'whatsapp' | 'call_request'
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'contacted' | 'resolved'
  notes TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_notifications ENABLE ROW LEVEL SECURITY;

-- Dynamic Security Policies Example (RLS)
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sellers Read Write Own Inspections" ON public.inspections 
  FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Inspectors View/Edit Assigned" ON public.inspections
  FOR ALL USING (auth.uid() = inspector_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  ));
`;

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type UserRole = "Buyer" | "Seller" | "Dealer" | "Inspector" | "Sales Associate" | "Admin";

export interface Profile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  city: string;
  created_at: string;
}

export interface Inspection {
  id: string;
  created_at: string;
  seller_id?: string;
  seller_name: string;
  seller_mobile: string;
  reg_number: string;
  brand: string;
  model: string;
  variant: string;
  fuel: string;
  transmission: string;
  year: number;
  km_driven: number;
  city: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  status: "pending" | "assigned" | "completed" | "offered" | "sold";
  inspector_id?: string;
  overall_score?: number;
  report_engine?: string;
  report_brakes?: string;
  report_electronics?: string;
  report_exterior?: string;
  report_interior?: string;
  notes?: string;
}

export interface Offer {
  id: string;
  created_at: string;
  inspection_id: string;
  dealer_id: string;
  dealer_name: string;
  offer_amount: number;
  status: "pending" | "accepted" | "rejected";
}

export interface Auction {
  id: string;
  created_at: string;
  car_title: string;
  year: number;
  km_driven: number;
  fuel: string;
  transmission: string;
  city: string;
  base_price: number;
  current_bid: number;
  highest_bidder_name?: string;
  ends_at: string;
  status: "active" | "ended";
}

export interface SalesNotification {
  id: string;
  created_at: string;
  name: string;
  mobile: string;
  city: string;
  preferred_date: string;
  preferred_time: string;
  car_id: string;
  car_brand: string;
  car_model: string;
  type: "test_drive" | "buy_now" | "whatsapp" | "call_request";
  status: "pending" | "contacted" | "resolved";
  notes?: string;
}

// ==========================================
// SEED DATA INITIALIZERS
// ==========================================

const SEED_PROFILES: Profile[] = [
  { id: "u-buyer", name: "Rahul Sharma", email: "buyer@1stcars.com", mobile: "9876543210", role: "Buyer", city: "Mumbai", created_at: new Date().toISOString() },
  { id: "u-seller", name: "Amit Verma", email: "seller@1stcars.com", mobile: "9123456789", role: "Seller", city: "Delhi NCR", created_at: new Date().toISOString() },
  { id: "u-dealer", name: "Elite Motors Dealer", email: "dealer@1stcars.com", mobile: "9234567890", role: "Dealer", city: "Bangalore", created_at: new Date().toISOString() },
  { id: "u-inspector", name: "Vikram Rathore", email: "inspector@1stcars.com", mobile: "9345678901", role: "Inspector", city: "Mumbai", created_at: new Date().toISOString() },
  { id: "u-sales", name: "Sneha Patel", email: "sales@1stcars.com", mobile: "9456789012", role: "Sales Associate", city: "Delhi NCR", created_at: new Date().toISOString() }
];

const SEED_INSPECTIONS: Inspection[] = [
  {
    id: "insp-1",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    seller_id: "u-seller",
    seller_name: "Amit Verma",
    seller_mobile: "9123456789",
    reg_number: "DL3C-AK-9988",
    brand: "Honda",
    model: "City",
    variant: "ZX i-VTEC",
    fuel: "Petrol",
    transmission: "Manual",
    year: 2021,
    km_driven: 32000,
    city: "Delhi NCR",
    address: "B-402, Signature Towers, Gurugram",
    preferred_date: "2026-07-20",
    preferred_time: "10:00 AM - 12:00 PM",
    status: "assigned",
    inspector_id: "u-inspector",
    notes: "Please check rear bumper dent"
  },
  {
    id: "insp-2",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    seller_name: "Karan Johar",
    seller_mobile: "9888877777",
    reg_number: "MH02-CR-2002",
    brand: "Audi",
    model: "A6",
    variant: "45 TFSI Technology",
    fuel: "Petrol",
    transmission: "Automatic",
    year: 2023,
    km_driven: 8400,
    city: "Mumbai",
    address: "Carter Road, Bandra West, Mumbai",
    preferred_date: "2026-07-19",
    preferred_time: "02:00 PM - 04:00 PM",
    status: "pending",
    notes: "Premium vehicle inspect carefully. Immaculate condition."
  },
  {
    id: "insp-3",
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    seller_id: "u-seller",
    seller_name: "Amit Verma",
    seller_mobile: "9123456789",
    reg_number: "DL1C-YY-1234",
    brand: "Maruti Suzuki",
    model: "Swift",
    variant: "ZXI Plus",
    fuel: "Petrol",
    transmission: "Manual",
    year: 2019,
    km_driven: 54000,
    city: "Delhi NCR",
    address: "Sector 15, Noida",
    preferred_date: "2026-07-15",
    preferred_time: "04:00 PM - 06:00 PM",
    status: "completed",
    inspector_id: "u-inspector",
    overall_score: 8.8,
    report_engine: "Excellent engine compression, fresh oil.",
    report_brakes: "Front pads replaced, rear linings 40% worn.",
    report_electronics: "All climate controls and touchscreen operational.",
    report_exterior: "Minor cosmetic scratches on left fender.",
    report_interior: "Extremely clean, premium fabric seat covers.",
    notes: "Checked perfectly. Ready for offering."
  },
  {
    id: "insp-4",
    created_at: new Date(Date.now() - 3600000 * 120).toISOString(),
    seller_id: "u-seller",
    seller_name: "Amit Verma",
    seller_mobile: "9123456789",
    reg_number: "KA03-MM-5566",
    brand: "Hyundai",
    model: "Creta",
    variant: "SX Executive",
    fuel: "Diesel",
    transmission: "Automatic",
    year: 2022,
    km_driven: 21000,
    city: "Bangalore",
    address: "HSR Layout Sector 2, Bangalore",
    preferred_date: "2026-07-14",
    preferred_time: "11:00 AM - 01:00 PM",
    status: "offered",
    inspector_id: "u-inspector",
    overall_score: 9.2,
    report_engine: "Smooth transmission shifts, clean bay.",
    report_brakes: "90% pads remaining, responsive ABS.",
    report_electronics: "Pano roof operates smoothly. No fault codes.",
    report_exterior: "No dent or scratch, original paint factory spec.",
    report_interior: "Immaculate leather, pristine air filter.",
    notes: "High value Creta."
  }
];

const SEED_OFFERS: Offer[] = [
  {
    id: "off-1",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    inspection_id: "insp-3",
    dealer_id: "u-dealer",
    dealer_name: "Elite Motors Dealer",
    offer_amount: 485000,
    status: "pending"
  },
  {
    id: "off-2",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    inspection_id: "insp-4",
    dealer_id: "u-dealer",
    dealer_name: "Elite Motors Dealer",
    offer_amount: 1450000,
    status: "pending"
  }
];

const SEED_AUCTIONS: Auction[] = [
  {
    id: "auc-1",
    created_at: new Date().toISOString(),
    car_title: "Maruti Suzuki Swift ZXI Plus",
    year: 2019,
    km_driven: 54000,
    fuel: "Petrol",
    transmission: "Manual",
    city: "Delhi NCR",
    base_price: 450000,
    current_bid: 485000,
    highest_bidder_name: "Elite Motors Dealer",
    ends_at: new Date(Date.now() + 3600000 * 4).toISOString(),
    status: "active"
  },
  {
    id: "auc-2",
    created_at: new Date().toISOString(),
    car_title: "Hyundai Creta SX Executive",
    year: 2022,
    km_driven: 21000,
    fuel: "Diesel",
    transmission: "Automatic",
    city: "Bangalore",
    base_price: 1380000,
    current_bid: 1450000,
    highest_bidder_name: "Elite Motors Dealer",
    ends_at: new Date(Date.now() + 3600000 * 24).toISOString(),
    status: "active"
  },
  {
    id: "auc-3",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    car_title: "Honda City V",
    year: 2018,
    km_driven: 68000,
    fuel: "Petrol",
    transmission: "Manual",
    city: "Mumbai",
    base_price: 500000,
    current_bid: 535000,
    highest_bidder_name: "Express Wheels Ltd",
    ends_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: "ended"
  }
];

const SEED_SALES_NOTIFICATIONS: SalesNotification[] = [
  {
    id: "lead-1",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    name: "Ananya Sharma",
    mobile: "9876543210",
    city: "Mumbai",
    preferred_date: "2026-07-20",
    preferred_time: "11:00 AM - 01:00 PM",
    car_id: "car-1",
    car_brand: "Porsche",
    car_model: "911 Carrera S",
    type: "test_drive",
    status: "pending",
    notes: "Client requested clean exterior package check"
  },
  {
    id: "lead-2",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    name: "Devendra Patel",
    mobile: "9123456789",
    city: "Delhi NCR",
    preferred_date: "2026-07-22",
    preferred_time: "03:00 PM - 05:00 PM",
    car_id: "car-3",
    car_brand: "BMW",
    car_model: "M4 Competition",
    type: "buy_now",
    status: "contacted",
    notes: "Arranging elite financing checks with HDFC partner"
  }
];

// Seed other core collections if not present in localStorage
const initializeLocalStorage = () => {
  if (!localStorage.getItem("1stcars_profiles")) {
    localStorage.setItem("1stcars_profiles", JSON.stringify(SEED_PROFILES));
  }
  if (!localStorage.getItem("1stcars_inspections")) {
    localStorage.setItem("1stcars_inspections", JSON.stringify(SEED_INSPECTIONS));
  }
  if (!localStorage.getItem("1stcars_offers")) {
    localStorage.setItem("1stcars_offers", JSON.stringify(SEED_OFFERS));
  }
  if (!localStorage.getItem("1stcars_auctions")) {
    localStorage.setItem("1stcars_auctions", JSON.stringify(SEED_AUCTIONS));
  }
  if (!localStorage.getItem("1stcars_sales_notifications")) {
    localStorage.setItem("1stcars_sales_notifications", JSON.stringify(SEED_SALES_NOTIFICATIONS));
  }
  if (!localStorage.getItem("1stcars_saved_cars")) {
    localStorage.setItem("1stcars_saved_cars", JSON.stringify(["car-1", "car-3"]));
  }
  if (!localStorage.getItem("1stcars_test_drives")) {
    localStorage.setItem("1stcars_test_drives", JSON.stringify([
      { id: "td-1", car_id: "car-1", car_title: "Porsche 911 Carrera S", date: "2026-07-20", time: "11:00 AM", status: "Approved" }
    ]));
  }
  if (!localStorage.getItem("1stcars_orders")) {
    localStorage.setItem("1stcars_orders", JSON.stringify([
      { id: "ord-1", car_id: "car-3", car_title: "BMW M4 Competition", price: 9240000, date: "2026-07-17", status: "Booking Confirmed" }
    ]));
  }
};

// Initialize right away
if (typeof window !== "undefined") {
  initializeLocalStorage();
}

// ==========================================
// CORE REUSABLE PERSISTENCE UTILS
// ==========================================

function getTableData<T>(key: string): T[] {
  initializeLocalStorage();
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveTableData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// SUPABASE MOCK QUERY WRAPPER
// ==========================================

export const supabaseMock = {
  from: (table: string) => {
    let storageKey = "";
    switch (table) {
      case "profiles":
        storageKey = "1stcars_profiles";
        break;
      case "inspections":
        storageKey = "1stcars_inspections";
        break;
      case "offers":
        storageKey = "1stcars_offers";
        break;
      case "auctions":
        storageKey = "1stcars_auctions";
        break;
      case "sales_notifications":
        storageKey = "1stcars_sales_notifications";
        break;
      default:
        throw new Error(`Table ${table} not supported in Supabase mock.`);
    }

    return {
      select: async () => {
        const data = getTableData<any>(storageKey);
        return { data, error: null };
      },

      insert: async (records: any[]) => {
        const current = getTableData<any>(storageKey);
        const newRecords = records.map(r => ({
          id: `${table.substring(0, 3)}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          ...r
        }));
        const updated = [...newRecords, ...current];
        saveTableData(storageKey, updated);
        return { data: newRecords, error: null };
      },

      update: async (changes: any, matchId: string) => {
        const current = getTableData<any>(storageKey);
        const updated = current.map(item => {
          if (item.id === matchId) {
            return { ...item, ...changes };
          }
          return item;
        });
        saveTableData(storageKey, updated);
        const updatedItem = updated.find(item => item.id === matchId) || null;
        return { data: updatedItem, error: null };
      },

      delete: async (matchId: string) => {
        const current = getTableData<any>(storageKey);
        const filtered = current.filter(item => item.id !== matchId);
        saveTableData(storageKey, filtered);
        return { data: true, error: null };
      }
    };
  }
};

// ==========================================
// SUPABASE-STYLE AUTH MOCK ENGINE
// ==========================================

export const authMock = {
  login: async (email: string, password?: string): Promise<{ data: { user: Profile | null }; error: string | null }> => {
    const profiles = getTableData<Profile>("1stcars_profiles");
    const user = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      localStorage.setItem("1stcars_current_user", JSON.stringify(user));
      return { data: { user }, error: null };
    }
    
    return { data: { user: null }, error: "Invalid credentials. If this is a new email, please register first." };
  },

  register: async (email: string, role: UserRole, details: { name: string; mobile: string; city: string }): Promise<{ data: { user: Profile | null }; error: string | null }> => {
    const profiles = getTableData<Profile>("1stcars_profiles");
    
    if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
      return { data: { user: null }, error: "Email already registered." };
    }

    const newProfile: Profile = {
      id: `u-${Math.random().toString(36).substr(2, 9)}`,
      email,
      role,
      name: details.name || email.split("@")[0],
      mobile: details.mobile || "",
      city: details.city || "Mumbai",
      created_at: new Date().toISOString()
    };

    const updated = [...profiles, newProfile];
    saveTableData("1stcars_profiles", updated);
    localStorage.setItem("1stcars_current_user", JSON.stringify(newProfile));

    return { data: { user: newProfile }, error: null };
  },

  resetPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const profiles = getTableData<Profile>("1stcars_profiles");
    const exists = profiles.some(p => p.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { success: true, message: `Password reset link sent successfully to ${email}.` };
    }
    return { success: false, message: "Email not found in our database." };
  },

  getCurrentUser: (): Profile | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("1stcars_current_user");
    return raw ? JSON.parse(raw) : null;
  },

  logout: () => {
    localStorage.removeItem("1stcars_current_user");
  }
};
