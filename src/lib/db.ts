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

-- Dealer Auction Engine (canonical)
-- The auctions table, its status state-machine (DRAFT → READY → SCHEDULED →
-- LIVE → EXTENDED → CLOSING → CLOSED → SELLER_REVIEW → ACCEPTED/REJECTED/
-- EXPIRED/CANCELLED), CHECK constraints, RLS, SECURITY DEFINER RPCs, atomic
-- bidding, anti-sniping and automation triggers are defined canonically in
-- public/auction_engine.sql. Run that file to provision the auction schema.
-- The legacy flat "auctions" table (car_title/base_price/current_bid/status
-- 'active') has been retired — it conflicted with the canonical engine.

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

-- Testimonials Table (Admin CMS → Reviews; rendered on the home page)
-- NOTE: Admin CMS manages these via Supabase. If you enabled RLS on this
-- table but only created a SELECT policy, deletes/edits from the admin panel
-- will silently fail. Run the two policies below (after enabling RLS) so the
-- app (anon key) can INSERT / UPDATE / DELETE.
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Private Buyer',
  rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  photo TEXT DEFAULT '👤',
  is_featured BOOLEAN DEFAULT true
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
-- (public.auctions RLS is provisioned canonically in public/auction_engine.sql)
ALTER TABLE public.sales_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Testimonials need full access for Admin CMS (edit/delete) via the anon key.
CREATE POLICY "Public Read Testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Anon Manage Testimonials" ON public.testimonials
  FOR ALL USING (true) WITH CHECK (true);

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
  is_approved?: boolean;
  status?: string;
}

export interface Inspection {
  id: string;
  created_at: string;
  car_id?: string;
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
  // Union merged with the src/types.ts Inspection definition so every status
  // either codebase writes compiles cleanly:
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
  report_120_json?: string;
  report_150_json?: string;
  is_certified?: boolean;
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

// NOTE: The canonical auction record type is `AuctionRecord` (with the
// canonical `AuctionStatus` union) exported from `@/src/lib/auctions`. The
// legacy flat `Auction` interface (status "active" | "ended") was retired to
// remove the conflicting auction schema — import `AuctionRecord` instead.

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
  type: "test_drive" | "buy_now" | "whatsapp" | "call_request" | "call_back";
  // Legacy values ("pending"/"contacted"/"resolved") remain valid; the Sales
  // CRM pipeline (src/lib/salesCrm.ts) adds the full stage vocabulary and
  // maps legacy values onto it without breaking existing rows.
  status: "pending" | "contacted" | "resolved" | "new" | "qualified" | "appointment" | "test_drive" | "negotiation" | "booked" | "sold" | "lost" | "payment_submitted";
  notes?: string;
  // Auto-assignment: the Sales Associate who uploaded the target car.
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
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
