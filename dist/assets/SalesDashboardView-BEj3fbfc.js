import{r as a,j as e}from"./vendor-react-BPYgrMta.js";import{B as n,c as i,i as u,s as E}from"./index-CFIMSden.js";import{D as b,R as L,M as I,P as R,c as _,A as v,V as D,z as C,b as y,I as k}from"./vendor-icons-Pl_EaRIu.js";import"./vendor-CYRyQfiU.js";import"./vendor-supabase-DtC9jAym.js";const h=`-- Custom User Profiles & Roles Table
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
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
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
`,X=()=>{localStorage.getItem("1stcars_saved_cars")||localStorage.setItem("1stcars_saved_cars",JSON.stringify(["car-1","car-3"])),localStorage.getItem("1stcars_test_drives")||localStorage.setItem("1stcars_test_drives",JSON.stringify([{id:"td-1",car_id:"car-1",car_title:"Porsche 911 Carrera S",date:"2026-07-20",time:"11:00 AM",status:"Approved"}])),localStorage.getItem("1stcars_orders")||localStorage.setItem("1stcars_orders",JSON.stringify([{id:"ord-1",car_id:"car-3",car_title:"BMW M4 Competition",price:924e4,date:"2026-07-17",status:"Booking Confirmed"}]))};typeof window<"u"&&X();function W({onBackToInventory:g}){const[s,f]=a.useState([]),[T,x]=a.useState(!0),[A,p]=a.useState(!1),[o,U]=a.useState("all"),c=async()=>{x(!0);const{data:t}=await E.from("sales_notifications").select();t&&f(t),x(!1)};a.useEffect(()=>{c()},[]);const m=async(t,r)=>{await E.from("sales_notifications").update({status:r}).eq("id",t),c()},S=async t=>{confirm("Are you sure you want to permanently delete this lead from the database?")&&(await E.from("sales_notifications").delete().eq("id",t),c())},O=()=>{navigator.clipboard.writeText(h),p(!0),setTimeout(()=>p(!1),2500)},N=a.useMemo(()=>o==="all"?s:s.filter(t=>t.status===o),[s,o]),d=a.useMemo(()=>{const t=s.length,r=s.filter(l=>l.status==="pending").length,j=s.filter(l=>l.status==="contacted").length,w=s.filter(l=>l.status==="resolved").length;return{total:t,pending:r,contacted:j,resolved:w}},[s]);return e.jsx("div",{className:"bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-24 text-left",children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{children:[e.jsxs("p",{className:"text-xs font-black tracking-widest text-[#2E7D32] uppercase mb-1 flex items-center gap-1.5",children:[e.jsx(b,{className:"h-4 w-4"})," CRM Sales Desk Console"]}),e.jsxs("h1",{className:"text-3xl md:text-4xl font-black text-slate-900 tracking-tighter",children:["Active Sales ",e.jsx("span",{className:"text-[#2E7D32]",children:"Notifications"})]}),e.jsx("p",{className:"text-xs text-slate-500 mt-1 max-w-xl",children:"Real-time workspace for Sales Associates to track premium test drives, inquiries, and booking leads logged in the database."})]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsxs(n,{variant:"outline",onClick:c,className:"border-[#2E7D32]/10 text-slate-700 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-white",children:[e.jsx(L,{className:i("h-4 w-4",T&&"animate-spin")})," Refresh"]}),e.jsx(n,{onClick:g,className:"bg-[#2E7D32] hover:bg-[#25632a] text-white h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider",children:"Browse Inventory"})]})]}),e.jsx("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-4",children:[{label:"Total Leads",val:d.total,color:"border-slate-100 bg-white"},{label:"Pending Review",val:d.pending,color:"border-amber-200 bg-amber-50/40 text-amber-600"},{label:"In Discussion",val:d.contacted,color:"border-blue-200 bg-blue-50/40 text-blue-600"},{label:"Acquired / Closed",val:d.resolved,color:"border-emerald-200 bg-emerald-50/40 text-emerald-600"}].map((t,r)=>e.jsxs("div",{className:i("border p-5 rounded-2xl flex flex-col justify-between shadow-sm",t.color),children:[e.jsx("span",{className:"text-[10px] font-black uppercase tracking-widest text-slate-400",children:t.label}),e.jsx("span",{className:"text-3xl font-black tracking-tight mt-1",children:t.val})]},r))}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-12 gap-8 items-start",children:[e.jsxs("div",{className:"lg:col-span-8 space-y-6",children:[e.jsx("div",{className:"bg-white border border-[#2E7D32]/10 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto shadow-sm",children:[{id:"all",label:"All Database Leads"},{id:"pending",label:"Pending"},{id:"contacted",label:"Contacted"},{id:"resolved",label:"Resolved"}].map(t=>e.jsx("button",{onClick:()=>U(t.id),className:i("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",o===t.id?"bg-[#2E7D32] text-white":"text-slate-500 hover:bg-slate-50"),children:t.label},t.id))}),T?e.jsxs("div",{className:"bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-xs",children:[e.jsx(L,{className:"h-8 w-8 text-[#2E7D32] animate-spin mx-auto mb-4"}),e.jsx("p",{className:"text-xs font-bold text-slate-400 uppercase tracking-widest",children:"Querying notifications table..."})]}):N.length>0?e.jsx("div",{className:"space-y-4",children:N.map(t=>e.jsxs("div",{className:i("bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row justify-between gap-5",t.status==="pending"&&"border-amber-100 bg-amber-50/5",t.status==="contacted"&&"border-blue-100 bg-blue-50/5",t.status==="resolved"&&"border-emerald-100"),children:[e.jsxs("div",{className:"space-y-3.5 flex-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-2.5 flex-wrap",children:[e.jsx(u,{className:i("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border-none text-white",t.type==="test_drive"?"bg-[#2E7D32]":t.type==="buy_now"?"bg-amber-600":"bg-sky-600"),children:t.type.replace("_"," ")}),e.jsx(u,{className:i("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",t.status==="pending"&&"bg-amber-100 text-amber-700 border-amber-200",t.status==="contacted"&&"bg-blue-100 text-blue-700 border-blue-200",t.status==="resolved"&&"bg-emerald-100 text-emerald-700 border-emerald-200"),children:t.status}),e.jsxs("span",{className:"text-[10px] font-mono text-slate-400",children:["ID: ",t.id," • ",new Date(t.created_at).toLocaleString()]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-black text-lg text-slate-900 tracking-tight",children:t.name}),e.jsxs("p",{className:"text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-widest",children:[e.jsx(I,{className:"h-3 w-3 text-slate-400"})," Lead Location: ",t.city]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold text-slate-600",children:[e.jsxs("a",{href:`tel:${t.mobile}`,className:"flex items-center gap-2 hover:text-[#2E7D32]",children:[e.jsx(R,{className:"h-3.5 w-3.5 text-[#2E7D32]"}),e.jsx("span",{children:t.mobile})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(_,{className:"h-3.5 w-3.5 text-[#2E7D32]"}),e.jsxs("span",{children:["Pref: ",t.preferred_date," (",t.preferred_time,")"]})]})]}),e.jsx("div",{className:"p-3 bg-[#FAF9F6] rounded-xl border border-slate-100 text-xs font-bold flex items-center justify-between",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(v,{className:"h-4 w-4 text-[#2E7D32]"}),e.jsxs("span",{children:["Target Car: ",e.jsxs("strong",{className:"text-slate-800",children:[t.car_brand," ",t.car_model]})]})]})}),t.notes&&e.jsxs("p",{className:"text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic",children:['" ',t.notes,' "']})]}),e.jsxs("div",{className:"flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0",children:[e.jsxs("div",{className:"flex gap-1.5 w-full md:w-auto",children:[t.status!=="contacted"&&e.jsx(n,{size:"sm",onClick:()=>m(t.id,"contacted"),className:"bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5",children:"Mark In Discussion"}),t.status!=="resolved"&&e.jsx(n,{size:"sm",onClick:()=>m(t.id,"resolved"),className:"bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5",children:"✔️ Mark Closed"})]}),e.jsxs(n,{variant:"outline",size:"sm",onClick:()=>S(t.id),className:"border-rose-100 hover:bg-rose-50 text-rose-600 h-8 rounded-lg px-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-full md:w-auto justify-center",children:[e.jsx(D,{className:"h-3.5 w-3.5"})," Delete Lead"]})]})]},t.id))}):e.jsxs("div",{className:"bg-white border border-[#2E7D32]/10 rounded-3xl p-16 text-center shadow-xs",children:[e.jsx(C,{className:"h-10 w-10 text-emerald-500 mx-auto mb-4"}),e.jsx("h3",{className:"text-lg font-black text-slate-900 tracking-tight",children:"Database Empty or Solved"}),e.jsx("p",{className:"text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed",children:"No active booking leads meet this criteria. Submit a new test drive booking from any car details screen to see it log here instantly!"})]})]}),e.jsxs("div",{className:"lg:col-span-4 bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-5 text-left",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"font-black text-lg text-slate-900 tracking-tight flex items-center gap-2",children:[e.jsx(b,{className:"h-4.5 w-4.5 text-[#2E7D32]"})," Supabase DDL SQL"]}),e.jsx("p",{className:"text-xs text-slate-400 mt-1 leading-relaxed",children:"This app uses an isolated database layout structure. Run the exact SQL script below in your Supabase SQL Editor to deploy the table instantly!"})]}),e.jsx("div",{className:"h-px bg-slate-100"}),e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"text-[10px] font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl border border-slate-950 overflow-x-auto max-h-72 leading-relaxed whitespace-pre font-bold",children:h}),e.jsx("button",{onClick:O,className:"absolute right-3 top-3 p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer",title:"Copy SQL code",children:A?e.jsx(y,{className:"h-4 w-4 text-emerald-400"}):e.jsx(k,{className:"h-4 w-4"})})]}),e.jsxs("div",{className:"p-4 bg-[#FAF9F6] border border-slate-100 rounded-xl space-y-2 text-xs font-bold text-slate-600",children:[e.jsx("p",{className:"text-[10px] font-black text-[#2E7D32] uppercase tracking-widest",children:"Supabase Setup Guide"}),e.jsxs("ul",{className:"space-y-2 pt-1 font-medium",children:[e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-[#2E7D32] font-black",children:"1."}),e.jsxs("span",{children:["Install ",e.jsx("code",{children:"@supabase/supabase-js"})," in project."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-[#2E7D32] font-black",children:"2."}),e.jsx("span",{children:"Execute the SQL DDL above in your Supabase SQL Editor."})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-[#2E7D32] font-black",children:"3."}),e.jsxs("span",{children:["Update your env with ",e.jsx("code",{children:"SUPABASE_URL"})," & ",e.jsx("code",{children:"ANON_KEY"}),"."]})]}),e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-[#2E7D32] font-black",children:"4."}),e.jsxs("span",{children:["Swap out ",e.jsx("code",{children:"supabaseMock"})," client for the live client!"]})]})]})]})]})]})]})})}export{W as SalesDashboardView};
