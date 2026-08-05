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
  seller_email TEXT,
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
  notes TEXT,
  report_120_json TEXT,
  report_150_json TEXT,
  is_certified BOOLEAN DEFAULT false
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

// Seed other core collections if not present in localStorage
const initializeLocalStorage = () => {
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
