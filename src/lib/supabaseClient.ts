import { createClient } from "@supabase/supabase-js";

// Retrieve Supabase environment variables
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Production builds must NEVER fall back to the local mock database, even if
// the runtime localStorage override is present — the override is a
// development/testing-only escape hatch. If the Supabase env vars are missing
// in a production build, the app renders a blocking misconfiguration screen
// (see App.tsx) instead of silently serving demo data.
// @ts-ignore
const isProdBuild = typeof window !== "undefined" && import.meta.env.PROD;

// The localStorage override is ignored entirely in production builds.
const useMockOverride =
  !isProdBuild && typeof window !== "undefined" && localStorage.getItem("1stcars_use_mock_db") === "true";

export const isMissingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

export const isRealSupabase = !isMissingSupabaseEnv && !useMockOverride;

// Google OAuth errors from Supabase are sometimes opaque (e.g. SQLSTATE-level
// JSON like "Unsupported provider: provider is not enabled"). Map the known
// "Google provider not enabled in Auth settings" failure to an actionable,
// customer-friendly message instead of showing the raw error text.
export function friendlyOAuthErrorMessage(err: any, fallback: string): string {
  const raw = String(err?.message || "").toLowerCase();
  if (raw.includes("unsupported provider") || raw.includes("provider is not enabled")) {
    return "Google sign-in hasn't been turned on yet. Please type your details in the form below — or contact us and we'll enable it right away.";
  }
  return err?.message || fallback;
}

// True when a production build would otherwise fall back to the mock database.
export const isProdMockBlocked = isProdBuild && isMissingSupabaseEnv;

// Explicit environment validation: production must never silently fall back to
// the local mock database. Log a loud, actionable error when it would.
// @ts-ignore
if (typeof window !== "undefined" && import.meta.env.PROD) {
  if (isMissingSupabaseEnv) {
    console.error(
      "[1stCars] PRODUCTION MISCONFIGURATION: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. " +
      "The app must not serve local mock data in production. Set both env vars for the deployed build."
    );
  } else if (typeof window !== "undefined" && localStorage.getItem("1stcars_use_mock_db") === "true") {
    console.warn(
      "[1stCars] The local mock database override (1stcars_use_mock_db=true) is set but IGNORED in production."
    );
  }
}

// High-fidelity local database mock for a robust preview experience
class SupabaseMockClient {
  private getStorage<T>(key: string, defaultData: T[]): T[] {
    if (typeof window === "undefined") return defaultData;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultData;
  }

  private setStorage<T>(key: string, data: T[]) {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // ---- Secure credential store (kept separate from public profile data) ----
  // Passwords are NEVER stored on the profile object (which is world-readable
  // and returned in sessions). Instead we keep a salted SHA-256 hash in an
  // isolated storage key and verify against it on sign-in.
  private authStoreKey = "1stcars_sb_auth";

  private getCredentials(): Record<string, { salt: string; hash: string }> {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(this.authStoreKey);
    return raw ? JSON.parse(raw) : {};
  }

  private randomSalt(): string {
    const cryptoObj = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
    if (cryptoObj?.getRandomValues) {
      const arr = new Uint8Array(16);
      cryptoObj.getRandomValues(arr);
      return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const cryptoObj = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
    if (cryptoObj?.subtle) {
      const data = new TextEncoder().encode(`${salt}:${password}`);
      const digest = await cryptoObj.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback for non-crypto environments (keeps the demo functional).
    let h = 0;
    const str = `${salt}:${password}`;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return `fallback-${(h >>> 0).toString(16)}`;
  }

  private async setCredential(email: string, password: string) {
    if (typeof window === "undefined") return;
    const creds = this.getCredentials();
    const salt = this.randomSalt();
    creds[email] = { salt, hash: await this.hashPassword(password, salt) };
    localStorage.setItem(this.authStoreKey, JSON.stringify(creds));
  }

  private async verifyPassword(email: string, password: string | undefined): Promise<boolean> {
    const stored = this.getCredentials()[email];
    if (!stored) return false;
    if (password == null) return false;
    return (await this.hashPassword(password, stored.salt)) === stored.hash;
  }

  // Reactive state callbacks for auth change subscriptions
  private authListeners: Array<(event: string, session: any) => void> = [];


  private triggerAuthChange(event: string, session: any) {
    this.authListeners.forEach((cb) => cb(event, session));
  }

  // Tables mapping to their storage keys
  private getTableKey(table: string): string {
    return `1stcars_sb_${table}`;
  }

  private getInitialData(table: string): any[] {
    switch (table) {
      case "profiles":
        return [
          { id: "u-buyer", name: "Rahul Sharma", email: "buyer@1stcars.com", mobile: "9876543210", role: "Buyer", city: "Mumbai", created_at: new Date().toISOString() },
          { id: "u-seller", name: "Amit Verma", email: "seller@1stcars.com", mobile: "9123456789", role: "Seller", city: "Delhi NCR", created_at: new Date().toISOString() },
          { id: "u-dealer", name: "Elite Motors Dealer", email: "dealer@1stcars.com", mobile: "9234567890", role: "Dealer", city: "Bangalore", is_verified: true, is_approved: true, created_at: new Date().toISOString() },
          { id: "u-dealer2", name: "Express Wheels Ltd", email: "dealer2@1stcars.com", mobile: "9234567891", role: "Dealer", city: "Mumbai", is_verified: true, is_approved: true, created_at: new Date().toISOString() },
          { id: "u-inspector", name: "Vikram Rathore", email: "inspector@1stcars.com", mobile: "9345678901", role: "Inspector", city: "Mumbai", created_at: new Date().toISOString() },
          { id: "u-sales", name: "Sneha Patel", email: "sales@1stcars.com", mobile: "9456789012", role: "Sales Associate", city: "Delhi NCR", created_at: new Date().toISOString() },
          { id: "u-admin", name: "Arjun Desai", email: "admin@1stcars.com", mobile: "9567890123", role: "Admin", city: "Surat", created_at: new Date().toISOString() }
        ];
      case "brands":
        return [
          { id: "b-1", name: "Porsche", logo_url: "🏎️", is_popular: true, created_at: new Date().toISOString() },
          { id: "b-2", name: "BMW", logo_url: "🚙", is_popular: true, created_at: new Date().toISOString() },
          { id: "b-3", name: "Mercedes-Benz", logo_url: "🚗", is_popular: true, created_at: new Date().toISOString() },
          { id: "b-4", name: "Audi", logo_url: "🚘", is_popular: true, created_at: new Date().toISOString() },
          { id: "b-5", name: "Maruti Suzuki", logo_url: "🚗", is_popular: false, created_at: new Date().toISOString() },
          { id: "b-6", name: "Hyundai", logo_url: "🚘", is_popular: false, created_at: new Date().toISOString() }
        ];
      case "cars":
        return [
          {
            id: "car-1",
            title: "Porsche 911 Carrera S",
            brand: "Porsche",
            model: "911 Carrera S",
            variant: "3.0L Twin-Turbo",
            year: 2022,
            price: 18500000,
            km_driven: 6200,
            fuel: "Petrol",
            transmission: "Automatic",
            owner_count: 1,
            city: "Mumbai",
            reg_number: "MH02-FJ-9111",
            color: "GT Silver Metallic",
            insurance_type: "Comprehensive",
            overall_score: 9.8,
            status: "available",
            created_at: new Date().toISOString()
          },
          {
            id: "car-2",
            title: "Mercedes-Benz G-Class AMG G 63",
            brand: "Mercedes-Benz",
            model: "G-Class",
            variant: "AMG G 63",
            year: 2021,
            price: 24500000,
            km_driven: 14500,
            fuel: "Petrol",
            transmission: "Automatic",
            owner_count: 1,
            city: "Mumbai",
            reg_number: "MH04-G-6363",
            color: "Obsidian Black",
            insurance_type: "Comprehensive",
            overall_score: 9.6,
            status: "available",
            created_at: new Date().toISOString()
          },
          {
            id: "car-3",
            title: "BMW M4 Competition",
            brand: "BMW",
            model: "M4 Competition",
            variant: "M xDrive",
            year: 2023,
            price: 14800000,
            km_driven: 2100,
            fuel: "Petrol",
            transmission: "Automatic",
            owner_count: 1,
            city: "Delhi NCR",
            reg_number: "DL1C-Z-4444",
            color: "Isle of Man Green",
            insurance_type: "Comprehensive",
            overall_score: 9.9,
            status: "available",
            created_at: new Date().toISOString()
          }
        ];
      case "inspections":
        return [
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
            seller_id: "u-seller",
            seller_name: "Amit Verma",
            seller_mobile: "9123456789",
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
          }
        ];
      case "notifications":
        return [
          {
            id: "notif-1",
            recipient_id: "u-buyer",
            title: "Welcome to 1stCars!",
            message: "Verify your email and complete your buyer profile to schedule a test drive on premium models.",
            type: "info",
            is_read: false,
            created_at: new Date().toISOString()
          }
        ];
      case "offers":
        return [
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
      case "auctions":
        // Auction engine V1 uses a structured schema (see public/auction_engine.sql).
        // The mock table starts empty and the auction service seeds a live demo
        // auction on first use. Legacy "car_title" rows are ignored by the service.
        return [];
      case "auction_status_flow":
        return [
          { from_status: "DRAFT", to_status: "DRAFT" }, { from_status: "DRAFT", to_status: "READY" },
          { from_status: "DRAFT", to_status: "SCHEDULED" }, { from_status: "DRAFT", to_status: "CANCELLED" },
          { from_status: "READY", to_status: "READY" }, { from_status: "READY", to_status: "SCHEDULED" },
          { from_status: "READY", to_status: "LIVE" }, { from_status: "READY", to_status: "CANCELLED" },
          { from_status: "SCHEDULED", to_status: "SCHEDULED" }, { from_status: "SCHEDULED", to_status: "LIVE" },
          { from_status: "SCHEDULED", to_status: "CANCELLED" }, { from_status: "SCHEDULED", to_status: "DRAFT" },
          { from_status: "LIVE", to_status: "LIVE" }, { from_status: "LIVE", to_status: "EXTENDED" },
          { from_status: "LIVE", to_status: "CLOSING" }, { from_status: "LIVE", to_status: "CANCELLED" },
          { from_status: "EXTENDED", to_status: "EXTENDED" }, { from_status: "EXTENDED", to_status: "CLOSING" },
          { from_status: "EXTENDED", to_status: "CANCELLED" },
          { from_status: "CLOSING", to_status: "CLOSING" }, { from_status: "CLOSING", to_status: "CLOSED" },
          { from_status: "CLOSING", to_status: "SELLER_REVIEW" }, { from_status: "CLOSING", to_status: "EXPIRED" },
          { from_status: "CLOSING", to_status: "CANCELLED" },
          { from_status: "CLOSED", to_status: "SELLER_REVIEW" }, { from_status: "CLOSED", to_status: "ACCEPTED" },
          { from_status: "CLOSED", to_status: "REJECTED" },
          { from_status: "SELLER_REVIEW", to_status: "SELLER_REVIEW" }, { from_status: "SELLER_REVIEW", to_status: "ACCEPTED" },
          { from_status: "SELLER_REVIEW", to_status: "REJECTED" }, { from_status: "SELLER_REVIEW", to_status: "CANCELLED" },
          { from_status: "ACCEPTED", to_status: "ACCEPTED" },
          { from_status: "REJECTED", to_status: "REJECTED" },
          { from_status: "EXPIRED", to_status: "EXPIRED" },
          { from_status: "CANCELLED", to_status: "CANCELLED" }
        ];
      case "auction_bids":
        return [];
      case "auction_dealer_eligibility":
        return [];
      case "auction_payments":
        return [];
      case "sales_notifications":
        return [
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
      case "pages":
        return [
          {
            id: "p-about",
            title: "About Us",
            slug: "about-us",
            content: `# About 1stCars\n\n1stCars is the premier marketplace for certified premium pre-owned vehicles inside the **Gujarat region** (Surat, Bharuch, Vadodara, Vapi). We stand by absolute transparency, zero-tolerance for tampered odometers, and 100% certified chassis security.\n\n### Our Quality Pillars\n\n- **120-Point Inspection**: Done by master structural engineers on-site.\n- **True Kilometers Guarantee**: Multiple ECU-sweep diagnostics.\n\n### Contact Details\n- **Email**: support@1stcars.com\n- **Mobile**: +91 8866377722\n- **Office**: 1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India`,
            created_at: new Date().toISOString(),
            is_footer: false
          },
          {
            id: "p-faq",
            title: "FAQs",
            slug: "faqs",
            content: `# Frequently Asked Questions\n\nBrowse quick answers about buying, selling, inspections, certification, financing, test drives, payments, delivery, accounts and more on 1stCars.\n\n## Buying\n\n### How do I buy a car from 1stCars?\nBrowse available cars, open the vehicle details, book a test drive where available, and continue with the buying process. A refundable booking token reserves the car and gives you priority assistance.\n\n### Can I book a test drive?\nYes, where the option is available on the vehicle listing. Our concierge team coordinates a convenient slot for you.\n\n### How do I reserve a car?\nPay a refundable booking token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price.\n\n## Selling\n\n### How can I sell my car?\nStart by submitting your car details and booking a free doorstep inspection. After inspection, verified elite dealers compete in a live, time-boxed auction to offer you the best value.\n\n### What documents do I need to sell?\nYou will need the RC, valid insurance, pollution certificate and your identity proof. Our team helps you gather and verify everything.\n\n### Is there any cost to list my car?\nNo. The doorstep inspection is free, and there are no hidden listing charges.\n\n## Inspection\n\n### What does the inspection cover?\nThe inspection checks exterior, body, structure, mechanical components, electrical systems, interior, tyres and other relevant vehicle details.\n\n### Do you check for odometer tampering?\nYes. We verify genuine kilometres through multiple ECU-sweep diagnostics. Vehicles with tampered odometers are automatically delisted.\n\n### Can I get a doorstep inspection?\nYes. Our equipped team vans visit any address across Surat, Vadodara, Bharuch and Vapi, usually within 24 hours.\n\n## Certification\n\n### What is the 1stMark Certificate?\nIt is our exclusive certificate, signed off by a Master Engineer, issued to every vehicle that passes the 120-Point Inspection.\n\n### How is a vehicle graded?\nEach car is graded across 12 vital mechanical and structural categories and assigned an official Vehicle Grade of A+, A, B+ or B.\n\n## Financing\n\n### Can I get a car loan or EMI?\nYes. Each listing has an EMI calculator and our concierge team can guide you through financing with our partner banks and NBFCs.\n\n### Does 1stCars finance directly?\nWe partner with banks and NBFCs and assist you end-to-end; we do not lend directly.\n\n## Test drive\n\n### How do I book a test drive?\nUse the option on the vehicle listing or contact our concierge team. Test drives are arranged subject to availability.\n\n### Is the test drive free?\nYes, where the test drive option is available on the listing.\n\n## Payments\n\n### What is the booking token?\nIt is a refundable token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price.\n\n### Are there any hidden charges?\nNo. The full price breakup, including RC transfer and documentation charges, is shown transparently at checkout.\n\n## Delivery\n\n### Do you offer home delivery?\nWe facilitate delivery and ownership transfer assistance across Gujarat for your purchased vehicle.\n\n### How is RC transfer handled?\nOwnership transfer, RC transfer and applicable road tax are facilitated by 1stCars or its authorised partners; related charges appear in the price breakup.\n\n## Account & safety\n\n### How do I create an account?\nSign up with your email or mobile number and verify via OTP. You can choose a role such as Buyer, Seller or Dealer.\n\n### Is my personal data safe?\nYour data is handled per our Privacy Policy and applicable laws. Mobile numbers used for OTP and coordination are kept strictly private.\n\n## General\n\n### Where does 1stCars operate?\nCurrently, 1stCars is focused on Gujarat, starting with Surat, and serves Vadodara, Bharuch and Vapi.\n\n### How can I contact 1stCars?\nUse the contact options available on the website, email support@1stcars.com, or visit our Surat experience centre.`,
            created_at: new Date().toISOString(),
            is_footer: false
          },
          {
            id: "p-certificate",
            title: "120-Point Certificate",
            slug: "120-point-certificate",
            content: `# 120-Point Structural & Technical Inspection\n\nBefore any premium car makes it to the **1stCars** inventory, it undergoes a meticulous **120-point check** executed by our certified structural engineers.\n\n### Core Inspection Categories\n\n#### 1. Frame & Chassis Integrity (30 Points)\n- Structural chassis rail scan to detect past impact damage.\n- Roof pillar thickness gauge measurement (paint depth analysis).\n- Subframe alignment verification using precision laser tools.\n\n#### 2. Powertrain & OBD Diagnostics (30 Points)\n- Cylinder compression test and spark plug inspection.\n- OBD-II electronic scan for historical fault codes.\n- Exhaust smoke color and emission levels check.\n- Transmission shift latency and clutch pressure test.\n\n#### 3. Suspension, Brakes & Underbody (30 Points)\n- Shock absorber damping rates and fluid leakage check.\n- Brake disc thickness and pad wear percentage.\n- Steering rack play and boot integrity.\n- Fuel tank and line safety check.\n\n#### 4. Interior, Electricals & Comfort (30 Points)\n- Infotainment system, GPS, and speakers.\n- Multi-zone climate control cooling and heating test.\n- Airbag modules and sensor validation.\n\nEvery vehicle that passes is issued our exclusive **1stMark Gold Certificate**, signed off by a Master Engineer.`,
            created_at: new Date().toISOString(),
            is_footer: true
          },
          {
            id: "p-terms",
            title: "Terms & Conditions",
            slug: "terms-and-conditions",
            content: `# 1stCars Terms & Conditions of Business

**Last Updated: August 2026**

These Terms & Conditions ("Terms") govern your access to and use of the 1stCars marketplace, website, and related services (together, the "Platform"). By accessing the Platform, browsing listings, or using any of our services — including buying, selling, or booking vehicle inspections — you agree to be bound by these Terms.

If you do not agree with any part of these Terms, please discontinue use of the Platform immediately.

---

## 1. About 1stCars

1stCars is a certified pre-owned vehicle marketplace operating across Gujarat, India. We connect verified car buyers, sellers, and elite dealers through transparent, deal-mediated processes. Every vehicle listed on the Platform undergoes our 120-Point Inspection and is graded across 12 vital mechanical and structural categories before listing.

---

## 2. Acceptance of Terms

- By using the Platform, you confirm that you are at least 18 years of age and legally capable of entering into binding contracts.
- These Terms, together with our Privacy Policy and any additional policies referenced herein, form the complete agreement between you and 1stCars.
- If you use the Platform on behalf of a business or organization, you represent that you are authorised to bind that entity to these Terms.

---

## 3. Marketplace Services

### 3.1 For Buyers
- All listed vehicles are vetted, inspected, and priced transparently. The displayed price is the drive-away price and includes the cost breakup shown at checkout.
- A refundable booking token equal to 1% of the vehicle's value (minimum ₹3,000, maximum ₹10,000) is payable to reserve a vehicle and receive priority assistance. The token is 100% refundable as described in Section 7.
- Vehicle ownership, RC transfer, and documentation assistance are provided to facilitate a smooth and compliant transfer.

### 3.2 For Sellers
- Sellers can request a free doorstep inspection through the Platform. A certified 1stCars inspector will contact you to confirm coordinates and schedule.
- Post-inspection, verified elite dealers compete in live, time-boxed bidding auctions to offer you the best competitive value.
- You agree to provide accurate and truthful information about your vehicle, including its odometer reading, ownership history, and condition.

---

## 4. Vehicle Listings & Accuracy

- 1stCars takes reasonable care to ensure listings are accurate; however, photographs and descriptions are indicative and may not reflect every minor detail.
- Odometer readings are verified during inspection. We do not list vehicles with tampered odometers, and any such finding leads to automatic delisting.
- Vehicle availability is subject to change without prior notice. A vehicle shown as available may be reserved or sold at any time.

---

## 5. Inspections & Certification

- The 120-Point Certification is performed by trained 1stCars inspectors using standardised checklists across engine, transmission, chassis, electronics, exterior, and interior categories.
- Certification reflects the condition of the vehicle at the time of inspection. Wear and tear arising after inspection is not covered by the certification.
- Inspection reports are for informational purposes and do not constitute a mechanical warranty unless separately agreed in writing.

---

## 6. Bookings & Reservations

- A booking creates a reservation for a specific vehicle and does not transfer ownership until full payment and legal documentation are completed.
- We may require mobile number verification via OTP and contact details to process your booking. By providing these details you consent to being contacted by our concierge team.
- Priority assistance is provided to buyers who complete the token payment, subject to availability.

---

## 7. Booking Token & Payments

- The booking token (1% of the vehicle value, min ₹3,000 / max ₹10,000) is refundable and is adjusted against the total drive-away price at final payment.
- Token refunds are processed within 7–10 working days to the same payment method, provided no applicable cancellation or damage policy is triggered.
- All payments are to be made in Indian Rupees (INR). You are responsible for ensuring the accuracy of UPI / bank details provided.

---

## 8. Ownership Transfer & Documentation

- Ownership transfer, RC transfer, and applicable road tax are facilitated by 1stCars or its authorised partners, and the related charges are shown in the price breakup.
- You remain responsible for furnishing genuine documents (RC, insurance, pollution certificate, etc.) in a timely manner.
- 1stCars is not liable for delays caused by RTO or government processing timelines.

---

## 9. Limitation of Liability

- To the maximum extent permitted by law, 1stCars shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the Platform.
- Our total liability, whether in contract, tort, or otherwise, shall not exceed the amount of the booking token paid by you in respect of the transaction giving rise to the claim.
- The Platform is provided on an "as is" and "as available" basis. We do not warrant that the Platform will be uninterrupted, error-free, or free of harmful components.

---

## 10. Prohibited Conduct

You agree not to:

- Use the Platform for any unlawful purpose or in violation of applicable Indian laws.
- Misrepresent your identity, vehicle details, or any information provided to 1stCars.
- Attempt to manipulate prices, auctions, or listings.
- Interfere with the security, integrity, or performance of the Platform.
- Attempt to access data or accounts other than your own.

---

## 11. Intellectual Property

- All content on the Platform — including logos, text, graphics, and branding — is the property of 1stCars or its licensors and is protected by applicable intellectual property laws.
- You may not copy, reproduce, distribute, or create derivative works from any Platform content without prior written consent.

---

## 12. Privacy & Data

- Your personal data is handled in accordance with our Privacy Policy and applicable data protection laws.
- Mobile numbers provided for OTP verification and coordination are kept strictly private and used solely to dispatch inspectors, confirm quotes, and process bookings.

---

## 13. Third-Party Links & Services

- The Platform may contain links to third-party websites, UPI applications, or services. 1stCars is not responsible for the content, policies, or practices of such third parties.
- Payments made through third-party UPI apps are subject to the terms of the respective payment provider.

---

## 14. Governing Law & Jurisdiction

- These Terms are governed by the laws of India.
- Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Surat, Gujarat, India.

---

## 15. Amendments

- 1stCars reserves the right to modify these Terms at any time. The revised Terms will be posted on the Platform with an updated "Last Updated" date.
- Your continued use of the Platform after any amendment constitutes acceptance of the revised Terms.

---

## 16. Contact Us

For questions, concerns, or feedback regarding these Terms, please contact:

- **Email:** support@1stcars.com
- **Phone:** +91 8866377722
- **Address:** 1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India

---

*By continuing to use the 1stCars Platform, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.*`,
            created_at: new Date().toISOString(),
            is_footer: true
          },
          {
            id: "p-showrooms",
            title: "Our Location",
            slug: "our-location",
            content: `# 1stCars Flagship Showrooms\n\nExperience the finest pre-owned shopping experience in Gujarat. Visit one of our multi-brand flagship stores to view, inspect, and test drive our fleet.\n\n### 1. Surat Experience Center (Main Hub)\n- **Address**: 1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India\n- **Timings**: Monday - Sunday, 09:30 AM to 08:30 PM\n- **Phone**: +91 8866377722\n\n### 2. Vadodara Outlet\n- **Address**: Grand Central Galleria, Alkapuri, Vadodara, Gujarat - 390007\n- **Timings**: Monday - Saturday, 10:00 AM to 08:00 PM\n- **Phone**: +91 98888 88888\n\n### 3. Bharuch Express Depot\n- **Address**: Highway Landmark Arcade, NH-48, Bharuch, Gujarat - 392001\n- **Timings**: Monday - Saturday, 10:00 AM to 07:00 PM\n- **Phone**: +91 97777 77777\n\n### 4. Vapi Collection Center\n- **Address**: Premium Hub Plaza, Char Rasta, Vapi, Gujarat - 396191\n- **Timings**: Monday - Saturday, 10:00 AM to 07:30 PM\n- **Phone**: +91 96666 66666`,
            created_at: new Date().toISOString(),
            is_footer: true
          }
        ];
      case "faq":
        return [
          // ---- Buying ----
          { id: "fq-buy-1", category: "Buying", display_order: 1, question: "How do I buy a car from 1stCars?", answer: "Browse available cars, open the vehicle details, book a test drive where available, and continue with the buying process. A refundable booking token reserves the car and gives you priority assistance." },
          { id: "fq-buy-2", category: "Buying", display_order: 2, question: "Can I book a test drive?", answer: "Yes, where the option is available on the vehicle listing. Our concierge team coordinates a convenient slot for you to experience the car before you decide." },
          { id: "fq-buy-3", category: "Buying", display_order: 3, question: "Are the cars inspected?", answer: "Yes. Vehicles listed through our certified process undergo the 120-Point Inspection and are graded across 12 vital mechanical and structural categories before they go live." },
          { id: "fq-buy-4", category: "Buying", display_order: 4, question: "What is included in the displayed price?", answer: "The displayed price is the drive-away price and includes a transparent cost breakup shown at checkout. Applicable RC transfer and documentation charges are part of that breakup." },
          { id: "fq-buy-5", category: "Buying", display_order: 5, question: "How do I reserve a car?", answer: "Pay a refundable booking token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price and is 100% refundable as per our policy." },
          { id: "fq-buy-6", category: "Buying", display_order: 6, question: "Do you offer financing or EMI?", answer: "Every listing includes an EMI calculator, and our team can guide you through financing options during the buying process." },
          // ---- Selling ----
          { id: "fq-sell-1", category: "Selling", display_order: 1, question: "How can I sell my car?", answer: "Start by submitting your car details and booking a free doorstep inspection. After inspection, verified elite dealers compete in a live, time-boxed auction to offer you the best value." },
          { id: "fq-sell-2", category: "Selling", display_order: 2, question: "Where does the inspection happen?", answer: "Depending on the available option, inspection can be arranged at a suitable location or our inspection centre across Surat, Vadodara, Bharuch and Vapi." },
          { id: "fq-sell-3", category: "Selling", display_order: 3, question: "How is my car valued?", answer: "We consider the vehicle's details, condition and current market factors to determine its value, then let competing dealers bid so you receive a competitive market price." },
          { id: "fq-sell-4", category: "Selling", display_order: 4, question: "What documents do I need to sell?", answer: "You will need the RC, valid insurance, pollution certificate and your identity proof. Our team helps you gather and verify everything." },
          { id: "fq-sell-5", category: "Selling", display_order: 5, question: "How and when do I get paid?", answer: "Once you accept a dealer's offer, payment is processed and RC transfer is facilitated by 1stCars or its authorised partners." },
          { id: "fq-sell-6", category: "Selling", display_order: 6, question: "Is there any cost to list my car?", answer: "No. The doorstep inspection is free, and there are no hidden listing charges." },
          // ---- Inspection ----
          { id: "fq-insp-1", category: "Inspection", display_order: 1, question: "What does the inspection cover?", answer: "The inspection checks important areas such as exterior, body, structure, mechanical components, electrical systems, interior, tyres and other relevant vehicle details." },
          { id: "fq-insp-2", category: "Inspection", display_order: 2, question: "How long does an inspection take?", answer: "Inspections are typically completed within 24 hours of the scheduled slot." },
          { id: "fq-insp-3", category: "Inspection", display_order: 3, question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
          { id: "fq-insp-4", category: "Inspection", display_order: 4, question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification covers three core pillars: Single Owned, Non-Accident Trusted, and Genuine KM verified through OBD diagnostics and service log sweeps." },
          { id: "fq-insp-5", category: "Inspection", display_order: 5, question: "Do you check for odometer tampering?", answer: "Yes. We verify genuine kilometres through multiple ECU-sweep diagnostics. Vehicles with tampered odometers are automatically delisted." },
          { id: "fq-insp-6", category: "Inspection", display_order: 6, question: "Can I get a doorstep inspection?", answer: "Yes. Our equipped team vans visit any address across Surat, Vadodara, Bharuch and Vapi, usually within 24 hours." },
          // ---- Certification ----
          { id: "fq-cert-1", category: "Certification", display_order: 1, question: "What is the 1stMark Certificate?", answer: "It is our exclusive certificate, signed off by a Master Engineer, issued to every vehicle that passes the 120-Point Inspection." },
          { id: "fq-cert-2", category: "Certification", display_order: 2, question: "Is certification the same as a warranty?", answer: "No. The certification reflects the vehicle's condition at the time of inspection and is informational. It is not a mechanical warranty unless separately agreed in writing." },
          { id: "fq-cert-3", category: "Certification", display_order: 3, question: "How is a vehicle graded?", answer: "Each car is graded across 12 vital mechanical and structural categories and assigned an official Vehicle Grade of A+, A, B+ or B." },
          { id: "fq-cert-4", category: "Certification", display_order: 4, question: "What happens if a car fails inspection?", answer: "The vehicle is not listed until the issues are resolved or it is withdrawn. We only list cars that meet our certification standards." },
          // ---- Financing ----
          { id: "fq-fin-1", category: "Financing", display_order: 1, question: "Can I get a car loan or EMI?", answer: "Yes. Each listing has an EMI calculator and our concierge team can guide you through financing with our partner banks and NBFCs." },
          { id: "fq-fin-2", category: "Financing", display_order: 2, question: "What are the eligibility requirements?", answer: "Standard KYC such as identity, address and income proof is required. Exact eligibility depends on the financier and the chosen model." },
          { id: "fq-fin-3", category: "Financing", display_order: 3, question: "Is there a down payment?", answer: "The booking token (1% of value, min ₹3,000, max ₹10,000) is adjustable against the price; the financier decides the loan-to-value and down payment." },
          { id: "fq-fin-4", category: "Financing", display_order: 4, question: "Does 1stCars finance directly?", answer: "We partner with banks and NBFCs and assist you end-to-end; we do not lend directly." },
          // ---- Test drive ----
          { id: "fq-td-1", category: "Test drive", display_order: 1, question: "How do I book a test drive?", answer: "Use the option on the vehicle listing or contact our concierge team. Test drives are arranged subject to availability." },
          { id: "fq-td-2", category: "Test drive", display_order: 2, question: "Is the test drive free?", answer: "Yes, where the test drive option is available on the listing." },
          { id: "fq-td-3", category: "Test drive", display_order: 3, question: "Can I test drive before paying the token?", answer: "Yes. You can experience the car first wherever the test drive option is available, then decide on the booking token." },
          { id: "fq-td-4", category: "Test drive", display_order: 4, question: "Where does the test drive happen?", answer: "At our experience centre or an arranged location convenient to you, based on availability." },
          // ---- Payments ----
          { id: "fq-pay-1", category: "Payments", display_order: 1, question: "What payment methods are accepted?", answer: "Payments are made in Indian Rupees (INR) through UPI or bank transfer as shown at checkout." },
          { id: "fq-pay-2", category: "Payments", display_order: 2, question: "What is the booking token?", answer: "It is a refundable token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price." },
          { id: "fq-pay-3", category: "Payments", display_order: 3, question: "How long do token refunds take?", answer: "Refunds are processed within 7 to 10 working days to the same payment method, provided no applicable cancellation or damage policy is triggered." },
          { id: "fq-pay-4", category: "Payments", display_order: 4, question: "Are there any hidden charges?", answer: "No. The full price breakup, including RC transfer and documentation charges, is shown transparently at checkout." },
          // ---- Delivery ----
          { id: "fq-del-1", category: "Delivery", display_order: 1, question: "Do you offer home delivery?", answer: "We facilitate delivery and ownership transfer assistance across Gujarat for your purchased vehicle." },
          { id: "fq-del-2", category: "Delivery", display_order: 2, question: "How is RC transfer handled?", answer: "Ownership transfer, RC transfer and applicable road tax are facilitated by 1stCars or its authorised partners; related charges appear in the price breakup." },
          { id: "fq-del-3", category: "Delivery", display_order: 3, question: "How long does RC transfer take?", answer: "Timelines depend on RTO and government processing, which are outside our direct control. We keep you updated throughout." },
          { id: "fq-del-4", category: "Delivery", display_order: 4, question: "Who handles the paperwork?", answer: "Our team coordinates the documentation with you and the concerned authorities so the transfer is smooth and compliant." },
          // ---- Account & safety ----
          { id: "fq-acc-1", category: "Account & safety", display_order: 1, question: "How do I create an account?", answer: "Sign up with your email or mobile number and verify via OTP. You can choose a role such as Buyer, Seller or Dealer." },
          { id: "fq-acc-2", category: "Account & safety", display_order: 2, question: "Is my personal data safe?", answer: "Your data is handled per our Privacy Policy and applicable laws. Mobile numbers used for OTP and coordination are kept strictly private." },
          { id: "fq-acc-3", category: "Account & safety", display_order: 3, question: "How can I contact support?", answer: "Email support@1stcars.com or call our team. Contact details are also listed on our Location and Terms pages." },
          { id: "fq-acc-4", category: "Account & safety", display_order: 4, question: "Can I reset my password?", answer: "Yes, use the account recovery option and follow the verification steps sent to your registered email or mobile." },
          // ---- General ----
          { id: "fq-gen-1", category: "General", display_order: 1, question: "Where does 1stCars operate?", answer: "Currently, 1stCars is focused on Gujarat, starting with Surat, and serves Vadodara, Bharuch and Vapi." },
          { id: "fq-gen-2", category: "General", display_order: 2, question: "How can I contact 1stCars?", answer: "Use the contact options available on the website, email support@1stcars.com, or visit our Surat experience centre." },
          { id: "fq-gen-3", category: "General", display_order: 3, question: "What are the showroom timings?", answer: "The Surat Experience Center is open Monday to Sunday, 09:30 AM to 08:30 PM. Other outlets have their own timings listed on the Location page." },
          { id: "fq-gen-4", category: "General", display_order: 4, question: "Is 1stCars only in Gujarat?", answer: "Yes, we currently operate across Gujarat, beginning with Surat, with plans to expand to more regions." }
        ];
      default:
        return [];
    }
  }

  // High Fidelity Auth system using profiles
  public auth = {
    signUp: async ({ email, password, options }: any) => {
      const emailLower = email.toLowerCase();
      const profiles = this.getStorage<any>("1stcars_sb_profiles", this.getInitialData("profiles"));
      
      if (profiles.some((p) => p.email.toLowerCase() === emailLower)) {
        return { data: { user: null, session: null }, error: { message: "User already exists." } };
      }

      const role = options?.data?.role || "Buyer";
      const id = `usr-${Math.random().toString(36).substr(2, 9)}`;
      const newProfile = {
        id,
        email: emailLower,
        name: options?.data?.name || email.split("@")[0],
        mobile: options?.data?.mobile || "",
        role,
        city: options?.data?.city || "Mumbai",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updated = [...profiles, newProfile];
      this.setStorage("1stcars_sb_profiles", updated);

      // Persist a salted hash of the chosen password so sign-in can verify it.
      await this.setCredential(emailLower, password);

      const session = { access_token: `mock-jwt-${id}`, user: newProfile };

      localStorage.setItem("1stcars_sb_current_session", JSON.stringify(session));
      this.triggerAuthChange("SIGNED_IN", session);

      return { data: { user: newProfile, session }, error: null };
    },

    signInWithPassword: async ({ email, password }: any) => {
      const query = email.toLowerCase();
      const profiles = this.getStorage<any>("1stcars_sb_profiles", this.getInitialData("profiles"));
      const user = profiles.find((p) => p.email.toLowerCase() === query || p.mobile === query);

      if (!user) {
        return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
      }

      // Verify the password against the stored hash. A missing/incorrect
      // password is rejected — there is no shared backdoor password.
      const ok = await this.verifyPassword(user.email.toLowerCase(), password);
      if (!ok) {
        return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
      }

      const session = { access_token: `mock-jwt-${user.id}`, user };
      localStorage.setItem("1stcars_sb_current_session", JSON.stringify(session));
      this.triggerAuthChange("SIGNED_IN", session);
      return { data: { user, session }, error: null };
    },


    signOut: async () => {
      localStorage.removeItem("1stcars_sb_current_session");
      this.triggerAuthChange("SIGNED_OUT", null);
      return { error: null };
    },

    getSession: async () => {
      const raw = localStorage.getItem("1stcars_sb_current_session");
      return { data: { session: raw ? JSON.parse(raw) : null }, error: null };
    },

    getUser: async () => {
      const raw = localStorage.getItem("1stcars_sb_current_session");
      const session = raw ? JSON.parse(raw) : null;
      return { data: { user: session?.user || null }, error: null };
    },

    onAuthStateChange: (cb: (event: string, session: any) => void) => {
      this.authListeners.push(cb);
      // Run immediately with current state
      const raw = localStorage.getItem("1stcars_sb_current_session");
      const session = raw ? JSON.parse(raw) : null;
      cb("INITIAL_SESSION", session);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners = this.authListeners.filter((l) => l !== cb);
            }
          }
        }
      };
    }
  };

  // Highly robust custom query interface builder
  public from(table: string) {
    const storageKey = this.getTableKey(table);
    const initialData = this.getInitialData(table);
    let items = this.getStorage<any>(storageKey, initialData);

    // Auto-sync new fallback items if the database representation has been expanded
    if (table === "pages") {
      let changed = false;
      items = items.map((it: any) => {
        if (["p-certificate", "p-terms", "p-showrooms"].includes(it.id) && it.is_footer !== true) {
          it.is_footer = true;
          changed = true;
        } else if (["p-about", "p-faq"].includes(it.id) && it.is_footer !== false) {
          it.is_footer = false;
          changed = true;
        }
        return it;
      });
      if (items.length < initialData.length) {
        const existingIds = new Set(items.map((it: any) => it.id));
        const missing = initialData.filter((it: any) => !existingIds.has(it.id));
        if (missing.length > 0) {
          items = [...items, ...missing];
          changed = true;
        }
      }
      if (changed) {
        this.setStorage(storageKey, items);
      }
    }

    const queryState = {
      operation: "select" as "select" | "insert" | "update" | "delete" | "upsert",
      payload: null as any,
      filters: [] as Array<(item: any) => boolean>,
      orderField: null as string | null,
      orderAsc: true,
      limitVal: null as number | null
    };

    const chain = {
      select: (columns: string = "*") => {
        // `.select()` after a write (insert/update/upsert/delete) is Supabase's
        // "returning" clause — it must NOT downgrade a pending write back into a
        // read. Only mark this as a read query when no write op is queued, so that
        // `insert([...]).select()` still returns the newly created rows (and their
        // generated ids) on both the mock and the real Supabase client.
        if (!["insert", "update", "upsert", "delete"].includes(queryState.operation)) {
          queryState.operation = "select";
        }
        return chain;
      },

      eq: (column: string, value: any) => {
        queryState.filters.push((item) => String(item[column]) === String(value));
        return chain;
      },

      neq: (column: string, value: any) => {
        queryState.filters.push((item) => String(item[column]) !== String(value));
        return chain;
      },

      in: (column: string, values: any[]) => {
        queryState.filters.push((item) => values.map(String).includes(String(item[column])));
        return chain;
      },

      order: (column: string, { ascending = true } = {}) => {
        queryState.orderField = column;
        queryState.orderAsc = ascending;
        return chain;
      },

      limit: (count: number) => {
        queryState.limitVal = count;
        return chain;
      },

      // Fetch trigger
      then: async (resolve: any, reject: any) => {
        try {
          const res = await chain.execute();
          return resolve(res);
        } catch (e) {
          return reject(e);
        }
      },

      execute: async () => {
        if (queryState.operation === "insert") {
          const records = queryState.payload;
          const toInsert = Array.isArray(records) ? records : [records];
          const inserted = toInsert.map((rec) => ({
            id: rec.id || `${table.substring(0, 3)}-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...rec
          }));

          const updatedTable = [...inserted, ...items];
          this.setStorage(storageKey, updatedTable);
          return { data: Array.isArray(records) ? inserted : inserted[0], error: null };
        }

        if (queryState.operation === "update") {
          const changes = queryState.payload;
          let matchedCount = 0;
          const updatedTable = items.map((item) => {
            const matches = queryState.filters.every((filterFn) => filterFn(item));
            if (matches) {
              matchedCount++;
              return { ...item, ...changes, updated_at: new Date().toISOString() };
            }
            return item;
          });

          this.setStorage(storageKey, updatedTable);
          const updatedRecords = updatedTable.filter((item) =>
            queryState.filters.every((filterFn) => filterFn(item))
          );

          return { data: updatedRecords, error: null, count: matchedCount };
        }

        if (queryState.operation === "delete") {
          const beforeCount = items.length;
          const updatedTable = items.filter((item) =>
            !queryState.filters.every((filterFn) => filterFn(item))
          );

          this.setStorage(storageKey, updatedTable);
          return { data: true, error: null, count: beforeCount - updatedTable.length };
        }

        if (queryState.operation === "upsert") {
          const records = queryState.payload;
          const toUpsert = Array.isArray(records) ? records : [records];
          let updatedTable = [...items];

          const processed = toUpsert.map((rec) => {
            const existingIndex = updatedTable.findIndex((item) => item.id === rec.id);
            const itemPayload = {
              created_at: new Date().toISOString(),
              ...rec,
              updated_at: new Date().toISOString()
            };

            if (existingIndex !== -1) {
              updatedTable[existingIndex] = { ...updatedTable[existingIndex], ...itemPayload };
            } else {
              updatedTable.push(itemPayload);
            }
            return itemPayload;
          });

          this.setStorage(storageKey, updatedTable);
          return { data: Array.isArray(records) ? processed : processed[0], error: null };
        }

        // Default operation: "select"
        let result = [...items];
        
        // Apply filters
        queryState.filters.forEach((filterFn) => {
          result = result.filter(filterFn);
        });

        // Apply ordering
        if (queryState.orderField) {
          const field = queryState.orderField;
          const asc = queryState.orderAsc;
          result.sort((a, b) => {
            if (a[field] < b[field]) return asc ? -1 : 1;
            if (a[field] > b[field]) return asc ? 1 : -1;
            return 0;
          });
        }

        // Apply limit
        if (queryState.limitVal !== null) {
          result = result.slice(0, queryState.limitVal);
        }

        return { data: result, error: null };
      },

      single: async () => {
        const { data, error } = await chain.execute();
        if (error) return { data: null, error };
        return { data: data[0] || null, error: null };
      },

      maybeSingle: async () => {
        const { data, error } = await chain.execute();
        if (error) return { data: null, error };
        return { data: data[0] || null, error: null };
      },

      insert: (records: any | any[]) => {
        queryState.operation = "insert";
        queryState.payload = records;
        return chain;
      },

      update: (changes: any) => {
        queryState.operation = "update";
        queryState.payload = changes;
        return chain;
      },

      delete: () => {
        queryState.operation = "delete";
        return chain;
      },

      upsert: (records: any | any[]) => {
        queryState.operation = "upsert";
        queryState.payload = records;
        return chain;
      }
    };

    return chain;
  }
}

// In production with missing credentials we intentionally do NOT instantiate
// the localStorage mock (it has no Row-Level Security and is fully client-
// tamperable). Instead we return a stub whose data methods throw a clear error
// — that error is caught by the app's existing try/catch and surfaced to the
// user — while keeping `auth` no-throw so the app can still mount gracefully.
function createFatalStub(message: string): any {
  const safeAuth = {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error(message) }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error(message) }),
  };
  const throwFn = () => {
    throw new Error(message);
  };
  return new Proxy({}, {
    get(_target, prop: string) {
      if (prop === "auth") return safeAuth;
      return throwFn;
    },
  }) as any;
}

// Instantiate the appropriate client
export const supabase = isRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (isProdMockBlocked
      ? createFatalStub(
          "[1stCars] Production is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
          "Configure both environment variables in your deploy settings; the app cannot reach the database."
        )
      : (new SupabaseMockClient() as any));
