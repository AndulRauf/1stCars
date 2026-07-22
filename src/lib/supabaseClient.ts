import { createClient } from "@supabase/supabase-js";

// Retrieve Supabase environment variables
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check for local storage override to use mock database
const useMockOverride = typeof window !== "undefined" && localStorage.getItem("1stcars_use_mock_db") === "true";

export const isRealSupabase = Boolean(supabaseUrl && supabaseAnonKey) && !useMockOverride;

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
          { id: "u-dealer", name: "Elite Motors Dealer", email: "dealer@1stcars.com", mobile: "9234567890", role: "Dealer", city: "Bangalore", created_at: new Date().toISOString() },
          { id: "u-inspector", name: "Vikram Rathore", email: "inspector@1stcars.com", mobile: "9345678901", role: "Inspector", city: "Mumbai", created_at: new Date().toISOString() },
          { id: "u-sales", name: "Sneha Patel", email: "sales@1stcars.com", mobile: "9456789012", role: "Sales Associate", city: "Delhi NCR", created_at: new Date().toISOString() },
          { id: "u-admin", name: "Super Administrator", email: "admin@1stcars.com", mobile: "9876543210", role: "Admin", city: "Mumbai", created_at: new Date().toISOString() }
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
        return [
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
            content: `# About 1stCars\n\n1stCars is the premier marketplace for certified premium pre-owned vehicles inside the **Gujarat region** (Surat, Bharuch, Vadodara, Vapi). We stand by absolute transparency, zero-tolerance for tampered odometers, and 100% certified chassis security.\n\n### Our Quality Pillars\n\n- **150-Point Inspection**: Done by master structural engineers on-site.\n- **True Kilometers Guarantee**: Multiple ECU-sweep diagnostics.\n- **6-Month Premium Warranty**: Covers engine, gearbox & dual-clutch assemblies.\n\n### Contact Details\n- **Email**: suport@1stcars.in\n- **Mobile**: +91 8866377722\n- **Office**: 1stCars Seller Hub, Ring 101 Vikas Arced, Vadod ,   Masma, Olpad, Surat, Gujarat 394540, India`,
            created_at: new Date().toISOString(),
            is_footer: false
          },
          {
            id: "p-faq",
            title: "FAQs",
            slug: "faqs",
            content: `# Frequently Asked Questions\n\nHere are the answers to the most common queries about our premium inspection services.\n\n### 1. What does the 150-Point check cover?\nIt covers a detailed scan of the underbody, frame, engine pressure, dual-clutch transmission latency, hybrid battery health, and electronic modules via OBD-II.\n\n### 2. Can I get a doorstep check done in Vadodara?\nAbsolutely. We send fully equipped team vans to any address across Surat, Vadodara, Bharuch, and Vapi regions within 24 hours.\n\n### 3. How does the 6-month warranty work?\nIt is an optional upgrade. If selected, it covers cashless repairs for all engine and drivetrain components at our authorized service networks.`,
            created_at: new Date().toISOString(),
            is_footer: false
          },
          {
            id: "p-warranty",
            title: "Warranty Terms",
            slug: "warranty-terms",
            content: `# 6-Month Premium Warranty Policy\n\nAt **1stCars**, every certified pre-owned vehicle qualifies for our complimentary **6-Month / 10,000 km Premium Warranty** to guarantee peace of mind.\n\n### What is Covered\nOur premium warranty covers 100% of parts and labor costs for major mechanical assemblies:\n\n1. **Engine Assembly**: Cylinder block, pistons, crankshaft, camshafts, valvetrain, turbocharger/supercharger systems, and oil pump.\n2. **Gearbox & Transmission**: Torque converter, dual-clutch transmission (DCT/DSG) modules, manual gear sets, and transfer case.\n3. **Electrical Modules**: ECU, alternator, starter motor, and hybrid battery management controller.\n4. **Cooling System**: Radiator, water pump, and thermostat housing.\n\n### What is Not Covered\n- Normal wear and tear items (brake pads, clutch plates, tires, wiper blades, suspension bushings).\n- Modifications or tuning after delivery.\n- Accidental damage or driving through flooded streets.\n\n### Claim Process\nShould you encounter any issue, simply contact our dedicated claims team at **suport@1stcars.in** or call **+91 8866377722**. We will arrange a flatbed tow to our authorized service hub and provide cashless repairs.`,
            created_at: new Date().toISOString(),
            is_footer: true
          },
          {
            id: "p-certificate",
            title: "150-Point Certificate",
            slug: "150-point-certificate",
            content: `# 150-Point Structural & Technical Inspection\n\nBefore any premium car makes it to the **1stCars** inventory, it undergoes a meticulous **150-point check** executed by our certified structural engineers.\n\n### Core Inspection Categories\n\n#### 1. Frame & Chassis Integrity (35 Points)\n- Structural chassis rail scan to detect past impact damage.\n- Roof pillar thickness gauge measurement (paint depth analysis).\n- Subframe alignment verification using precision laser tools.\n\n#### 2. Powertrain & OBD Diagnostics (45 Points)\n- Cylinder compression test and spark plug inspection.\n- OBD-II electronic scan for historical fault codes.\n- Exhaust smoke color and emission levels check.\n- Transmission shift latency and clutch pressure test.\n\n#### 3. Suspension, Brakes & Underbody (40 Points)\n- Shock absorber damping rates and fluid leakage check.\n- Brake disc thickness and pad wear percentage.\n- Steering rack play and boot integrity.\n- Fuel tank and line safety check.\n\n#### 4. Interior, Electricals & Comfort (30 Points)\n- Infotainment system, GPS, and speakers.\n- Multi-zone climate control cooling and heating test.\n- Airbag modules and sensor validation.\n\nEvery vehicle that passes is issued our exclusive **1stMark Gold Certificate**, signed off by a Master Engineer.`,
            created_at: new Date().toISOString(),
            is_footer: true
          },
          {
            id: "p-terms",
            title: "Terms & Conditions",
            slug: "terms-and-conditions",
            content: `# Terms & Conditions of Business\n\nWelcome to **1stCars**. By browsing our marketplace or using our vehicle procurement, trade-in, or certified showroom inspection services, you agree to comply with the following terms.\n\n### 1. Booking & Delivery\n- To reserve a luxury vehicle from our handpicked fleet, a refundable holding deposit of ₹50,000 is required.\n- Full payment must be settled via certified bank transfer, RTGS, or approved showroom partner financing before delivery.\n\n### 2. Odometer and Title Integrity\n- We pledge an absolute **Zero-Tolerance Policy** for tampered odometers.\n- If any vehicle is found to have a non-genuine odometer read-out or a hidden past salvage title, we will issue a **100% Instant Refund**.\n\n### 3. Customer Sell-Your-Car & Appraisals\n- Valuations provided online are estimated guides.\n- Final purchase offers are subject to an on-site physical evaluation.\n\nFor legal or contract queries, please write to us at **legal@1stcars.com**.`,
            created_at: new Date().toISOString(),
            is_footer: true
          },
          {
            id: "p-showrooms",
            title: "Our Showrooms",
            slug: "our-showrooms",
            content: `# 1stCars Flagship Showrooms\n\nExperience the finest luxury pre-owned shopping experience in Gujarat. Visit one of our multi-brand flagship stores to view, inspect, and test drive our fleet.\n\n### 1. Surat Experience Center (Main Hub)\n- **Address**: 1stCars Seller Hub, Ring 101 Vikas Arced, Vadod ,   Masma, Olpad, Surat, Gujarat 394540, India\n- **Timings**: Monday - Sunday, 09:30 AM to 08:30 PM\n- **Phone**: +91 8866377722\n\n### 2. Vadodara Luxury Outlet\n- **Address**: Grand Central Galleria, Alkapuri, Vadodara, Gujarat - 390007\n- **Timings**: Monday - Saturday, 10:00 AM to 08:00 PM\n- **Phone**: +91 98888 88888\n\n### 3. Bharuch Express Depot\n- **Address**: Highway Landmark Arcade, NH-48, Bharuch, Gujarat - 392001\n- **Timings**: Monday - Saturday, 10:00 AM to 07:00 PM\n- **Phone**: +91 97777 77777\n\n### 4. Vapi Collection Center\n- **Address**: Premium Hub Plaza, Char Rasta, Vapi, Gujarat - 396191\n- **Timings**: Monday - Saturday, 10:00 AM to 07:30 PM\n- **Phone**: +91 96666 66666`,
            created_at: new Date().toISOString(),
            is_footer: true
          }
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
      
      const session = { access_token: `mock-jwt-${id}`, user: newProfile };
      localStorage.setItem("1stcars_sb_current_session", JSON.stringify(session));
      this.triggerAuthChange("SIGNED_IN", session);

      return { data: { user: newProfile, session }, error: null };
    },

    signInWithPassword: async ({ email }: any) => {
      const query = email.toLowerCase();
      const profiles = this.getStorage<any>("1stcars_sb_profiles", this.getInitialData("profiles"));
      const user = profiles.find((p) => p.email.toLowerCase() === query || p.mobile === query);

      if (user) {
        const session = { access_token: `mock-jwt-${user.id}`, user };
        localStorage.setItem("1stcars_sb_current_session", JSON.stringify(session));
        this.triggerAuthChange("SIGNED_IN", session);
        return { data: { user, session }, error: null };
      }

      return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
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
        if (["p-warranty", "p-certificate", "p-terms", "p-showrooms"].includes(it.id) && it.is_footer !== true) {
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
        queryState.operation = "select";
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

// Instantiate the appropriate client
export const supabase = isRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new SupabaseMockClient() as any);
