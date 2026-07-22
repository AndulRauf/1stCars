import { supabase } from "./supabaseClient";

export interface DemoCar {
  id?: string;
  title: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  km_driven: number;
  fuel: string;
  transmission: string;
  owner_count: number;
  city: string;
  reg_number: string;
  color: string;
  insurance_type: string;
  overall_score: number;
  status: string;
}

export interface DemoBrand {
  name: string;
  logo_url: string;
  is_popular: boolean;
}

export interface DemoModel {
  brand_name: string;
  name: string;
  body_type: string;
}

export interface DemoCity {
  name: string;
  state: string;
  is_active: boolean;
}

export const SEED_CITIES: DemoCity[] = [
  { name: "Surat", state: "Gujarat", is_active: true },
  { name: "Vadodara", state: "Gujarat", is_active: true },
  { name: "Bharuch", state: "Gujarat", is_active: true },
  { name: "Vapi", state: "Gujarat", is_active: true }
];

export const SEED_BRANDS: DemoBrand[] = [
  { name: "Porsche", logo_url: "🏎️", is_popular: true },
  { name: "BMW", logo_url: "🚙", is_popular: true },
  { name: "Mercedes-Benz", logo_url: "🚗", is_popular: true },
  { name: "Audi", logo_url: "🚘", is_popular: true },
  { name: "Land Rover", logo_url: "⛰️", is_popular: true },
  { name: "Tesla", logo_url: "⚡", is_popular: true },
  { name: "Jaguar", logo_url: "🐆", is_popular: false },
  { name: "Aston Martin", logo_url: "🌟", is_popular: false },
  { name: "Ferrari", logo_url: "🐎", is_popular: false },
  { name: "Bentley", logo_url: "👑", is_popular: false }
];

export const SEED_MODELS: DemoModel[] = [
  // Porsche
  { brand_name: "Porsche", name: "911 Carrera S", body_type: "Coupe" },
  { brand_name: "Porsche", name: "Cayenne Coupé", body_type: "SUV" },
  { brand_name: "Porsche", name: "Taycan Turbo S", body_type: "Sedan" },
  { brand_name: "Porsche", name: "Panamera GTS", body_type: "Sedan" },
  { brand_name: "Porsche", name: "Macan S", body_type: "SUV" },
  // BMW
  { brand_name: "BMW", name: "M4 Competition", body_type: "Coupe" },
  { brand_name: "BMW", name: "X7 xDrive40i", body_type: "SUV" },
  { brand_name: "BMW", name: "i7 M70", body_type: "Sedan" },
  { brand_name: "BMW", name: "M5 Competition", body_type: "Sedan" },
  { brand_name: "BMW", name: "Z4 Roadster", body_type: "Convertible" },
  // Mercedes-Benz
  { brand_name: "Mercedes-Benz", name: "G-Class AMG G 63", body_type: "SUV" },
  { brand_name: "Mercedes-Benz", name: "S-Class S 450", body_type: "Sedan" },
  { brand_name: "Mercedes-Benz", name: "EQS Sedan", body_type: "Sedan" },
  { brand_name: "Mercedes-Benz", name: "C-Class", body_type: "Sedan" },
  { brand_name: "Mercedes-Benz", name: "AMG GT", body_type: "Coupe" },
  // Audi
  { brand_name: "Audi", name: "RS e-tron GT", body_type: "Sedan" },
  { brand_name: "Audi", name: "Q8 Celebration", body_type: "SUV" },
  { brand_name: "Audi", name: "A8 L", body_type: "Sedan" },
  { brand_name: "Audi", name: "RS6 Avant", body_type: "Wagon" },
  { brand_name: "Audi", name: "R8 V10", body_type: "Coupe" },
  // Land Rover
  { brand_name: "Land Rover", name: "Defender 110 V8", body_type: "SUV" },
  { brand_name: "Land Rover", name: "Range Rover Sport", body_type: "SUV" },
  { brand_name: "Land Rover", name: "Evoque", body_type: "SUV" },
  { brand_name: "Land Rover", name: "Discovery", body_type: "SUV" },
  { brand_name: "Land Rover", name: "Velar", body_type: "SUV" },
  // Tesla
  { brand_name: "Tesla", name: "Model S Plaid", body_type: "Sedan" },
  { brand_name: "Tesla", name: "Model X Plaid", body_type: "SUV" },
  { brand_name: "Tesla", name: "Model 3 Performance", body_type: "Sedan" },
  { brand_name: "Tesla", name: "Model Y Performance", body_type: "SUV" },
  { brand_name: "Tesla", name: "Cybertruck", body_type: "Truck" },
  // Jaguar
  { brand_name: "Jaguar", name: "F-Type R", body_type: "Coupe" },
  { brand_name: "Jaguar", name: "F-Pace", body_type: "SUV" },
  { brand_name: "Jaguar", name: "I-Pace", body_type: "SUV" },
  { brand_name: "Jaguar", name: "XF", body_type: "Sedan" },
  { brand_name: "Jaguar", name: "XE", body_type: "Sedan" },
  // Aston Martin
  { brand_name: "Aston Martin", name: "DBX707", body_type: "SUV" },
  { brand_name: "Aston Martin", name: "Vantage V8", body_type: "Coupe" },
  { brand_name: "Aston Martin", name: "DBS Superleggera", body_type: "Coupe" },
  { brand_name: "Aston Martin", name: "DB12", body_type: "Coupe" },
  { brand_name: "Aston Martin", name: "Valhalla", body_type: "Coupe" },
  // Ferrari
  { brand_name: "Ferrari", name: "F8 Tributo", body_type: "Coupe" },
  { brand_name: "Ferrari", name: "296 GTB", body_type: "Coupe" },
  { brand_name: "Ferrari", name: "SF90 Stradale", body_type: "Coupe" },
  { brand_name: "Ferrari", name: "Roma", body_type: "Coupe" },
  { brand_name: "Ferrari", name: "Purosangue", body_type: "SUV" },
  // Bentley
  { brand_name: "Bentley", name: "Continental GT", body_type: "Coupe" },
  { brand_name: "Bentley", name: "Bentayga V8", body_type: "SUV" },
  { brand_name: "Bentley", name: "Flying Spur", body_type: "Sedan" },
  { brand_name: "Bentley", name: "Mulsanne", body_type: "Sedan" },
  { brand_name: "Bentley", name: "Bacalar", body_type: "Convertible" }
];

export const SEED_CARS: DemoCar[] = [
  {
    title: "Porsche 911 Carrera S",
    brand: "Porsche",
    model: "911 Carrera S",
    variant: "3.0L Twin-Turbo Flat 6",
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
    status: "available"
  },
  {
    title: "Land Rover Defender 110 V8",
    brand: "Land Rover",
    model: "Defender 110 V8",
    variant: "5.0L Supercharged V8",
    year: 2021,
    price: 11500000,
    km_driven: 14500,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Los Angeles",
    reg_number: "LA-90210-DEF",
    color: "Carpathian Grey",
    insurance_type: "Comprehensive",
    overall_score: 9.5,
    status: "available"
  },
  {
    title: "BMW M4 Competition",
    brand: "BMW",
    model: "M4 Competition",
    variant: "M xDrive 3.0L Twin-Turbo",
    year: 2023,
    price: 14500000,
    km_driven: 2100,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Delhi NCR",
    reg_number: "DL1C-Z-4444",
    color: "Isle of Man Green",
    insurance_type: "Comprehensive",
    overall_score: 9.9,
    status: "available"
  },
  {
    title: "Audi RS e-tron GT",
    brand: "Audi",
    model: "RS e-tron GT",
    variant: "Dual Synchronous Motors",
    year: 2022,
    price: 16500000,
    km_driven: 6100,
    fuel: "Electric",
    transmission: "Automatic",
    owner_count: 1,
    city: "Beverly Hills",
    reg_number: "BH-EV-777",
    color: "Mythos Black Metallic",
    insurance_type: "Comprehensive",
    overall_score: 9.7,
    status: "available"
  },
  {
    title: "Mercedes-Benz G-Class AMG G 63",
    brand: "Mercedes-Benz",
    model: "G-Class AMG G 63",
    variant: "4.0L BiTurbo V8",
    year: 2021,
    price: 24500000,
    km_driven: 12000,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Mumbai",
    reg_number: "MH04-G-6363",
    color: "Obsidian Black",
    insurance_type: "Comprehensive",
    overall_score: 9.6,
    status: "available"
  },
  {
    title: "Tesla Model S Plaid",
    brand: "Tesla",
    model: "Model S Plaid",
    variant: "Tri-Motor AWD 1020HP",
    year: 2023,
    price: 10500000,
    km_driven: 3900,
    fuel: "Electric",
    transmission: "Automatic",
    owner_count: 1,
    city: "San Francisco",
    reg_number: "SF-PLAID-S",
    color: "Ultra White",
    insurance_type: "Third Party",
    overall_score: 9.8,
    status: "available"
  },
  {
    title: "Jaguar F-Type R",
    brand: "Jaguar",
    model: "F-Type R",
    variant: "5.0L Supercharged V8 AWD",
    year: 2020,
    price: 8500000,
    km_driven: 18400,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 2,
    city: "Oakland",
    reg_number: "OAK-F-TYP",
    color: "British Racing Green",
    insurance_type: "Comprehensive",
    overall_score: 9.4,
    status: "available"
  },
  {
    title: "Aston Martin DBX707",
    brand: "Aston Martin",
    model: "DBX707",
    variant: "4.0L Twin-Turbo V8",
    year: 2022,
    price: 21000000,
    km_driven: 9500,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Beverly Hills",
    reg_number: "BH-DBX-707",
    color: "Satin Xenon Grey",
    insurance_type: "Comprehensive",
    overall_score: 9.7,
    status: "available"
  },
  {
    title: "Ferrari F8 Tributo",
    brand: "Ferrari",
    model: "F8 Tributo",
    variant: "3.9L Twin-Turbo V8",
    year: 2021,
    price: 29500000,
    km_driven: 4200,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Los Angeles",
    reg_number: "LA-F8-TRIB",
    color: "Rosso Corsa Red",
    insurance_type: "Comprehensive",
    overall_score: 9.9,
    status: "available"
  },
  {
    title: "Bentley Continental GT",
    brand: "Bentley",
    model: "Continental GT",
    variant: "4.0L Twin-Turbo V8",
    year: 2022,
    price: 26000000,
    km_driven: 5800,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Bangalore",
    reg_number: "KA03-B-5555",
    color: "Sequin Blue",
    insurance_type: "Comprehensive",
    overall_score: 9.8,
    status: "available"
  },
  {
    title: "Porsche Cayenne Coupé",
    brand: "Porsche",
    model: "Cayenne Coupé",
    variant: "3.0L Turbo V6",
    year: 2023,
    price: 12500000,
    km_driven: 8400,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "San Jose",
    reg_number: "SJ-CAY-99",
    color: "Chalk Grey",
    insurance_type: "Comprehensive",
    overall_score: 9.6,
    status: "available"
  },
  {
    title: "BMW X7 xDrive40i",
    brand: "BMW",
    model: "X7 xDrive40i",
    variant: "3.0L Turbo L6 MHEV",
    year: 2022,
    price: 11000000,
    km_driven: 15200,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Delhi NCR",
    reg_number: "DL3C-X-7777",
    color: "Carbon Black Metallic",
    insurance_type: "Comprehensive",
    overall_score: 9.5,
    status: "available"
  },
  {
    title: "Mercedes-Benz S-Class S 450",
    brand: "Mercedes-Benz",
    model: "S-Class S 450",
    variant: "3.0L Turbo Inline-6",
    year: 2022,
    price: 14000000,
    km_driven: 11100,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Pune",
    reg_number: "MH12-S-4500",
    color: "Emerald Green",
    insurance_type: "Comprehensive",
    overall_score: 9.8,
    status: "available"
  },
  {
    title: "Audi Q8 Celebration",
    brand: "Audi",
    model: "Q8 Celebration",
    variant: "55 TFSI Quattro V6",
    year: 2021,
    price: 9200000,
    km_driven: 22000,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 2,
    city: "Hyderabad",
    reg_number: "TS09-Q-8888",
    color: "Dragon Orange Metallic",
    insurance_type: "Comprehensive",
    overall_score: 9.4,
    status: "available"
  },
  {
    title: "Tesla Model X Plaid",
    brand: "Tesla",
    model: "Model X Plaid",
    variant: "Tri-Motor AWD 1020HP",
    year: 2022,
    price: 11500000,
    km_driven: 10200,
    fuel: "Electric",
    transmission: "Automatic",
    owner_count: 1,
    city: "San Francisco",
    reg_number: "SF-PLAID-X",
    color: "Solid Black",
    insurance_type: "Comprehensive",
    overall_score: 9.7,
    status: "available"
  },
  {
    title: "Land Rover Range Rover Sport",
    brand: "Land Rover",
    model: "Range Rover Sport",
    variant: "3.0L Mild-Hybrid Diesel",
    year: 2022,
    price: 13500000,
    km_driven: 16000,
    fuel: "Diesel",
    transmission: "Automatic",
    owner_count: 1,
    city: "Bangalore",
    reg_number: "KA01-RR-9900",
    color: "Santorini Black",
    insurance_type: "Comprehensive",
    overall_score: 9.6,
    status: "available"
  },
  {
    title: "Aston Martin Vantage V8",
    brand: "Aston Martin",
    model: "Vantage V8",
    variant: "4.0L BiTurbo V8",
    year: 2021,
    price: 14200000,
    km_driven: 7800,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Los Angeles",
    reg_number: "LA-VANTAGE",
    color: "Hyper Red",
    insurance_type: "Comprehensive",
    overall_score: 9.7,
    status: "available"
  },
  {
    title: "Ferrari Roma",
    brand: "Ferrari",
    model: "Roma",
    variant: "3.9L Twin-Turbo V8",
    year: 2022,
    price: 22500000,
    km_driven: 3100,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Beverly Hills",
    reg_number: "BH-ROMA-1",
    color: "Grigio Titanio Grey",
    insurance_type: "Comprehensive",
    overall_score: 9.8,
    status: "available"
  },
  {
    title: "Bentley Bentayga V8",
    brand: "Bentley",
    model: "Bentayga V8",
    variant: "4.0L Twin-Turbo V8",
    year: 2021,
    price: 21500000,
    km_driven: 14000,
    fuel: "Petrol",
    transmission: "Automatic",
    owner_count: 1,
    city: "Mumbai",
    reg_number: "MH02-BY-888",
    color: "Glacier White",
    insurance_type: "Comprehensive",
    overall_score: 9.5,
    status: "available"
  },
  {
    title: "Porsche Taycan Turbo S",
    brand: "Porsche",
    model: "Taycan Turbo S",
    variant: "93.4 kWh Battery EV",
    year: 2022,
    price: 15500000,
    km_driven: 5500,
    fuel: "Electric",
    transmission: "Automatic",
    owner_count: 1,
    city: "Pune",
    reg_number: "MH14-T-1111",
    color: "Frozen Blue Metallic",
    insurance_type: "Comprehensive",
    overall_score: 9.7,
    status: "available"
  }
];

export async function seedSupabaseDatabase(currentUserId?: string) {
  try {
    console.log("Seeding Database...");

    // 1. Seed Cities
    for (const city of SEED_CITIES) {
      await supabase.from("cities").upsert({
        name: city.name,
        state: city.state,
        is_active: city.is_active
      }, { onConflict: "name" });
    }

    // 2. Seed Brands
    for (const brand of SEED_BRANDS) {
      await supabase.from("brands").upsert({
        name: brand.name,
        logo_url: brand.logo_url,
        is_popular: brand.is_popular
      }, { onConflict: "name" });
    }

    // 3. Fetch Brand map
    const { data: brandList } = await supabase.from("brands").select("id, name");
    const brandMap: Record<string, string> = {};
    if (brandList) {
      brandList.forEach((b: any) => {
        brandMap[b.name] = b.id;
      });
    }

    // 4. Seed Models
    for (const model of SEED_MODELS) {
      const brandId = brandMap[model.brand_name];
      if (brandId) {
        await supabase.from("models").upsert({
          brand_id: brandId,
          name: model.name,
          body_type: model.body_type
        }, { onConflict: "brand_id,name" });
      }
    }

    // 5. Seed Cars
    for (const car of SEED_CARS) {
      const carPayload = {
        title: car.title,
        brand: car.brand,
        model: car.model,
        variant: car.variant,
        year: car.year,
        price: car.price,
        km_driven: car.km_driven,
        fuel: car.fuel,
        transmission: car.transmission,
        owner_count: car.owner_count,
        city: car.city,
        reg_number: car.reg_number,
        color: car.color,
        insurance_type: car.insurance_type,
        overall_score: car.overall_score,
        status: car.status,
        created_by: currentUserId || null
      };
      
      // Let's do a simple check to avoid duplicate registrations
      const { data: existing } = await supabase
        .from("cars")
        .select("id")
        .eq("reg_number", car.reg_number)
        .maybeSingle();

      if (!existing) {
        await supabase.from("cars").insert([carPayload]);
      }
    }

    return { success: true, message: "Successfully seeded 20 cars, 10 brands, 50 models, and 10 cities!" };
  } catch (error: any) {
    console.error("Database seeding failed:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
