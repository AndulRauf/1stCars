import { Car } from "@/src/types";

export const CARS_DATA: Car[] = [
  {
    id: "car-1",
    brand: "Tata",
    model: "Nexon EV Max",
    year: 2023,
    price: 1749000,
    emi: 26000,
    location: "Surat Elite Gallery",
    fuel: "Electric",
    transmission: "Automatic",
    mileage: 12000,
    bodyType: "EV",
    certified: true,
    imageBg: "bg-emerald-950/10",
    featured: true,
    specifications: [
      "Battery: 40.5 kWh High Density Li-ion",
      "Power: 141 hp / 250 Nm Torque",
      "Range: 437 km Certified",
      "0-100 km/h: 8.9 seconds"
    ],
    features: [
      "Multi-Mode Regenerative Braking",
      "Pristine Panoramic Sunroof",
      "Ventilated Front Seats",
      "Harman Touchscreen with Premium Acoustics",
      "Smart Air Purifier with PM 2.5 Filter",
      "Wireless Smartphone Charger"
    ],
    inspectionSummary: {
      overallScore: 9.8,
      engine: "Battery health state-of-charge SOH verified at 99.1%.",
      brakes: "95% brake pads remaining with regenerative efficiency confirmed.",
      electronics: "Smart console firmware updated, dual airbags & ESP tested.",
      exterior: "100% original factory paint, pristine panel alignments.",
      interior: "Premium dual-tone leatherette upholstery in pristine state."
    },
    warrantyInfo: {
      months: 36,
      miles: 125000,
      coverage: "8 Years / 1,60,000 km High Voltage Battery Guarantee"
    },
    owners: 1,
    cities: ["Surat", "Vadodara"]
  },
  {
    id: "car-2",
    brand: "Mahindra",
    model: "XUV700 AX7 Luxury",
    year: 2022,
    price: 2449000,
    emi: 36000,
    location: "Vadodara Premium Hub",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: 18000,
    bodyType: "SUV",
    certified: true,
    imageBg: "bg-blue-950/10",
    featured: true,
    specifications: [
      "Engine: 2.0L mStallion Turbo Petrol",
      "Power: 197 hp / 380 Nm Torque",
      "Transmission: 6-Speed Torque Converter",
      "Drivetrain: Front Wheel Drive"
    ],
    features: [
      "Advanced ADAS Level 2 Driving Suite",
      "Continuous Dual 10.25-inch Screens",
      "Sony 12-Speaker 3D Surround System",
      "Panoramic Skyroof (Largest in segment)",
      "Smart Door Handles & Dynamic Indicators",
      "Dual Zone Fully Automatic Climate Control"
    ],
    inspectionSummary: {
      overallScore: 9.6,
      engine: " mStallion engine in peak response, zero leaks, compression perfect.",
      brakes: "90% pad life, electronic park brake operates smoothly.",
      electronics: "All ADAS cameras and radar calibrated and validated.",
      exterior: "Midnight Black shade pristine, no rock chips or micro-scratches.",
      interior: "Luxurious white leatherette seats professionally detailed."
    },
    warrantyInfo: {
      months: 24,
      miles: 50000,
      coverage: "Extended Segment-First Bumper-to-Bumper Protection"
    },
    owners: 1,
    cities: ["Vadodara", "Vapi"]
  },
  {
    id: "car-3",
    brand: "Maruti Suzuki",
    model: "Swift ZXI+",
    year: 2021,
    price: 829000,
    emi: 12000,
    location: "Bharuch Premium Yard",
    fuel: "Petrol",
    transmission: "Manual",
    mileage: 24000,
    bodyType: "Hatchback",
    certified: true,
    imageBg: "bg-rose-950/10",
    featured: true,
    specifications: [
      "Engine: 1.2L DualJet Petrol",
      "Power: 89 hp @ 6000 rpm",
      "Mileage: 23.2 km/l ARAI Certified",
      "Transmission: 5-Speed Slick Manual"
    ],
    features: [
      "Precision Reverse Parking Camera",
      "Keyless Go & Smart Push Button Start",
      "7-inch SmartPlay Studio Touchscreen",
      "Auto LED Projector Headlamps",
      "Precision-Cut Dual-Tone Alloy Wheels",
      "Leather-Wrapped Flat Bottom Steering"
    ],
    inspectionSummary: {
      overallScore: 9.5,
      engine: "Ultra-refined DualJet runs clean, fresh synthetic oil flush.",
      brakes: "88% front brake pad life, rear shoes adjusted.",
      electronics: "Infotainment fully calibrated, keyless systems functional.",
      exterior: "Solid Fire Red finish, minor touch-up on rear bumper corner.",
      interior: "Sporty black fabric interior completely vacuumed and sanitized."
    },
    warrantyInfo: {
      months: 12,
      miles: 20000,
      coverage: "1stMark Certified Gold Powertrain Coverage"
    },
    owners: 1,
    cities: ["Bharuch", "Surat"]
  },
  {
    id: "car-4",
    brand: "Tata",
    model: "Tigor EV Lux",
    year: 2022,
    price: 1249000,
    emi: 18500,
    location: "Vapi Operational Center",
    fuel: "Electric",
    transmission: "Automatic",
    mileage: 14500,
    bodyType: "EV",
    certified: true,
    imageBg: "bg-[#2E7D32]/5",
    featured: true,
    specifications: [
      "Battery: 26 kWh Ziptron Tech",
      "Power: 74 hp / 170 Nm Torque",
      "Range: 315 km Certified",
      "IP67 Waterproof Battery Pack"
    ],
    features: [
      "Signature Teal Blue Accents",
      "Sleek Projector Headlamps",
      "Automatic Climate Control with Smart Grid",
      "Harman Infotainment with 8 Speakers",
      "Instant Cool Cabin Ventilation",
      "Multi-Drive Modes (Drive / Sport)"
    ],
    inspectionSummary: {
      overallScore: 9.7,
      engine: "Ziptron permanent magnet motor runs at 100% duty cycle.",
      brakes: "92% pad life, regenerative braking parameters calibrated.",
      electronics: "Climate system, digital instruments, and cell SOH fully checked.",
      exterior: "Sleek dual-tone finish, no panel gaps, factory pristine.",
      interior: "Premium fabric seats clean, dashboard plastics scratch-free."
    },
    warrantyInfo: {
      months: 24,
      miles: 60000,
      coverage: "8 Years / 1,60,000 km Ziptron Battery & Motor Protection"
    },
    owners: 1,
    cities: ["Vapi", "Bharuch"]
  },
  {
    id: "car-5",
    brand: "Mahindra",
    model: "Scorpio-N Z8L",
    year: 2023,
    price: 2299000,
    emi: 34000,
    location: "Surat Elite Gallery",
    fuel: "Diesel",
    transmission: "Automatic",
    mileage: 9800,
    bodyType: "SUV",
    certified: true,
    imageBg: "bg-slate-900/10",
    featured: true,
    specifications: [
      "Engine: 2.2L mHawk Diesel",
      "Power: 172 hp / 400 Nm Torque",
      "Transmission: 6-Speed Automatic",
      "Terrain Suite: 4XPLOR Intelligent AWD"
    ],
    features: [
      "AdrenoX Connected Car Tech (Alexa Enabled)",
      "Premium Coffee Black Rich Leatherette Cabin",
      "Dual Zone Automatic Air Conditioning",
      "Electric Sunroof & Wireless Phone Charging",
      "Sony Immersive 12-Speaker Sound System",
      "Dual LED Projector Headlamps"
    ],
    inspectionSummary: {
      overallScore: 9.9,
      engine: "mHawk high-torque diesel performs flawlessly, oil clean.",
      brakes: "94% brake pad life remaining, electronic calipers responsive.",
      electronics: "AdrenoX connected suite checked, all screens fully updated.",
      exterior: "Deep Forest shade in absolute showroom state, nano-coated.",
      interior: "Premium 3-row seating leatherette completely fresh."
    },
    warrantyInfo: {
      months: 36,
      miles: 100000,
      coverage: "Manufacturer balance + 12-Month extended 1stMark Premium"
    },
    owners: 1,
    cities: ["Surat", "Vapi"]
  },
  {
    id: "car-6",
    brand: "Porsche",
    model: "911 Carrera S",
    year: 2022,
    price: 14500000,
    emi: 215000,
    location: "Surat Elite Gallery",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: 4200,
    bodyType: "Sedan",
    certified: true,
    imageBg: "bg-slate-900/10",
    featured: true,
    specifications: [
      "Engine: 3.0L Twin-Turbo Flat 6",
      "Power: 443 hp @ 6500 rpm",
      "0-100 km/h: 3.5 seconds",
      "Top Speed: 308 km/h"
    ],
    features: [
      "Sport Chrono Package",
      "BOSE Premium Surround Sound",
      "20/21-inch Carrera S Alloys",
      "Porsche Active Suspension (PASM)",
      "LED Matrix Adaptive Headlights",
      "Dynamic Chassis Control & Lane Assist"
    ],
    inspectionSummary: {
      overallScore: 9.8,
      engine: "Pristine flat-six, zero fluid dampness, outstanding compression.",
      brakes: "95% brake life, brake pad wear sensors functional.",
      electronics: "All dynamic dampers and active aero tested.",
      exterior: "Guards Red finish completely original, paint depth verified.",
      interior: "Premium Nappa leather interior detailed to perfection."
    },
    warrantyInfo: {
      months: 24,
      miles: 40000,
      coverage: "1stMark Exotic Elite Comprehensive Vehicle Coverage"
    },
    owners: 1,
    cities: ["Surat", "Vadodara"]
  },
  {
    id: "car-7",
    brand: "BMW",
    model: "M3 Competition",
    year: 2023,
    price: 11000000,
    emi: 165000,
    location: "Vadodara Premium Hub",
    fuel: "Petrol",
    transmission: "Automatic",
    mileage: 2100,
    bodyType: "Sedan",
    certified: true,
    imageBg: "bg-blue-950/10",
    featured: true,
    specifications: [
      "Engine: 3.0L M TwinPower Turbo I6",
      "Power: 503 hp @ 6250 rpm",
      "0-100 km/h: 3.5 seconds",
      "Drivetrain: xDrive AWD"
    ],
    features: [
      "Carbon Fiber Roof Panel",
      "BMW Laserlights with Blue Accents",
      "M Carbon Bucket Seats",
      "Harman Kardon Surround Sound",
      "Heated & Ventilated Front M Seats",
      "M Adaptive Suspension System"
    ],
    inspectionSummary: {
      overallScore: 9.9,
      engine: "Like-new powertrain state, first service done on schedule by BMW.",
      brakes: "99% brake pads, absolute high-response rotors.",
      electronics: "Live Cockpit Professional fully calibrated, no codes.",
      exterior: "Portimao Blue metallic paint in outstanding showroom state.",
      interior: "Carbon bucket trims and Alcantara steering as brand new."
    },
    warrantyInfo: {
      months: 36,
      miles: 60000,
      coverage: "BMW Factory Balance + 1stMark Platinum Warranty"
    },
    owners: 1,
    cities: ["Vadodara", "Bharuch"]
  },
  {
    id: "car-8",
    brand: "Land Rover",
    model: "Defender 11 HSE",
    year: 2022,
    price: 12000000,
    emi: 175000,
    location: "Vapi Operational Center",
    fuel: "Diesel",
    transmission: "AWD",
    mileage: 11400,
    bodyType: "SUV",
    certified: true,
    imageBg: "bg-emerald-950/10",
    featured: true,
    specifications: [
      "Engine: 3.0L Ingenium Diesel",
      "Power: 296 hp / 650 Nm Torque",
      "AWD with Terrain Response 2",
      "Wading Depth: 900 mm"
    ],
    features: [
      "Air Suspension with Height Control",
      "Sliding Panoramic Sunroof",
      "Meridian Immersive Sound",
      "ClearSight Ground View Camera",
      "Interactive Driver Display",
      "20-inch Satin Dark Grey Alloys"
    ],
    inspectionSummary: {
      overallScore: 9.7,
      engine: "Refined Ingenium engine, extreme low-end torque validated.",
      brakes: "92% brake pads, calipers clean, system flushed.",
      electronics: "Pivi Pro infotainment updated, air suspension verified.",
      exterior: "Silicon Silver finish in showroom condition, ceramic treated.",
      interior: "Acorn Windsor leather upholstery immaculate, detailed."
    },
    warrantyInfo: {
      months: 24,
      miles: 50000,
      coverage: "Comprehensive 1stMark Elite SUV Coverage"
    },
    owners: 1,
    cities: ["Vapi", "Surat"]
  }
];

export const FAMOUS_BRANDS = [
  "Tata",
  "Mahindra",
  "Maruti Suzuki",
  "Porsche",
  "BMW",
  "Land Rover"
];

export const BUDGET_RANGES = [
  { label: "All Budgets", min: 0, max: 50000000 },
  { label: "Under ₹15 Lakhs", min: 0, max: 1500000 },
  { label: "₹15 Lakhs - ₹50 Lakhs", min: 1500000, max: 5000000 },
  { label: "Over ₹50 Lakhs", min: 5000000, max: 50000000 }
];

export const CITIES_DATA = [
  "All Cities",
  "Surat",
  "Bharuch",
  "Vadodara",
  "Vapi"
];
