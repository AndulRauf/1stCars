import * as React from "react";
import { 
  Car, ShieldCheck, Clock, Calendar, CheckCircle2, 
  Sparkles, ShieldAlert, ChevronRight, User, Mail, Phone, 
  MapPin, FileText, ArrowRight, ClipboardCheck,
  Search, ArrowLeft, Tag
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { automationService } from "@/src/lib/automation";
import { toast } from "@/src/lib/toast";
import { getOrCreateAutoPassword, getAutoPasswordKey, resolveAutoSignIn } from "@/src/lib/autoAuth";
import { estimateCarValue } from "@/src/lib/valuation";
import { trackMetaEvent } from "@/src/lib/metaPixel";
import { trackViewSellCar, trackSellerFormStart, trackSellerLeadSubmit } from "@/src/lib/analytics";
import { Profile } from "@/src/lib/db";
import {
  catalogFromLegacy, mergeCatalog, getStoredSellCatalog, setStoredSellCatalog,
  loadSellCatalogFromSupabase, SellCatalog
} from "@/src/lib/sellFormData";

interface SellCarViewProps {
  onNavigateToDashboard: (profile?: Profile) => void;
  onBackToHome: () => void;
  onNavigateToSeller?: () => void;
}

// Extensive brand logos lookup (Indian market brands, 2000 onwards)
export const BRAND_LOGOS: { [brand: string]: string } = {
  // Mass-market / Indian brands
  "Maruti Suzuki": "https://upload.wikimedia.org/wikipedia/commons/1/12/Suzuki_logo_2.svg",
  "Hyundai": "https://upload.wikimedia.org/wikipedia/commons/4/44/Hyundai_Motor_Company_logo.svg",
  "Tata": "https://upload.wikimedia.org/wikipedia/commons/8/8f/Tata_logo.svg",
  "Mahindra": "https://upload.wikimedia.org/wikipedia/commons/2/29/Mahindra_Auto_logo.svg",
  "Honda": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Honda_Logo.svg",
  "Toyota": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Toyota_EU.svg",
  "Kia": "https://upload.wikimedia.org/wikipedia/commons/4/47/Kia_logo_2021.svg",
  "Renault": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Renault_2021_Logo.svg",
  "Volkswagen": "https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg",
  "Skoda": "https://upload.wikimedia.org/wikipedia/commons/1/18/Skoda_logo_2022.svg",
  "Ford": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Ford_logo_flat.svg",
  "MG": "https://upload.wikimedia.org/wikipedia/commons/e/e9/MG_Motor_logo.svg",
  "Force": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Force_Motors_logo.svg",
  "ICML": "https://upload.wikimedia.org/wikipedia/commons/1/16/ICML_logo.png",
  "San Motors": "https://i.postimg.cc/NjWk9C1V/san-motors-logo.png",
  "DC Design": "https://upload.wikimedia.org/wikipedia/commons/c/cf/DC_Design_Logo.svg",
  "Reva": "https://upload.wikimedia.org/wikipedia/commons/5/52/Mahindra_Reva_Logo.png",
  "Nissan": "https://upload.wikimedia.org/wikipedia/commons/2/23/Nissan_2020_logo.svg",
  "Datsun": "https://upload.wikimedia.org/wikipedia/commons/1/16/Datsun_logo.svg",
  "Fiat": "https://upload.wikimedia.org/wikipedia/commons/8/85/Fiat_Logo.svg",
  "Chevrolet": "https://upload.wikimedia.org/wikipedia/commons/e/e2/Chevrolet_logo.svg",
  "Mitsubishi": "https://upload.wikimedia.org/wikipedia/commons/7/79/Mitsubishi_logo.svg",
  "Isuzu": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Isuzu_logo.svg",
  "Opel": "https://upload.wikimedia.org/wikipedia/commons/1/12/Opel-Logo_2009.svg",
  "Daewoo": "https://upload.wikimedia.org/wikipedia/commons/6/6a/Daewoo_logo.svg",
  "Hindustan Motors": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Hindustan_Motors_logo.png",
  "Premier": "https://upload.wikimedia.org/wikipedia/commons/9/9b/Premier_Automobiles_logo.png",
  "Citroen": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Citroen_2022.svg",
  "BYD": "https://upload.wikimedia.org/wikipedia/commons/f/f0/BYD_Company_logo.svg",
  // Luxury brands
  "BMW": "https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg",
  "Audi": "https://upload.wikimedia.org/wikipedia/commons/9/92/Audi-Logo_2016.svg",
  "Mercedes-Benz": "https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Benz_logo.svg",
  "Porsche": "https://upload.wikimedia.org/wikipedia/commons/8/8c/Porsche_logo.svg",
  "Bentley": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Bentley_Motors_logo.svg",
  "Jaguar": "https://upload.wikimedia.org/wikipedia/commons/f/f5/Jaguar_2012_logo.png",
  "Land Rover": "https://upload.wikimedia.org/wikipedia/commons/b/bd/Land_Rover_logo_2011.svg",
  "Volvo": "https://upload.wikimedia.org/wikipedia/commons/2/29/Volvo-Iron-Mark-Logo.svg",
  "Mini Cooper": "https://upload.wikimedia.org/wikipedia/commons/8/8e/MINI_logo.svg",
  "Jeep": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Jeep_wordmark_logo.svg",
  "Tesla": "https://upload.wikimedia.org/wikipedia/commons/b/bb/Tesla_T_symbol.svg",
  "Aston Martin": "https://upload.wikimedia.org/wikipedia/commons/5/59/Aston_Martin_Lagonda_brand_logo.svg",
  "Ferrari": "https://upload.wikimedia.org/wikipedia/commons/d/d1/Ferrari-Logo.svg",
  "Lamborghini": "https://upload.wikimedia.org/wikipedia/commons/d/df/Lamborghini_Logo.svg",
  "Maserati": "https://upload.wikimedia.org/wikipedia/commons/e/e6/Maserati_logo.svg",
  "Rolls-Royce": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Rolls-Royce_Motor_Cars_logo.svg",
  "Lexus": "https://upload.wikimedia.org/wikipedia/commons/d/d1/Lexus_division_emblem.svg",
  "Lotus": "https://upload.wikimedia.org/wikipedia/commons/9/98/Lotus_Cars_logo.svg",
  "Maybach": "https://upload.wikimedia.org/wikipedia/commons/e/e8/Maybach_logo.svg"
};

// The first tiles shown on the Sell Car form. These mass-market brands always
// come first (in this exact order); every other brand follows in its existing
// order so nothing is hidden.
export const SELL_BRAND_PRIORITY = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota",
  "Ford", "Fiat", "Nissan", "Renault"
];


// Extensive brand model database for interactive auto-suggestions
export const brandData: {
  [brand: string]: {
    models: {
      name: string;
      category: string;
      years: string;
      image: string;
      variants: string[];
    }[];
  };
} = {
  "Maruti Suzuki": {
    models: [
      { name: "Swift", category: "Hatchback", years: "2005 - Now", image: "🚗", variants: ["LXI", "VXI", "ZXI", "ZXI+"] },
      { name: "Baleno", category: "Hatchback", years: "2015 - Now", image: "🚗", variants: ["Sigma", "Delta", "Zeta", "Alpha"] },
      { name: "Wagon R", category: "Hatchback", years: "1999 - Now", image: "🚗", variants: ["LXI", "VXI", "ZXI", "ZXI+"] },
      { name: "Brezza", category: "SUV", years: "2016 - Now", image: "🚗", variants: ["LXI", "VXI", "ZXI", "ZXI+"] },
      { name: "Ertiga", category: "MUV", years: "2012 - Now", image: "🚗", variants: ["LXI", "VXI", "ZXI", "ZXI+"] },
      { name: "Dzire", category: "Sedan", years: "2008 - Now", image: "🚗", variants: ["LXI", "VXI", "ZXI", "ZXI+"] },
      { name: "Alto K10", category: "Hatchback", years: "2010 - Now", image: "🚗", variants: ["Std", "LXI", "VXI", "VXI+"] },
      { name: "Grand Vitara", category: "SUV", years: "2022 - Now", image: "🚗", variants: ["Sigma", "Delta", "Zeta", "Alpha", "Zeta+ Hybrid", "Alpha+ Hybrid"] },
      { name: "Fronx", category: "SUV", years: "2023 - Now", image: "🚗", variants: ["Sigma", "Delta", "Zeta", "Alpha"] },
      { name: "Celerio", category: "Hatchback", years: "2014 - Now", image: "🚗", variants: ["LXI", "VXI", "ZXI", "ZXI+"] },
      { name: "Ignis", category: "Hatchback", years: "2017 - Now", image: "🚗", variants: ["Sigma", "Delta", "Zeta", "Alpha"] },
      { name: "S-Presso", category: "Hatchback", years: "2019 - Now", image: "🚗", variants: ["Std", "LXI", "VXI", "VXI+"] }
    ]
  },
  "Hyundai": {
    models: [
      { name: "Creta", category: "SUV", years: "2015 - Now", image: "🚗", variants: ["E", "EX", "S", "SX", "SX(O)"] },
      { name: "i20", category: "Hatchback", years: "2008 - Now", image: "🚗", variants: ["Magna", "Sportz", "Asta", "Asta (O)"] },
      { name: "i10", category: "Hatchback", years: "2007 - 2016", image: "🚗", variants: ["Era", "Magna", "Sportz", "Asta"] },
      { name: "Grand i10", category: "Hatchback", years: "2013 - 2020", image: "🚗", variants: ["Era", "Magna", "Sportz", "Asta"] },
      { name: "Santro", category: "Hatchback", years: "1998 - 2022", image: "🚗", variants: ["Era", "Magna", "Sportz", "Asta"] },
      { name: "Verna", category: "Sedan", years: "2006 - Now", image: "🚗", variants: ["EX", "S", "SX", "SX(O)"] },
      { name: "Accent", category: "Sedan", years: "1999 - 2013", image: "🚗", variants: ["Executive", "GLE", "GVS"] },
      { name: "Venue", category: "SUV", years: "2019 - Now", image: "🚗", variants: ["E", "S", "SX", "SX(O)"] },
      { name: "Exter", category: "SUV", years: "2023 - Now", image: "🚗", variants: ["EX", "S", "SX", "SX(O)"] },
      { name: "Alcazar", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["Prestige", "Platinum", "Signature"] },
      { name: "Getz", category: "Hatchback", years: "2004 - 2010", image: "🚗", variants: ["GL", "GLE", "GLS", "Sportz"] },
      { name: "Sonata", category: "Sedan", years: "2001 - 2015", image: "🚗", variants: ["2.4 GDI", "2.0 CRDi", "Gold"] }
    ]
  },
  "Tata": {
    models: [
      { name: "Nexon", category: "SUV", years: "2017 - Now", image: "🚗", variants: ["XE", "XM", "XZ", "XZ+", "Creative", "Fearless"] },
      { name: "Punch", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["Pure", "Adventure", "Accomplished", "Creative"] },
      { name: "Altroz", category: "Hatchback", years: "2020 - Now", image: "🚗", variants: ["XE", "XM", "XT", "XZ", "XZ+"] },
      { name: "Harrier", category: "SUV", years: "2019 - Now", image: "🚗", variants: ["XE", "XM", "XT", "XZ", "XZ+", "Fearless"] },
      { name: "Safari", category: "SUV", years: "1998 - Now", image: "🚗", variants: ["XE", "XM", "XT", "XZ", "XZ+", "Accomplished"] },
      { name: "Tiago", category: "Hatchback", years: "2016 - Now", image: "🚗", variants: ["XE", "XM", "XT", "XZ", "XZ+"] },
      { name: "Tigor", category: "Sedan", years: "2017 - Now", image: "🚗", variants: ["XE", "XM", "XT", "XZ", "XZ+"] },
      { name: "Indica", category: "Hatchback", years: "1998 - 2018", image: "🚗", variants: ["DLS", "DLX", "LS", "LX"] },
      { name: "Nano", category: "Hatchback", years: "2008 - 2018", image: "🚗", variants: ["CX", "LX", "Twist", "GenX"] },
      { name: "Bolt", category: "Hatchback", years: "2015 - 2019", image: "🚗", variants: ["XE", "XM", "XT"] },
      { name: "Zest", category: "Sedan", years: "2014 - 2019", image: "🚗", variants: ["XE", "XM", "XT"] },
      { name: "Hexa", category: "SUV", years: "2017 - 2020", image: "🚗", variants: ["XE", "XM", "XT"] }
    ]
  },
  "Mahindra": {
    models: [
      { name: "Thar", category: "SUV", years: "2010 - Now", image: "🚗", variants: ["AX", "AX Opt", "LX", "Earth Edition"] },
      { name: "XUV700", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["MX", "AX3", "AX5", "AX7", "AX7 L"] },
      { name: "Scorpio Classic", category: "SUV", years: "2002 - Now", image: "🚗", variants: ["S", "S11"] },
      { name: "Scorpio-N", category: "SUV", years: "2022 - Now", image: "🚗", variants: ["Z2", "Z4", "Z6", "Z8", "Z8 L"] },
      { name: "Bolero", category: "SUV", years: "2000 - Now", image: "🚗", variants: ["B4", "B6", "B6 Opt"] },
      { name: "Bolero Neo", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["N4", "N8", "N10"] },
      { name: "XUV300", category: "SUV", years: "2019 - 2024", image: "🚗", variants: ["W4", "W6", "W8", "W8(O)"] },
      { name: "XUV500", category: "SUV", years: "2011 - 2021", image: "🚗", variants: ["W4", "W6", "W8", "W10", "W11"] },
      { name: "TUV300", category: "SUV", years: "2015 - 2020", image: "🚗", variants: ["T4", "T6", "T8", "T10"] },
      { name: "Marazzo", category: "MUV", years: "2018 - Now", image: "🚗", variants: ["M2", "M4+", "M6+"] },
      { name: "KUV100", category: "Hatchback", years: "2016 - 2023", image: "🚗", variants: ["K2", "K4+", "K6+", "K8"] }
    ]
  },
  "Force": {
    models: [
      { name: "Gurkha", category: "SUV", years: "2013 - Now", image: "🚗", variants: ["3-Door", "5-Door", "Extreme"] },
      { name: "Trax Cruiser", category: "MUV", years: "2000 - Now", image: "🚗", variants: ["Classic", "Deluxe", "Cruiser"] }
    ]
  },
  "ICML": {
    models: [
      { name: "Rhino Rx", category: "SUV", years: "2006 - 2015", image: "🚗", variants: ["S2", "DLX", "Winner", "Grand"] }
    ]
  },
  "San Motors": {
    models: [
      { name: "San Storm", category: "Convertible", years: "2001 - 2013", image: "🚗", variants: ["Standard 1.2"] }
    ]
  },
  "DC Design": {
    models: [
      { name: "DC Avanti", category: "Sports Car", years: "2015 - 2019", image: "🚗", variants: ["Standard 2.0"] }
    ]
  },
  "Reva": {
    models: [
      { name: "Reva i", category: "Electric Microcar", years: "2001 - 2012", image: "⚡", variants: ["Standard", "Classique", "Li-ion"] }
    ]
  },
  "Honda": {
    models: [
      { name: "City", category: "Sedan", years: "1998 - Now", image: "🚗", variants: ["V", "VX", "ZX", "V MT", "VX CVT"] },
      { name: "Amaze", category: "Sedan", years: "2013 - Now", image: "🚗", variants: ["E", "S", "VX"] },
      { name: "Civic", category: "Sedan", years: "2006 - 2021", image: "🚗", variants: ["V", "VX", "ZX"] },
      { name: "Jazz", category: "Hatchback", years: "2009 - 2022", image: "🚗", variants: ["V", "VX", "ZX", "S"] },
      { name: "Brio", category: "Hatchback", years: "2011 - 2019", image: "🚗", variants: ["E", "S", "V", "VX"] },
      { name: "WR-V", category: "SUV", years: "2017 - 2023", image: "🚗", variants: ["S", "V", "VX"] },
      { name: "Elevate", category: "SUV", years: "2023 - Now", image: "🚗", variants: ["SV", "V", "VX", "ZX"] }
    ]
  },
  "Toyota": {
    models: [
      { name: "Fortuner", category: "SUV", years: "2009 - Now", image: "🚗", variants: ["Standard", "Legender", "GR Sport"] },
      { name: "Innova Crysta", category: "MUV", years: "2005 - Now", image: "🚗", variants: ["G", "GX", "VX", "ZX"] },
      { name: "Innova Hycross", category: "MUV", years: "2022 - Now", image: "🚗", variants: ["GX", "VX Hybrid", "ZX Hybrid"] },
      { name: "Glanza", category: "Hatchback", years: "2019 - Now", image: "🚗", variants: ["E", "S", "G", "V"] },
      { name: "Urban Cruiser", category: "SUV", years: "2020 - 2022", image: "🚗", variants: ["Mid", "High", "Premium"] },
      { name: "Etios", category: "Sedan", years: "2010 - 2020", image: "🚗", variants: ["G", "GD", "V", "VD", "VX"] },
      { name: "Liva", category: "Hatchback", years: "2011 - 2020", image: "🚗", variants: ["G", "GD", "V", "VD"] }
    ]
  },
  "Kia": {
    models: [
      { name: "Seltos", category: "SUV", years: "2019 - Now", image: "🚗", variants: ["HTE", "HTK", "HTK+", "HTX", "GTX+", "X-Line"] },
      { name: "Sonet", category: "SUV", years: "2020 - Now", image: "🚗", variants: ["HTE", "HTK", "HTK+", "HTX", "GTX+", "X-Line"] },
      { name: "Carens", category: "MUV", years: "2022 - Now", image: "🚗", variants: ["Premium", "Prestige", "Luxury", "Luxury+"] },
      { name: "Carnival", category: "Luxury MUV", years: "1998 - Now", image: "🚙", variants: ["Prestige", "Limousine", "Limousine Plus"] }
    ]
  },
  "MG": {
    models: [
      { name: "Hector", category: "SUV", years: "2019 - Now", image: "🚗", variants: ["Style", "Shine", "Smart", "Sharp", "Savvy"] },
      { name: "Astor", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["Style", "Super", "Smart", "Sharp", "Savvy"] },
      { name: "ZS EV", category: "Electric", years: "2020 - Now", image: "⚡", variants: ["Executive", "Excite", "Exclusive", "Exclusive Pro"] },
      { name: "Comet EV", category: "Electric", years: "2023 - Now", image: "⚡", variants: ["Pace", "Play", "Plush"] }
    ]
  },
  "Renault": {
    models: [
      { name: "Kwid", category: "Hatchback", years: "2015 - Now", image: "🚗", variants: ["RXE", "RXL", "RXT", "Climber"] },
      { name: "Triber", category: "MUV", years: "2019 - Now", image: "🚗", variants: ["RXE", "RXL", "RXT", "RXZ"] },
      { name: "Kiger", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["RXE", "RXL", "RXT", "RXZ"] },
      { name: "Duster", category: "SUV", years: "2012 - 2022", image: "🚗", variants: ["RxE", "RxL", "RxS", "RxZ"] }
    ]
  },
  "Volkswagen": {
    models: [
      { name: "Taigun", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["Comfortline", "Highline", "Topline", "GT Plus"] },
      { name: "Virtus", category: "Sedan", years: "2022 - Now", image: "🚗", variants: ["Comfortline", "Highline", "Topline", "GT Plus"] },
      { name: "Polo", category: "Hatchback", years: "2010 - 2022", image: "🚗", variants: ["Trendline", "Comfortline", "Highline", "GT TSI"] },
      { name: "Vento", category: "Sedan", years: "2010 - 2022", image: "🚗", variants: ["Trendline", "Comfortline", "Highline"] }
    ]
  },
  "Skoda": {
    models: [
      { name: "Kushaq", category: "SUV", years: "2021 - Now", image: "🚗", variants: ["Active", "Ambition", "Style", "Monte Carlo"] },
      { name: "Slavia", category: "Sedan", years: "2022 - Now", image: "🚗", variants: ["Active", "Ambition", "Style"] },
      { name: "Rapid", category: "Sedan", years: "2011 - 2021", image: "🚗", variants: ["Active", "Ambition", "Style", "Rider Plus"] },
      { name: "Octavia", category: "Sedan", years: "2001 - 2023", image: "🚗", variants: ["Ambition", "Style", "L&K"] }
    ]
  },
  "Ford": {
    models: [
      { name: "Figo", category: "Hatchback", years: "2010 - 2021", image: "🚗", variants: ["LXI", "VXI", "ZXI", "Titanium"] },
      { name: "EcoSport", category: "SUV", years: "2013 - 2021", image: "🚗", variants: ["Ambiente", "Trend", "Titanium", "Sports"] },
      { name: "Endeavour", category: "SUV", years: "2003 - 2021", image: "🚙", variants: ["Trend", "Titanium", "Titanium Plus"] },
      { name: "Aspire", category: "Sedan", years: "2015 - 2021", image: "🚗", variants: ["Ambiente", "Trend", "Titanium", "Titanium Plus"] }
    ]
  },
  "Nissan": {
    models: [
      { name: "Magnite", category: "SUV", years: "2020 - Now", image: "🚗", variants: ["XE", "XL", "XV", "XV Premium"] },
      { name: "Sunny", category: "Sedan", years: "2011 - 2020", image: "🚗", variants: ["XE", "XL", "XV"] },
      { name: "Micra", category: "Hatchback", years: "2010 - 2020", image: "🚗", variants: ["XE", "XL", "XV"] }
    ]
  },
  "Fiat": {
    models: [
      { name: "Punto", category: "Hatchback", years: "2009 - 2020", image: "🚗", variants: ["Active", "Dynamic", "Emotion", "Abarth"] },
      { name: "Linea", category: "Sedan", years: "2009 - 2020", image: "🚗", variants: ["Active", "Dynamic", "Emotion"] }
    ]
  },
  "Chevrolet": {
    models: [
      { name: "Beat", category: "Hatchback", years: "2010 - 2017", image: "🚗", variants: ["PS", "LS", "LT", "LTZ"] },
      { name: "Cruze", category: "Sedan", years: "2009 - 2017", image: "🚗", variants: ["LT", "LTZ"] },
      { name: "Tavera", category: "MUV", years: "2004 - 2017", image: "🚗", variants: ["LS", "LT", "Neo 3"] }
    ]
  },
  "Porsche": {
    models: [
      { name: "911 Carrera", category: "Coupe", years: "1964 - Now", image: "🏎️", variants: ["Carrera", "Carrera S", "Turbo S", "GT3 RS"] },
      { name: "Cayenne", category: "Luxury SUV", years: "2002 - Now", image: "🚙", variants: ["Base", "E-Hybrid", "S", "Turbo GT"] },
      { name: "Macan", category: "Luxury SUV", years: "2014 - Now", image: "🚙", variants: ["Base", "T", "S", "GTS"] },
      { name: "Taycan", category: "Electric", years: "2019 - Now", image: "⚡", variants: ["Base", "4S", "Turbo", "Turbo S"] },
      { name: "Panamera", category: "Luxury Sedan", years: "2009 - Now", image: "🚗", variants: ["Base", "4", "4 E-Hybrid", "GTS"] }
    ]
  },
  "BMW": {
    models: [
      { name: "3 Series", category: "Luxury Sedan", years: "1975 - Now", image: "🚗", variants: ["330i", "330li", "M340i", "320d"] },
      { name: "5 Series", category: "Luxury Sedan", years: "1972 - Now", image: "🚗", variants: ["530i", "520d", "M550i", "M5"] },
      { name: "X1", category: "Luxury SUV", years: "2009 - Now", image: "🚙", variants: ["sDrive20i", "sDrive20d", "M Sport"] },
      { name: "X3", category: "Luxury SUV", years: "2003 - Now", image: "🚙", variants: ["xDrive30i", "xDrive20d", "M40i"] },
      { name: "X5", category: "Luxury SUV", years: "1999 - Now", image: "🚙", variants: ["xDrive40i", "xDrive30d", "M Sport"] }
    ]
  },
  "Mercedes-Benz": {
    models: [
      { name: "C-Class", category: "Luxury Sedan", years: "1993 - Now", image: "🚗", variants: ["C 200", "C 220d", "C 300d", "C 43 AMG"] },
      { name: "E-Class", category: "Luxury Sedan", years: "1953 - Now", image: "🚗", variants: ["E 200", "E 220d", "E 350d", "E 63 AMG"] },
      { name: "GLA", category: "Luxury SUV", years: "2013 - Now", image: "🚙", variants: ["GLA 200", "GLA 220d", "4MATIC"] },
      { name: "GLC", category: "Luxury SUV", years: "2015 - Now", image: "🚙", variants: ["GLC 200", "GLC 220d", "4MATIC"] },
      { name: "GLE", category: "Luxury SUV", years: "1997 - Now", image: "🚙", variants: ["GLE 300d", "GLE 450", "GLE 400d"] }
    ]
  },
  "Audi": {
    models: [
      { name: "A4", category: "Luxury Sedan", years: "1994 - Now", image: "🚗", variants: ["Premium", "Premium Plus", "Technology"] },
      { name: "A6", category: "Luxury Sedan", years: "1994 - Now", image: "🚗", variants: ["Premium Plus", "Technology"] },
      { name: "Q3", category: "Luxury SUV", years: "2011 - Now", image: "🚙", variants: ["Premium", "Premium Plus", "Technology", "Sportback"] },
      { name: "Q5", category: "Luxury SUV", years: "2008 - Now", image: "🚙", variants: ["Premium Plus", "Technology"] },
      { name: "Q7", category: "Luxury SUV", years: "2005 - Now", image: "🚙", variants: ["Premium Plus", "Technology"] }
    ]
  },
  "Bentley": {
    models: [
      { name: "Continental GT", category: "Luxury Coupe", years: "2003 - Now", image: "🏎️", variants: ["V8", "W12", "Mulliner", "Speed"] },
      { name: "Flying Spur", category: "Luxury Sedan", years: "2005 - Now", image: "🚗", variants: ["V8", "W12", "Hybrid"] },
      { name: "Bentayga", category: "Luxury SUV", years: "2015 - Now", image: "🚙", variants: ["V8", "W12 Speed", "E-Hybrid"] }
    ]
  },
  "Jaguar": {
    models: [
      { name: "XF", category: "Luxury Sedan", years: "2008 - Now", image: "🚗", variants: ["Prestige", "Portfolio", "R-Dynamic"] },
      { name: "XE", category: "Luxury Sedan", years: "2015 - 2024", image: "🚗", variants: ["Prestige", "Portfolio", "R-Dynamic"] },
      { name: "F-Pace", category: "Luxury SUV", years: "2016 - Now", image: "🚙", variants: ["Prestige", "Portfolio", "R-Dynamic S"] },
      { name: "F-Type", category: "Sports Car", years: "2013 - Now", image: "🏎️", variants: ["Coupe", "Convertible", "R"] }
    ]
  },
  "Land Rover": {
    models: [
      { name: "Range Rover", category: "Luxury SUV", years: "1970 - Now", image: "🚙", variants: ["SE", "HSE", "Autobiography", "SV"] },
      { name: "Range Rover Sport", category: "Luxury SUV", years: "2005 - Now", image: "🚙", variants: ["SE", "HSE", "Autobiography"] },
      { name: "Range Rover Evoque", category: "Luxury SUV", years: "2011 - Now", image: "🚙", variants: ["S", "SE", "HSE", "Dynamic"] },
      { name: "Discovery", category: "Luxury SUV", years: "1989 - Now", image: "🚙", variants: ["S", "SE", "HSE"] },
      { name: "Discovery Sport", category: "Luxury SUV", years: "2014 - Now", image: "🚙", variants: ["S", "SE", "R-Dynamic"] },
      { name: "Defender", category: "Luxury SUV", years: "1983 - Now", image: "🚙", variants: ["90", "110", "130", "X"] }
    ]
  },
  "Volvo": {
    models: [
      { name: "XC40", category: "Luxury SUV", years: "2017 - Now", image: "🚙", variants: ["Momentum", "Inscription", "R-Design", "Recharge"] },
      { name: "XC60", category: "Luxury SUV", years: "2008 - Now", image: "🚙", variants: ["Momentum", "Inscription", "R-Design"] },
      { name: "XC90", category: "Luxury SUV", years: "2002 - Now", image: "🚙", variants: ["Momentum", "Inscription", "Excellence"] },
      { name: "S90", category: "Luxury Sedan", years: "2016 - Now", image: "🚗", variants: ["Momentum", "Inscription"] },
      { name: "S60", category: "Luxury Sedan", years: "2000 - Now", image: "🚗", variants: ["Momentum", "Inscription", "R-Design"] }
    ]
  },
  "Mini Cooper": {
    models: [
      { name: "Cooper 3-Door", category: "Hatchback", years: "2001 - Now", image: "🚗", variants: ["Cooper", "Cooper S", "JCW"] },
      { name: "Cooper 5-Door", category: "Hatchback", years: "2014 - Now", image: "🚗", variants: ["Cooper", "Cooper S"] },
      { name: "Countryman", category: "SUV", years: "2010 - Now", image: "🚙", variants: ["Cooper", "Cooper S", "JCW"] },
      { name: "Convertible", category: "Convertible", years: "2004 - Now", image: "🚗", variants: ["Cooper", "Cooper S"] }
    ]
  },
  "Jeep": {
    models: [
      { name: "Compass", category: "SUV", years: "2017 - Now", image: "🚙", variants: ["Sport", "Longitude", "Limited", "Trailhawk"] },
      { name: "Meridian", category: "SUV", years: "2022 - Now", image: "🚙", variants: ["Limited", "Limited (O)", "Overland"] },
      { name: "Wrangler", category: "SUV", years: "1986 - Now", image: "🚙", variants: ["Unlimited", "Rubicon"] },
      { name: "Grand Cherokee", category: "SUV", years: "1992 - Now", image: "🚙", variants: ["Limited", "Overland", "Summit"] }
    ]
  },
  "Tesla": {
    models: [
      { name: "Model 3", category: "Electric Sedan", years: "2017 - Now", image: "⚡", variants: ["Standard Range", "Long Range", "Performance"] },
      { name: "Model Y", category: "Electric SUV", years: "2020 - Now", image: "⚡", variants: ["Standard Range", "Long Range", "Performance"] },
      { name: "Model S", category: "Electric Sedan", years: "2012 - Now", image: "⚡", variants: ["Long Range", "Plaid"] },
      { name: "Model X", category: "Electric SUV", years: "2015 - Now", image: "⚡", variants: ["Long Range", "Plaid"] }
    ]
  },
  "Aston Martin": {
    models: [
      { name: "DB11", category: "Grand Tourer", years: "2016 - Now", image: "🏎️", variants: ["V8", "V12", "AMR"] },
      { name: "Vantage", category: "Sports Car", years: "2005 - Now", image: "🏎️", variants: ["Coupe", "Roadster", "F1 Edition"] },
      { name: "DBX", category: "Luxury SUV", years: "2020 - Now", image: "🚙", variants: ["Base", "707"] }
    ]
  },
  "Ferrari": {
    models: [
      { name: "Roma", category: "Grand Tourer", years: "2020 - Now", image: "🏎️", variants: ["Coupe", "Spider"] },
      { name: "Portofino", category: "Grand Tourer", years: "2018 - Now", image: "🏎️", variants: ["Base", "M"] },
      { name: "F8 Tributo", category: "Sports Car", years: "2019 - Now", image: "🏎️", variants: ["Coupe", "Spider"] },
      { name: "296 GTB", category: "Sports Car", years: "2021 - Now", image: "🏎️", variants: ["GTB", "GTS"] }
    ]
  },
  "Datsun": {
    models: [
      { name: "GO", category: "Hatchback", years: "2014 - 2022", image: "🚗", variants: ["D", "A", "T", "T(O)"] },
      { name: "GO+", category: "MUV", years: "2015 - 2022", image: "🚗", variants: ["D", "A", "T", "T(O)"] },
      { name: "redi-GO", category: "Hatchback", years: "2016 - 2022", image: "🚗", variants: ["D", "A", "T", "T(O)"] }
    ]
  },
  "Mitsubishi": {
    models: [
      { name: "Pajero Sport", category: "SUV", years: "2011 - 2021", image: "🚙", variants: ["Standard", "Select", "Sport"] },
      { name: "Outlander", category: "SUV", years: "2007 - 2021", image: "🚙", variants: ["Standard", "Chrome"] },
      { name: "Lancer", category: "Sedan", years: "1998 - 2012", image: "🚗", variants: ["GLX", "SFX", "Cedia"] }
    ]
  },
  "Citroen": {
    models: [
      { name: "C3", category: "Hatchback", years: "2022 - Now", image: "🚗", variants: ["Live", "Feel", "Shine"] },
      { name: "C3 Aircross", category: "SUV", years: "2023 - Now", image: "🚙", variants: ["You", "Plus", "Max"] },
      { name: "C5 Aircross", category: "SUV", years: "2021 - Now", image: "🚙", variants: ["Feel", "Shine"] }
    ]
  },
  "Isuzu": {
    models: [
      { name: "D-Max V-Cross", category: "Pickup", years: "2016 - Now", image: "🛻", variants: ["Standard", "Z", "Z Prestige"] },
      { name: "MU-X", category: "SUV", years: "2017 - Now", image: "🚙", variants: ["4x2", "4x4"] }
    ]
  }
};

// Unified default catalog for the sell car form (brands + logos + popular flags)
// derived from the built-in brand database. Admin CMS edits layer on top of this.
const DEFAULT_SELL_CATALOG = catalogFromLegacy(brandData, BRAND_LOGOS);

// Detect PostgREST "unknown column" / stale schema-cache errors so we can retry
// the inspection insert with only the guaranteed base columns. These surface
// when the live database was created from an older public/schema.sql that is
// missing the denormalized seller_name/seller_mobile/seller_email/notes columns.
function isUnknownColumnError(message?: string): boolean {
  if (!message) return false;
  return (
    /schema cache/i.test(message) ||
    /could not find the .* column/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /PGRST204/i.test(message)
  );
}


// Gujarat RTO mapping GJ-1 to GJ-38 as requested by the user
const gujaratRTOs = [
  { code: "GJ-1", city: "Ahmedabad" },
  { code: "GJ-2", city: "Mehsana" },
  { code: "GJ-3", city: "Rajkot" },
  { code: "GJ-4", city: "Bhavnagar" },
  { code: "GJ-5", city: "Surat" },
  { code: "GJ-6", city: "Vadodara" },
  { code: "GJ-7", city: "Nadiad" },
  { code: "GJ-8", city: "Palanpur" },
  { code: "GJ-9", city: "Himmatnagar" },
  { code: "GJ-10", city: "Jamnagar" },
  { code: "GJ-11", city: "Junagadh" },
  { code: "GJ-12", city: "Bhuj" },
  { code: "GJ-13", city: "Surendranagar" },
  { code: "GJ-14", city: "Amreli" },
  { code: "GJ-15", city: "Valsad" },
  { code: "GJ-16", city: "Bharuch" },
  { code: "GJ-17", city: "Godhra" },
  { code: "GJ-18", city: "Gandhinagar" },
  { code: "GJ-19", city: "Bardoli" },
  { code: "GJ-20", city: "Dahod" },
  { code: "GJ-21", city: "Navsari" },
  { code: "GJ-22", city: "Rajpipla" },
  { code: "GJ-23", city: "Anand" },
  { code: "GJ-24", city: "Patan" },
  { code: "GJ-25", city: "Porbandar" },
  { code: "GJ-26", city: "Vyara" },
  { code: "GJ-27", city: "Ahmedabad East" },
  { code: "GJ-28", city: "Morbi" },
  { code: "GJ-29", city: "Dhrangadhra" },
  { code: "GJ-30", city: "Waghai (Dang)" },
  { code: "GJ-31", city: "Modasa" },
  { code: "GJ-32", city: "Veraval" },
  { code: "GJ-33", city: "Botad" },
  { code: "GJ-34", city: "Chhota Udepur" },
  { code: "GJ-35", city: "Lunawada" },
  { code: "GJ-36", city: "Morbi Rural" },
  { code: "GJ-37", city: "Khambhalia" },
  { code: "GJ-38", city: "Bavla" }
];

export function SellCarView({ onNavigateToDashboard, onBackToHome, onNavigateToSeller }: SellCarViewProps) {
  // Remembers the auto-created Seller account so "Go to Seller Dashboard" can
  // re-sign-in quietly instead of dropping the seller onto the login popup.
  const sellerAutoAuthRef = React.useRef<{
    email: string;
    password: string;
    signedIn: boolean;
    name: string;
    mobile: string;
    city: string;
  }>({
    email: "",
    password: "",
    signedIn: false,
    name: "",
    mobile: "",
    city: ""
  });

  const redirectTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // GA4 funnel — Event 1: user reached the Sell Car page. Fires once per page load.
  React.useEffect(() => {
    trackViewSellCar();
  }, []);

  const navigateToSellerDashboard = React.useCallback(async () => {
    // Re-resolve the authoritative profile (fresh role) so the Seller
    // dashboard renders even if the App-level auth listener resolved the
    // role before the seller sign-up / role promotion completed.
    const resolveProfile = async (user: any): Promise<Profile> => {
      let role: Profile["role"] = "Seller";
      let name: string = user?.user_metadata?.name || user?.name || user?.email?.split("@")[0] || "Seller";
      let mobile: string = user?.user_metadata?.mobile || user?.mobile || "";
      let city: string = user?.user_metadata?.city || user?.city || "Mumbai";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, email, mobile, role, city")
          .eq("id", user?.id)
          .maybeSingle();
        if (profile) {
          // Keep staff roles as-is; promote a plain Buyer (or unset role) to
          // Seller so the seller actually lands on the Seller dashboard.
          if (!profile.role || profile.role === "Buyer") {
            await supabase.from("profiles").update({ role: "Seller" }).eq("id", user?.id);
            profile.role = "Seller";
          }
          role = profile.role || role;
          name = profile.name || name;
          mobile = profile.mobile || mobile;
          city = profile.city || city;
        }
      } catch (e) {
        console.warn("Failed to resolve seller profile:", e);
      }
      return {
        id: user?.id || "",
        name,
        email: user?.email || "",
        mobile,
        role,
        city,
        created_at: user?.created_at || new Date().toISOString()
      };
    };

    let { email, password, name, mobile, city } = sellerAutoAuthRef.current;

    // The submit-time auto account may be gone if the page was reloaded, but
    // the generated password persists in localStorage — re-read it by email.
    if (!password && email) {
      password = localStorage.getItem(getAutoPasswordKey(email)) || "";
    }

    let user = (await supabase.auth.getUser()).data?.user;
    let lastAuthError: any = null;

    // 1. Quietly re-sign-in with the auto-created Seller credentials.
    if (!user && email && password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) user = data.user;
      else lastAuthError = error;
    }

    // 2. The account may never have been created (e.g. an interrupted first
    //    submission). Create-or-sign-in again with the Seller role so the
    //    dashboard's RLS queries have a real session.
    if (!user && email) {
      try {
        const { user: signedInUser, error: authError } = await resolveAutoSignIn(
          supabase,
          email,
          password,
          {
            data: {
              name: name || email.split("@")[0],
              email,
              mobile: mobile || "",
              role: "Seller",
              city: city || "Mumbai"
            }
          }
        );
        if (!authError && signedInUser) user = signedInUser;
        else {
          lastAuthError = authError;
          console.warn("Auto seller sign-in still failed — falling back to local profile.", authError);
        }
      } catch (e) {
        lastAuthError = e;
        console.warn("Auto seller sign-in threw — falling back to local profile.", e);
      }
    }

    if (user) {
      const profile = await resolveProfile(user);
      onNavigateToDashboard(profile);
      return;
    }

    // 3. LAST RESORT: never drop the seller onto a login popup. They already
    //    submitted a valid inspection, so open the Seller dashboard with a
    //    locally-built profile. RLS-gated data may be empty until a real
    //    session exists, but the dashboard opens every time.
    const errText = `${lastAuthError?.message || lastAuthError?.code || ""}`.toLowerCase();
    const emailPending = /email.*(not confirmed|not verified)|email_not_confirmed|confirm/i.test(errText);
    if (emailPending) {
      // One-time gentle notice instead of a login popup: the seller IS in, but
      // their account is waiting for email confirmation so inspection data
      // syncs only after they click the confirmation link in their inbox.
      toast.info("Your seller dashboard is ready. Please confirm the email sent to " + (email || "your inbox") + " so your inspection syncs to this account.");
    }
    onNavigateToDashboard({
      id: user?.id || "",
      name: name || email.split("@")[0] || "Seller",
      email,
      mobile,
      role: "Seller",
      city: city || "Mumbai",
      created_at: new Date().toISOString()
    });
  }, [onNavigateToDashboard]);

  const [settings, setSettings] = React.useState({
    sellCarBannerTitle: "Sell Your Car Instantly From Home",
    sellCarBannerDesc: "Book a 100% free home inspection, receive live bids from our verified dealer network, and complete the sale in 24 hours with free RC transfer.",
    sellCarFormHeading: "Get Your Car Valued",
    sellCarFormSubheading: "Fill in your car details and we'll get back to you with a competitive cash quote"
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse website settings in SellCarView", e);
        }
      }
    }

    const handleUpdate = () => {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
    };

    window.addEventListener("1stcars_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("1stcars_settings_updated", handleUpdate);
    };
  }, []);

  // Stepper state
  const [wizardStep, setWizardStep] = React.useState<number>(1);
  const [formStep, setFormStep] = React.useState<"form" | "success">("form");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdRequest, setCreatedRequest] = React.useState<any>(null);

  // Search queries for each stage
  const [brandSearch, setBrandSearch] = React.useState("");
  const [modelSearch, setModelSearch] = React.useState("");
  const [rtoSearch, setRtoSearch] = React.useState("");

  // Complete list of brands for viewing all
  const [showAllBrands, setShowAllBrands] = React.useState(false);

  // Selected values
  const [selectedBrand, setSelectedBrand] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState("");
  const [selectedYear, setSelectedYear] = React.useState<number>(2018);
  const [selectedFuel, setSelectedFuel] = React.useState("Petrol");
  const [selectedTransmission, setSelectedTransmission] = React.useState("Manual");
  const [selectedVariant, setSelectedVariant] = React.useState("Sportz");
  const [selectedRTO, setSelectedRTO] = React.useState("");
  const [selectedKMs, setSelectedKMs] = React.useState("30,000 - 40,000 Km");

  // Contact details & Booking address
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [preferredDate, setPreferredDate] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("10:00 AM - 12:00 PM");

  // States for the bottom "Sell or Trade-In in 3 steps" inline valuation calculator
  const [calcBrand, setCalcBrand] = React.useState("");
  const [calcYear, setCalcYear] = React.useState("2021");
  const [calcMileage, setCalcMileage] = React.useState("");
  const [calcEstimatedValue, setCalcEstimatedValue] = React.useState<number | null>(null);
  const [calcError, setCalcError] = React.useState("");

  const handleCalculateValuation = (e: React.FormEvent) => {
    e.preventDefault();
    setCalcError("");
    const mileageNum = Number(calcMileage);

    if (!calcBrand.trim()) {
      setCalcError("Please enter a brand / model name.");
      return;
    }
    if (isNaN(mileageNum) || mileageNum <= 0) {
      setCalcError("Please enter a valid mileage.");
      return;
    }

    // Shared honest heuristic — same numbers as the car valuation used on the
    // Buy-side detail page, so a quote never contradicts the rest of the site.
    const finalValue = estimateCarValue(calcBrand.trim(), Number(calcYear), mileageNum);
    setCalcEstimatedValue(finalValue);
    toast.success(`Instant valuation compiled for your ${calcBrand}!`);
  };

  const [dbBrands, setDbBrands] = React.useState<any[]>([]);

  // Admin-editable brand / model / variant catalog for the sell car form
  const [sellCatalog, setSellCatalog] = React.useState<SellCatalog>(() => {
    const stored = getStoredSellCatalog();
    return mergeCatalog(DEFAULT_SELL_CATALOG, stored?.brands, stored?.removed);
  });

  // Refresh catalog from Supabase settings + live-update on admin saves
  React.useEffect(() => {
    let active = true;
    const applyStored = () => {
      const stored = getStoredSellCatalog();
      if (stored) setSellCatalog(mergeCatalog(DEFAULT_SELL_CATALOG, stored.brands, stored.removed));
    };
    window.addEventListener("1stcars_settings_updated", applyStored);
    loadSellCatalogFromSupabase().then((stored) => {
      if (!active || !stored) return;
      setStoredSellCatalog(stored);
      setSellCatalog(mergeCatalog(DEFAULT_SELL_CATALOG, stored.brands, stored.removed));
    });
    return () => {
      active = false;
      window.removeEventListener("1stcars_settings_updated", applyStored);
    };
  }, []);

  // Populate user data if logged in & Fetch dynamic brands from Supabase database
  React.useEffect(() => {
    const fetchUserAndBrands = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setName(user.user_metadata?.name || user.email?.split("@")[0] || "");
          setEmail(user.email || user.user_metadata?.email || "");
          setMobile(user.user_metadata?.mobile || "");
        }
      } catch (e) {
        console.error("Error fetching user session details:", e);
      }

      try {
        const { data: brandsData } = await supabase.from("brands").select("*");
        if (brandsData && brandsData.length > 0) {
          setDbBrands(brandsData);
        }
      } catch (e) {
        console.error("Error fetching dynamic brands from database:", e);
      }
    };
    fetchUserAndBrands();
  }, []);

  const dbBrandNames = dbBrands.map(b => b.name);
  // Brands removed by the admin in the Sell Form & Brands Editor must stay hidden
  // even if they still exist in the Supabase `brands` table (which is shared with
  // the Buy-side catalog and therefore not deleted when removed from the sell form).
  const removedSellBrands = getStoredSellCatalog()?.removed || [];
  const brandRank = (name: string) => {
    const lower = String(name).toLowerCase();
    return SELL_BRAND_PRIORITY.findIndex((p) => p.toLowerCase() === lower);
  };
  const allBrands = Array.from(new Set([
    ...dbBrandNames.filter(b => !removedSellBrands.includes(b)),
    ...Object.keys(sellCatalog)
  ])).filter(Boolean).sort((a, b) => {
    const ra = brandRank(a);
    const rb = brandRank(b);
    if (ra !== -1 && rb !== -1) return ra - rb;
    if (ra !== -1) return -1;
    if (rb !== -1) return 1;
    return 0;
  });

  // Filter lists based on search
  const filteredBrands = allBrands.filter(b => 
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const brandModels = (selectedBrand && sellCatalog[selectedBrand]?.models)
    ? sellCatalog[selectedBrand].models
    : [
        { name: "Grand i10", category: "Hatchback", years: "2013-2020", image: "🚗", variants: ["Era", "Magna", "Sportz", "Asta"] },
        { name: "Swift Dzire", category: "Sedan", years: "2008-Now", image: "🚗", variants: ["LXI", "VXI", "ZXI"] },
        { name: "Polo", category: "Hatchback", years: "2010-2022", image: "🚗", variants: ["Trendline", "Comfortline", "Highline"] }
      ];

  const filteredModels = brandModels.filter(m => 
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const filteredRTOs = gujaratRTOs.filter(r => 
    r.code.toLowerCase().includes(rtoSearch.toLowerCase()) ||
    r.city.toLowerCase().includes(rtoSearch.toLowerCase())
  );

  // Available Years
  const yearsList: number[] = [];
  for (let y = 2025; y >= 2000; y--) {
    yearsList.push(y);
  }

  // KM ranges
  const kmRanges = [
    "0 - 10,000 Km",
    "10,000 - 20,000 Km",
    "20,000 - 30,000 Km",
    "30,000 - 40,000 Km",
    "40,000 - 50,000 Km",
    "50,000 - 60,000 Km",
    "60,000 - 70,000 Km",
    "70,000 - 80,000 Km",
    "80,000 - 90,000 Km",
    "90,000 - 1,00,000 Km",
    "1,00,000 - 1,25,000 Km",
    "1,25,000 - 1,50,000 Km",
    "1,50,000 - 1,75,000 Km",
    "1,75,000 - 2,00,000 Km",
    "2,00,000+ Km"
  ];

  // Submit flow
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // prevent double-submission / duplicate conversion events
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!mobile || mobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);

    // Find RTO city name
    const rtoDetails = gujaratRTOs.find(r => r.code === selectedRTO);
    const resolvedCity = rtoDetails ? rtoDetails.city : "Gujarat";
    const preliminaryName = name.trim();

    // Quick check if already signed in (no network trip for auto sign-in here).
    let user: any = null;
    let autoEmail = "";
    let autoPassword = "";
    try {
      user = (await supabase.auth.getUser()).data?.user;
      if (user) {
        autoEmail = email.trim();
        autoPassword = localStorage.getItem(getAutoPasswordKey(autoEmail)) || "";
      } else {
        autoEmail = email.trim();
        autoPassword = getOrCreateAutoPassword(autoEmail);
      }
      sellerAutoAuthRef.current = {
        email: autoEmail,
        password: autoPassword,
        signedIn: Boolean(user),
        name: preliminaryName,
        mobile: mobile,
        city: resolvedCity
      };
    } catch (authErr) {
      console.warn("Auth check failed during inspection submit:", authErr);
      autoEmail = email.trim();
      autoPassword = getOrCreateAutoPassword(autoEmail);
      sellerAutoAuthRef.current = { email: autoEmail, password: autoPassword, signedIn: false, name: preliminaryName, mobile: mobile, city: resolvedCity };
    }

    // Registration number is auto-set as a clear "to be recorded on-site"
    // placeholder — never a fabricated plate. The inspector records the real
    // plate during the doorstep visit.
    const computedReg = `${selectedRTO}-XX-0000`;

    // Smart default fallbacks for removed fields
    const finalName = name.trim() || user?.user_metadata?.name || user?.name || `Customer (${mobile.substring(6)})`;
    const finalEmail = email.trim() || user?.email || "";
    const finalAddress = address ? `Home Doorstep Inspection in ${address}` : `Home Doorstep Inspection near RTO ${selectedRTO} (${resolvedCity})`;
    const finalDate = preferredDate || new Date(Date.now() + 86400000).toISOString().split("T")[0]; // Tomorrow
    const finalTime = preferredTime || "11:00 AM - 01:00 PM";

    // Parse KM driven value — options are ranges like "30,000 - 40,000 Km";
    // take the UPPER bound so "0 - 10,000 Km" never becomes 0 km.
    const kmMatches = selectedKMs.match(/[\d,]+/g) || [];
    const kmValues = kmMatches.map((n) => Number(n.replace(/,/g, ""))).filter((n) => !isNaN(n));
    const computedKms = kmValues.length > 0 ? Math.max(...kmValues) : 35000;

    const inspectionRecord = {
      seller_id: user?.id || null,
      seller_name: finalName,
      seller_mobile: mobile,
      seller_email: finalEmail,
      reg_number: computedReg,
      brand: selectedBrand,
      model: selectedModel,
      variant: selectedVariant || "Standard",
      fuel: selectedFuel,
      transmission: selectedTransmission,
      year: Number(selectedYear),
      km_driven: computedKms,
      city: resolvedCity,
      address: finalAddress,
      preferred_date: finalDate,
      preferred_time: finalTime,
      status: "pending" as const,
      notes: "New inspection request from the Gujarat Sell Car form."
    };

    try {
      // Fast, minimal insert — no `.select()` round-trip on the critical path.
      let { error } = await supabase.from("inspections").insert([inspectionRecord]);

      // Schema-mismatch recovery: an older live database may be missing the
      // optional denormalized columns. Retry with only the base columns.
      if (error && isUnknownColumnError(error.message)) {
        const { seller_email, notes, ...baseRecord } = inspectionRecord;
        console.warn(
          "Inspections insert rejected an optional column — retrying with base columns only.",
          error.message
        );
        ({ error } = await supabase.from("inspections").insert([baseRecord]));
      }

      if (error) {
        throw new Error(error.message || "Could not save your inspection request.");
      }

      const inspectionId = `insp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const inserted: any = { ...inspectionRecord, id: inspectionId };
      setCreatedRequest(inserted);

      // Show success immediately — never block the UI on the follow-up calls.
      setFormStep("success");
      toast.success("Your inspection will contact you shortly!");

      // Meta + GA4 conversions (no PII) fire right after a successful insert.
      trackMetaEvent("Lead", {
        content_name: `${selectedBrand} ${selectedModel}`,
        content_category: "Sell Car / Inspection"
      });
      trackSellerLeadSubmit();

      // Auto sign-in so the seller lands on the Seller Dashboard — runs in the
      // background and never blocks the submission itself.
      void (async () => {
        try {
          if (!user) {
            await resolveAutoSignIn(supabase, autoEmail, autoPassword, {
              data: {
                name: preliminaryName,
                email: email.trim(),
                mobile: mobile,
                role: "Seller",
                city: resolvedCity
              }
            });
          }
        } catch (authErr) {
          console.warn("Auto Seller sign-in error during inspection submit:", authErr);
        }

        void notificationService.triggerInspectionSubmitted({
          id: inserted?.id || "insp-temp-id",
          sellerName: finalName,
          brand: selectedBrand,
          model: selectedModel,
          city: resolvedCity,
          preferred_date: finalDate
        }).catch((err) => console.warn("Background inspection notification failed:", err));

        void automationService.emitEvent({
          type: "inspection.created",
          sourceTable: "inspections",
          sourceId: inserted?.id,
          payload: {
            inspection_id: inserted?.id,
            city: resolvedCity,
            brand: selectedBrand,
            model: selectedModel,
            variant: selectedVariant,
            year: selectedYear,
            km_driven: computedKms,
            seller_name: finalName,
            seller_mobile: mobile,
            seller_email: finalEmail,
            preferred_date: finalDate,
            preferred_time: finalTime
          }
        }).catch((err) => console.warn("Automation event emission failed:", err));
      })();

      // Redirect to seller dashboard after 3 seconds.
      redirectTimerRef.current = window.setTimeout(() => {
        void navigateToSellerDashboard();
      }, 3000);
    } catch (error) {
      console.error("Error creating inspection request:", error);
      const raw = error instanceof Error ? error.message : String(error);
      // RLS insert failures happen when the live database predates the current
      // schema (missing "Visitors submit inspection requests" policy / anon
      // INSERT grant). Surface an actionable message instead of the raw SQL.
      const isRlsBlocked = /row.?level security policy/i.test(raw) || /permission denied/i.test(raw);
      const isSchemaMismatch = isUnknownColumnError(raw);
      const message = (isRlsBlocked || isSchemaMismatch)
        ? "your request was blocked because the live database is out of date. Please re-run public/schema.sql in the Supabase SQL Editor, then try again."
        : raw || "Please check your details and try again.";
      toast.error(`Failed to register your inspection: ${message}`);

    } finally {

      setIsSubmitting(false);
    }
  };

  // Skip or go directly to step
  const handleJumpToStep = (step: number) => {
    if (step < wizardStep) {
      setWizardStep(step);
    }
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen pb-20 text-left">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-emerald-50 to-emerald-100 text-slate-900 relative pt-24 sm:pt-28 pb-12 md:pb-16 overflow-hidden border-b border-[#2E7D32]/20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2E7D32]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#2E7D32]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-5">
          <div className="inline-flex">
            <span className="px-4 py-1.5 text-[11px] font-black tracking-widest text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 uppercase rounded-full flex items-center gap-1.5">
              <Tag className="h-4 w-4" /> SELL YOUR CAR
            </span>
          </div>
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {settings.sellCarBannerTitle}
          </h1>
          <p className="text-xs sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto leading-relaxed">
            {settings.sellCarBannerDesc}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form & Flow */}
          <div className="lg:col-span-8">
            
            {formStep === "form" ? (
              <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 shadow-sm">
                
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
                    {settings.sellCarFormHeading}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {settings.sellCarFormSubheading}
                  </p>
                </div>

                {/* Stepper Navigation Pills with horizontal scrolling */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-none mb-4">
                  {[
                    { step: 1, label: selectedBrand ? `✔ ${selectedBrand}` : "Brand" },
                    { step: 2, label: selectedModel ? `✔ ${selectedModel}` : "Model" },
                    { step: 3, label: selectedBrand && selectedModel && selectedVariant ? `✔ ${selectedVariant}` : "Variant" },
                    { step: 4, label: selectedBrand && selectedModel && selectedYear ? `✔ ${selectedYear}` : "Year" },
                    { step: 5, label: selectedBrand && selectedModel && selectedFuel ? `✔ ${selectedFuel}` : "Fuel" },
                    { step: 6, label: selectedRTO ? `✔ ${selectedRTO}` : "RTO" },
                    { step: 7, label: selectedBrand && selectedModel && selectedRTO && selectedKMs ? `✔ KMs` : "KMs" },
                    { step: 8, label: "Verify" }
                  ].map((item) => {
                    const isCompleted = wizardStep > item.step;
                    const isActive = wizardStep === item.step;
                    return (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => handleJumpToStep(item.step)}
                        disabled={!isCompleted}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                          isCompleted
                            ? "bg-emerald-50 border-emerald-200 text-[#2E7D32] cursor-pointer hover:bg-emerald-100"
                            : isActive
                              ? "bg-[#2E7D32] border-[#2E7D32] text-white font-black"
                              : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-8">
                  <div 
                    className="h-full bg-[#2E7D32] transition-all duration-300 ease-out"
                    style={{ width: `${(wizardStep / 8) * 100}%` }}
                  />
                </div>

                {/* STEP 1: SELECT BRAND */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Which brand is your car?</h3>
                      <p className="text-xs text-slate-400 font-semibold">Pick your car brand to get started</p>
                    </div>

                    {/* Search field */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search brand"
                        value={brandSearch}
                        onChange={(e) => { trackSellerFormStart(); setBrandSearch(e.target.value); }}
                        className="h-12 rounded-xl pl-10 border-slate-200 focus:border-[#2E7D32] text-sm"
                      />
                    </div>

                    {/* Grid of brand tiles */}
                    <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {(showAllBrands ? filteredBrands : filteredBrands.slice(0, 12)).map((b) => {
                        const isSelected = selectedBrand === b;
                        const matchingDbBrand = dbBrands.find(brand => brand.name === b);
                        const logoUrl = sellCatalog[b]?.logo || BRAND_LOGOS[b] || matchingDbBrand?.logo_url || matchingDbBrand?.logo;
                        const isImgValid = logoUrl && logoUrl !== "⭐" && (
                          logoUrl.startsWith("http") || 
                          logoUrl.startsWith("/") || 
                          logoUrl.startsWith("data:")
                        );

                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              trackSellerFormStart();
                              setSelectedBrand(b);
                              setSelectedModel("");
                              setWizardStep(2);
                            }}
                            className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[55px] h-14 ${
                              isSelected
                                ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32] shadow-sm font-black"
                                : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                            }`}
                          >
                            {isImgValid ? (
                              <div className="h-6 w-full flex items-center justify-center overflow-hidden mb-0.5">
                                <img src={logoUrl} alt={b} className="h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="text-sm font-bold uppercase tracking-tight mb-0.5">{b.substring(0, 2)}</div>
                            )}
                            <div className="text-[10px] font-bold leading-tight line-clamp-1">{b}</div>
                          </button>
                        );
                      })}
                    </div>

                    {!showAllBrands && filteredBrands.length > 12 && (
                      <button
                        type="button"
                        onClick={() => setShowAllBrands(true)}
                        className="w-full py-3 text-xs font-black uppercase tracking-widest text-[#2E7D32] bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                      >
                        View all brands
                      </button>
                    )}

                  </div>
                )}

                {/* STEP 2: SELECT MODEL */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                        <span>Selected Brand:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Which model?</h3>
                      <p className="text-xs text-slate-400 font-semibold">Select your car's model from the list</p>
                    </div>

                    {/* Search field */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search model"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="h-12 rounded-xl pl-10 border-slate-200 focus:border-[#2E7D32] text-sm"
                      />
                    </div>

                    {/* Grid of models */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredModels.map((m) => {
                        const isSelected = selectedModel === m.name;
                        return (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.name);
                              // Auto-suggest variants based on selected model
                              if (m.variants && m.variants.length > 0) {
                                setSelectedVariant(m.variants[0]);
                              }
                              setWizardStep(3);
                            }}
                            className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                              isSelected
                                ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32] shadow-sm"
                                : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{m.image}</span>
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 leading-tight">{m.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-none font-bold">
                                  {m.category} · {m.years}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        );
                      })}

                      {/* Custom fallback model option if search yields nothing */}
                      {filteredModels.length === 0 && (
                        <div className="col-span-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                          <p className="text-xs text-slate-500 font-bold">Could not find model matching "{modelSearch}"</p>
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedModel(modelSearch || "Other");
                              setWizardStep(3);
                            }}
                            className="bg-[#2E7D32] text-white text-xs font-bold px-4 py-2 rounded-xl"
                          >
                            Add custom model "{modelSearch || "Other"}"
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 2 of 8</div>
                    </div>
                  </div>
                )}

                {/* STEP 3: SELECT VARIANT */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                        <span>Selected Car:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Pick your variant</h3>
                      <p className="text-xs text-slate-400 font-semibold">Select trim level / variant standard</p>
                    </div>

                    {/* Variant Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        // Find model variants in DB
                        const matchingModel = (sellCatalog[selectedBrand]?.models || []).find(m => m.name === selectedModel);
                        const list = matchingModel?.variants || ["Sportz", "Magna", "Asta", "Standard", "LXI", "VXI", "ZXI"];
                        return list.map((v) => {
                          const isSelected = selectedVariant === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                setSelectedVariant(v);
                                setWizardStep(4);
                              }}
                              className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                isSelected
                                  ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                                  : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                              }`}
                            >
                              <span className="text-xs font-black">{v}</span>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Custom variant fallback input */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                        Don't see your variant? Type here:
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. LXI Option, Premium Dualtone"
                          value={selectedVariant}
                          onChange={(e) => setSelectedVariant(e.target.value)}
                          className="h-10 bg-white"
                        />
                        <Button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-xs font-bold px-4"
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 3 of 8</div>
                    </div>
                  </div>
                )}

                {/* STEP 4: SELECT YEAR */}
                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                        <span>Selected Car:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} · {selectedVariant}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Which year is your car?</h3>
                      <p className="text-xs text-slate-400 font-semibold">Select manufacturing year on RC plate</p>
                    </div>

                    {/* Grid of years */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {yearsList.map((y) => {
                        const isSelected = selectedYear === y;
                        return (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setSelectedYear(y);
                              setWizardStep(5);
                            }}
                            className={`p-3.5 rounded-xl border text-center text-xs font-black transition-all ${
                              isSelected
                                ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                                : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                            }`}
                          >
                            {y}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 4 of 8</div>
                    </div>
                  </div>
                )}

                {/* STEP 5: SELECT FUEL */}
                {wizardStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                        <span>Selected Car:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} ({selectedVariant} · {selectedYear})</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Fuel &amp; transmission</h3>
                      <p className="text-xs text-slate-400 font-semibold">Pick the gearbox, then tap your fuel type</p>
                    </div>

                    {/* Transmission toggle */}
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                        Transmission
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Manual", "Automatic"].map((t) => {
                          const isSelected = selectedTransmission === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTransmission(t)}
                              className={`p-3 rounded-2xl border text-center text-xs font-black transition-all ${
                                isSelected
                                  ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                                  : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid of Fuel Types */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {["Petrol", "Diesel", "CNG", "EV"].map((f) => {
                        const isSelected = selectedFuel === f;
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setSelectedFuel(f);
                              setWizardStep(6);
                            }}
                            className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                              isSelected
                                ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                                : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                            }`}
                          >
                            <span className="text-xs font-black">{f}</span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 5 of 8</div>
                    </div>
                  </div>
                )}

                {/* STEP 6: GUJARAT RTO ONLY */}
                {wizardStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                        <span>Selected Car:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} · {selectedVariant} · {selectedYear} · {selectedFuel}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Where is the car registered?</h3>
                      <p className="text-xs text-slate-400 font-semibold">Pick the Gujarat RTO office on your number plate</p>
                    </div>

                    {/* RTO Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search Gujarat RTO (e.g. GJ-1, Ahmedabad, Surat)"
                        value={rtoSearch}
                        onChange={(e) => setRtoSearch(e.target.value)}
                        className="h-12 rounded-xl pl-10 border-slate-200 focus:border-[#2E7D32] text-sm"
                      />
                    </div>

                    {/* Grid of Gujarat RTOs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {filteredRTOs.map((r) => {
                        const isSelected = selectedRTO === r.code;
                        return (
                          <button
                            key={r.code}
                            type="button"
                            onClick={() => {
                              setSelectedRTO(r.code);
                              setWizardStep(7);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              isSelected
                                ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32] shadow-sm"
                                : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                            }`}
                          >
                            <span className="bg-slate-200/60 text-[10px] font-black px-2 py-1 rounded text-slate-800">
                              {r.code}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-[11px] text-slate-900 truncate leading-tight">
                                {r.city}
                              </h4>
                            </div>
                          </button>
                        );
                      })}

                      {filteredRTOs.length === 0 && (
                        <div className="col-span-full py-6 text-center text-xs text-slate-400 font-bold">
                          No matching Gujarat RTO found. Please try searching GJ-1, GJ-2, etc.
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(5)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 6 of 8</div>
                    </div>
                  </div>
                )}

                {/* STEP 7: SELECT KM DRIVEN */}
                {wizardStep === 7 && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-black uppercase tracking-wider mb-1">
                        <span>Selected Car:</span>
                        <span className="bg-emerald-100 px-2 py-0.5 rounded-md">{selectedBrand} {selectedModel} · {selectedVariant} · {selectedYear} · {selectedFuel} · {selectedRTO}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">How many kms driven?</h3>
                      <p className="text-xs text-slate-400 font-semibold">Provide close estimate of total odometer reading</p>
                    </div>

                    {/* Grid of KM options */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {kmRanges.map((k) => {
                        const isSelected = selectedKMs === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              setSelectedKMs(k);
                              setWizardStep(8);
                            }}
                            className={`p-3.5 rounded-xl border text-center text-[11px] font-bold tracking-tight transition-all ${
                              isSelected
                                ? "border-[#2E7D32] bg-emerald-50 text-[#2E7D32]"
                                : "border-slate-100 hover:border-slate-300 bg-[#FAF9F6] text-slate-800"
                            }`}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(6)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 7 of 8</div>
                    </div>
                  </div>
                )}

                {/* STEP 8: CONTACT DETAILS & SUBMISSION */}
                {wizardStep === 8 && (
                  <form onSubmit={handleFinalSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Almost done — verify your details</h3>
                      <p className="text-xs text-slate-400 font-semibold">Please complete doorstep booking credentials</p>
                    </div>

                    {/* Car specs overview card */}
                    <div className="p-5 bg-gradient-to-r from-emerald-50 to-[#FAF9F6] border border-slate-200/60 rounded-2xl flex items-center gap-4 text-slate-800">
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-2xl border border-slate-100 shadow-xs shrink-0">
                        🚙
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] bg-[#2E7D32]/10 text-[#2E7D32] font-black uppercase px-2 py-0.5 rounded">
                          GJ REGISTRATION: {selectedRTO}
                        </span>
                        <h4 className="font-black text-sm text-slate-900 mt-1">
                          {selectedBrand} {selectedModel} · {selectedVariant}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                          {selectedYear} Manufacturing · {selectedFuel} · {selectedKMs} Odometer
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl flex gap-2.5">
                      <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                        Your mobile number stays strictly private — used purely to coordinate inspector dispatch and confirm competitive cash quotes.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Full Name Input Row */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">FULL NAME *</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Enter your full name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="h-11 rounded-xl pl-10 text-sm font-medium tracking-wide"
                          />
                        </div>
                      </div>

                      {/* Email Input Row */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">EMAIL ID *</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Enter your email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value.trim())}
                            required
                            className="h-11 rounded-xl pl-10 text-sm font-medium tracking-wide"
                          />
                        </div>
                      </div>

                      {/* Mobile Input Row */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">MOBILE NUMBER *</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Enter 10-digit mobile"
                            type="tel"
                            maxLength={10}
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                            required
                            className="h-11 rounded-xl pl-10 text-sm font-medium tracking-wide"
                          />
                        </div>
                      </div>

                      

                      

                    </div>
                    <div className="space-y-4 border-t border-slate-100 pt-5">
                      {/* Doorstep City Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">CITY *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <select
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl pl-10 pr-3 text-sm font-medium tracking-wide border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20 appearance-none"
                          >
                            <option value="" disabled>Select your city</option>
                            {gujaratRTOs.map((rto) => (
                              <option key={`${rto.code}-${rto.city}`} value={rto.city}>{rto.city}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Preferred Date + Time Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">PREFERRED DATE *</label>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                              type="date"
                              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                              value={preferredDate}
                              onChange={(e) => setPreferredDate(e.target.value)}
                              required
                              className="h-11 rounded-xl pl-10 text-sm font-medium tracking-wide"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">PREFERRED TIME *</label>
                          <div className="relative">
                            <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <select
                              value={preferredTime}
                              onChange={(e) => setPreferredTime(e.target.value)}
                              required
                              className="h-11 w-full rounded-xl pl-10 pr-3 text-sm font-medium tracking-wide border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20 appearance-none"
                            >
                              {["10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM", "06:00 PM - 08:00 PM"].map((slot) => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl h-13 transition-all bg-[#2E7D32] hover:bg-[#25632a] text-white shadow-[#2E7D32]/20 cursor-pointer"
                      >
                        {isSubmitting ? "Registering Valuation..." : "Submit my car details"}
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setWizardStep(7)}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <div className="text-slate-400">Step 8 of 8</div>
                    </div>
                  </form>
                )}

              </div>
            ) : (
              <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-8 md:p-12 text-center shadow-md space-y-6">
                <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                
                <div className="space-y-2">
                  <span className="text-[#2E7D32] font-black text-xs uppercase tracking-widest">Appointment Confirmed</span>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Inspection Request has been created!</h2>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto">
                    We have successfully registered your vehicle <strong>{createdRequest?.reg_number}</strong> ({createdRequest?.brand} {createdRequest?.model}) in the database.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-[#FAF9F6] border border-slate-100 rounded-2xl p-6 text-left space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                    <ClipboardCheck className="h-4.5 w-4.5 text-[#2E7D32]" /> Lead Confirmation Details
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-bold text-slate-600">
                    <div>Seller Name:</div>
                    <div className="text-slate-800 text-right">{createdRequest?.seller_name}</div>
                    
                    <div>Mobile:</div>
                    <div className="text-slate-800 text-right">{createdRequest?.seller_mobile}</div>

                    <div>Email:</div>
                    <div className="text-slate-800 text-right">{createdRequest?.seller_email}</div>

                    <div>Inspection Slot:</div>
                    <div className="text-[#2E7D32] text-right">{createdRequest?.preferred_date} ({createdRequest?.preferred_time})</div>

                    <div>Address:</div>
                    <div className="text-slate-800 text-right line-clamp-1">{createdRequest?.address}</div>

                    <div>Status:</div>
                    <div className="text-right">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black">
                        Pending Inspector Assign
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl max-w-md mx-auto space-y-2">
                  <p className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Next Steps & Timeline
                  </p>
                  <ul className="text-xs text-slate-600 space-y-2 font-medium">
                    <li className="flex gap-2 text-left">
                      <span className="text-[#2E7D32] font-bold">1.</span>
                      <span>An Inspector has been automatically notified in the region of {createdRequest?.city}.</span>
                    </li>
                    <li className="flex gap-2 text-left">
                      <span className="text-[#2E7D32] font-bold">2.</span>
                      <span>The inspector will call you to confirm your exact doorstep coordinates.</span>
                    </li>
                    <li className="flex gap-2 text-left">
                      <span className="text-[#2E7D32] font-bold">3.</span>
                      <span>Post-inspection, verified elite dealers will compete in live bidding auctions.</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    onClick={() => { void navigateToSellerDashboard(); }}
                    className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-xs font-bold uppercase tracking-wider px-6 rounded-xl h-11"
                  >
                    Go to Seller Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onBackToHome}
                    className="border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider px-6 rounded-xl h-11 bg-white"
                  >
                    Back to Browse Cars
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Spinny Trust Badges & FAQ */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Trust Badges */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-5">
              <h3 className="font-black text-slate-900 text-base tracking-tight border-b border-slate-100 pb-3 uppercase text-[11px] tracking-widest text-[#2E7D32]">
                Why Sell with 1stCars?
              </h3>

              <div className="space-y-4">
                {[
                  { 
                    icon: ShieldCheck, 
                    title: "Free Doorstep Inspection", 
                    desc: "No hidden checklist fees. Completely free scheduling at your convenience." 
                  },
                  { 
                    icon: Clock, 
                    title: "Offers in 1 Hours", 
                    desc: "Once inspected, your vehicle goes into live custom bidding with 250+ certified dealers." 
                  },
                  { 
                    icon: Sparkles, 
                    title: "Instant Secure Payment", 
                    desc: "No payment delay. Funds transferred directly to your bank account before handover." 
                  },
                  { 
                    icon: FileText, 
                    title: "Free RC Transfer & Paperwork", 
                    desc: "100% legal coverage. All paperwork, registration transfers, and liabilities handled by us." 
                  }
                ].map((badge, idx) => (
                  <div key={idx} className="flex gap-3 text-left">
                    <div className="h-9 w-9 bg-emerald-50 text-[#2E7D32] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <badge.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{badge.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Pricing Alert */}
            <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-5 space-y-2 text-left">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                <ShieldAlert className="h-4 w-4" /> Bypassing Auto-Estimates
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Unlike primitive portals, <strong>1stCars does not use algorithmic price estimates</strong>. Auto-estimates often devalue high-spec features. Real market bidding from verified local dealers ensures you secure the actual true valuation of your car!
              </p>
            </div>

          </div>

        </div>

        {/* Sell or Trade-In In 3 Simple Steps section - BELOW THE FORM so the
            form is the first thing visitors see after the hero */}
        <div className="mt-12 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/80 shadow-xs" id="sell-steps">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-8">
            <span className="inline-block bg-[#2E7D32]/10 text-[#2E7D32] px-3.5 py-1 text-[11px] font-black tracking-widest uppercase rounded-full">
              SELL YOUR CAR
            </span>
            <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 leading-none">
              Sell or Trade-In In 3 Simple Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              We leverage professional evaluators and an elite 180+ dealer network. No listing hassle, no shady strangers, complete transparency.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-5 text-left">
            {/* Step 1 Item */}
            <div className="flex items-start space-x-4 sm:space-x-5 bg-[#FAF9F6] p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-base sm:text-lg shrink-0">
                01
              </div>
              <div className="space-y-2 flex-grow">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Book Free Inspection</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Complete our quick form and choose your preferred date, time &amp; location home, office, or inspection center.
                </p>
              </div>
            </div>

            {/* Step 2 Item */}
            <div className="flex items-start space-x-4 sm:space-x-5 bg-[#FAF9F6] p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-base sm:text-lg shrink-0">
                02
              </div>
              <div className="space-y-1 flex-grow">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Choose How to Sell</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-bold">
                  <li className="bg-white border border-slate-200/70 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-slate-800 block font-black">Instant Offer</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Get a direct cash offer from 1stCars.</span>
                  </li>
                  <li className="bg-white border border-slate-200/70 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-slate-800 block font-black">Dealer Auction</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">180+ dealers compete for your car.</span>
                  </li>
                  <li className="bg-white border border-slate-200/70 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-slate-800 block font-black">Direct Deal</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Sell car directly to buyer.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 Item */}
            <div className="flex items-start space-x-4 sm:space-x-5 bg-[#FAF9F6] p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-base sm:text-lg shrink-0">
                03
              </div>
              <div className="space-y-1 flex-grow">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Get Paid Same Day</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Get instant bank transfer, loan settlement support, and zero-hassle ownership transfer. We handle the paperwork for you.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
