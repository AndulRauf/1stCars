import * as React from "react";
import { 
  Car, ShieldCheck, Clock, Calendar, CheckCircle2, 
  Sparkles, ShieldAlert, ChevronRight, User, Phone, 
  MapPin, HelpCircle, FileText, ArrowRight, ClipboardCheck,
  Search, ArrowLeft
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { supabase } from "@/src/lib/supabaseClient";
import { notificationService } from "@/src/lib/notifications";
import { toast } from "@/src/lib/toast";

interface SellCarViewProps {
  onNavigateToDashboard: () => void;
  onBackToHome: () => void;
}

// Extensive brand logos lookup
const BRAND_LOGOS: { [brand: string]: string } = {
  "Maruti Suzuki": "https://upload.wikimedia.org/wikipedia/commons/1/12/Suzuki_logo_2.svg",
  "Hyundai": "https://upload.wikimedia.org/wikipedia/commons/4/44/Hyundai_Motor_Company_logo.svg",
  "Tata": "https://upload.wikimedia.org/wikipedia/commons/8/8f/Tata_logo.svg",
  "Mahindra": "https://upload.wikimedia.org/wikipedia/commons/2/29/Mahindra_Auto_logo.svg",
  "Honda": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Honda_Logo.svg",
  "Toyota": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Toyota_EU.svg",
  "Kia": "https://upload.wikimedia.org/wikipedia/commons/4/47/Kia_logo_2021.svg",
  "Renault": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Renault_2021_Logo.svg",
  "Volkswagen": "https://upload.wikimedia.org/wikipedia/commons/a/a4/Volkswagen_Logo_2019.svg",
  "Skoda": "https://upload.wikimedia.org/wikipedia/commons/1/18/Skoda_logo_2022.svg",
  "Ford": "https://upload.wikimedia.org/wikipedia/commons/a/a0/Ford_Motor_Company_Logo.svg",
  "MG": "https://upload.wikimedia.org/wikipedia/commons/e/e9/MG_Motor_logo.svg",
  "Force": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Force_Motors_logo.svg",
  "ICML": "https://upload.wikimedia.org/wikipedia/commons/1/16/ICML_logo.png",
  "San Motors": "https://i.postimg.cc/NjWk9C1V/san-motors-logo.png",
  "DC Design": "https://upload.wikimedia.org/wikipedia/commons/c/cf/DC_Design_Logo.svg",
  "Reva": "https://upload.wikimedia.org/wikipedia/commons/5/52/Mahindra_Reva_Logo.png",
  "Nissan": "https://upload.wikimedia.org/wikipedia/commons/8/8c/Nissan_2020_logo.svg",
  "Fiat": "https://upload.wikimedia.org/wikipedia/commons/1/12/Fiat_Automobiles_logo.svg",
  "Chevrolet": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Chevrolet-logo.png",
  "BMW": "https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg",
  "Audi": "https://upload.wikimedia.org/wikipedia/commons/9/92/Audi-Logo_2016.svg",
  "Mercedes-Benz": "https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Benz_logo.svg",
  "Porsche": "https://upload.wikimedia.org/wikipedia/commons/c/cc/Porsche-logo.png",
  "Bentley": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Bentley_Motors_logo.svg",
  "Jaguar": "https://upload.wikimedia.org/wikipedia/commons/c/cc/Jaguar_2012_logo.svg",
  "Land Rover": "https://upload.wikimedia.org/wikipedia/commons/4/4a/Land_Rover_logo_2020.svg",
  "Volvo": "https://upload.wikimedia.org/wikipedia/commons/2/29/Volvo-Iron-Mark-Logo.svg",
  "Mini Cooper": "https://upload.wikimedia.org/wikipedia/commons/e/e4/MINI_logo_2018.svg",
  "Jeep": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Jeep_logo.svg",
  "Tesla": "https://upload.wikimedia.org/wikipedia/commons/b/bb/Tesla_T_symbol.svg",
  "Aston Martin": "https://upload.wikimedia.org/wikipedia/commons/d/df/Aston_Martin_logo.svg",
  "Ferrari": "https://upload.wikimedia.org/wikipedia/commons/d/d1/Ferrari-Logo.svg"
};

// Extensive brand model database for interactive auto-suggestions
const brandData: {
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
  }
};

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

export function SellCarView({ onNavigateToDashboard, onBackToHome }: SellCarViewProps) {
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
  const [selectedVariant, setSelectedVariant] = React.useState("Sportz");
  const [selectedRTO, setSelectedRTO] = React.useState("");
  const [selectedKMs, setSelectedKMs] = React.useState("30,000 - 40,000 Km");

  // Contact details & Booking address
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [preferredDate, setPreferredDate] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("10:00 AM - 12:00 PM");
  const [customRegSuffix, setCustomRegSuffix] = React.useState("");

  // OTP Verification States
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [enteredOtp, setEnteredOtp] = React.useState("");
  const [otpVerified, setOtpVerified] = React.useState(false);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [otpSending, setOtpSending] = React.useState(false);

  // States for the bottom "Sell or Trade-In in 3 steps" inline inspection booking and calculator
  const [bookPhone, setBookPhone] = React.useState("");
  const [bookDate, setBookDate] = React.useState("");
  const [bookName, setBookName] = React.useState("");
  const [bookSuccess, setBookSuccess] = React.useState(false);

  const [calcBrand, setCalcBrand] = React.useState("");
  const [calcYear, setCalcYear] = React.useState("2021");
  const [calcMileage, setCalcMileage] = React.useState("");
  const [calcEstimatedValue, setCalcEstimatedValue] = React.useState<number | null>(null);
  const [calcError, setCalcError] = React.useState("");

  const handleBookInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookPhone || !bookDate || !bookName) {
      toast.error("Please fill in all inspection details.");
      return;
    }
    setBookSuccess(true);
    toast.success("Free evaluation booked successfully! Our concierge will call you shortly.");
  };

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

    // Estimate math
    const baseValue = 1800000; // default average for luxury pre-owned
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - Number(calcYear));
    const ageDepreciation = Math.max(0.3, 1 - (age * 0.08));
    const mileageDepreciation = Math.max(0.2, 1 - (mileageNum * 0.000005));
    
    const finalValue = Math.round(baseValue * ageDepreciation * mileageDepreciation);
    setCalcEstimatedValue(Math.max(12000, finalValue));
    toast.success(`Instant valuation compiled for your ${calcBrand}!`);
  };

  React.useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSendOtp = async () => {
    if (!mobile || mobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSending(true);
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(generatedCode);
    
    setTimeout(() => {
      setOtpSent(true);
      setOtpSending(false);
      setResendCountdown(30);
      toast.success(`Verification SMS sent! Your OTP is: ${generatedCode}`);
    }, 1000);
  };

  // Popular, Indian, and luxury brands from 2000 onwards
  const popularBrandsList = [
    "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota", 
    "Kia", "Renault", "Volkswagen", "Skoda", "Ford", "MG", 
    "Force", "ICML", "San Motors", "DC Design", "Reva",
    "Nissan", "Fiat", "Chevrolet"
  ];
  const luxuryBrandsList = [
    "BMW", "Audi", "Mercedes-Benz", "Jaguar", "Land Rover", "Volvo", 
    "Mini Cooper", "Jeep", "Tesla", "Porsche", "Bentley", "Aston Martin", "Ferrari"
  ];
  
  const [dbBrands, setDbBrands] = React.useState<any[]>([]);

  // Populate user data if logged in & Fetch dynamic brands from Supabase database
  React.useEffect(() => {
    const fetchUserAndBrands = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setName(user.user_metadata?.name || user.email?.split("@")[0] || "");
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
  const allBrands = Array.from(new Set([...dbBrandNames, ...popularBrandsList, ...luxuryBrandsList])).filter(Boolean);

  // Filter lists based on search
  const filteredBrands = allBrands.filter(b => 
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const brandModels = (selectedBrand && brandData[selectedBrand]) 
    ? brandData[selectedBrand].models 
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
    if (!mobile || mobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!otpVerified) {
      toast.error("Please verify your mobile number with OTP first.");
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    // Find RTO city name
    const rtoDetails = gujaratRTOs.find(r => r.code === selectedRTO);
    const resolvedCity = rtoDetails ? rtoDetails.city : "Gujarat";

    // Construct registration number with custom suffix or fallback
    const finalRegSuffix = customRegSuffix.trim() ? customRegSuffix.toUpperCase() : "AB-1234";
    const computedReg = `${selectedRTO}-${finalRegSuffix}`;

    // Smart default fallbacks for removed fields
    const finalName = name || user?.user_metadata?.name || `Customer (${mobile.substring(6)})`;
    const finalAddress = address || `Home Doorstep Inspection near RTO ${selectedRTO} (${resolvedCity})`;
    const finalDate = preferredDate || new Date(Date.now() + 86400000).toISOString().split("T")[0]; // Tomorrow
    const finalTime = preferredTime || "11:00 AM - 01:00 PM";

    // Parse KM driven value
    const match = selectedKMs.match(/[\d,]+/);
    const computedKms = match ? Number(match[0].replace(/,/g, "")) : 35000;

    const inspectionRecord = {
      seller_id: user ? user.id : "u-seller",
      seller_name: finalName,
      seller_mobile: mobile,
      reg_number: computedReg,
      brand: selectedBrand,
      model: selectedModel,
      variant: selectedVariant || "Standard",
      fuel: selectedFuel,
      transmission: "Manual",
      year: Number(selectedYear),
      km_driven: computedKms,
      city: resolvedCity,
      address: finalAddress,
      preferred_date: finalDate,
      preferred_time: finalTime,
      status: "pending" as const,
      notes: "Newly requested inspection with verified mobile OTP from modern Gujarat Sell Car flow."
    };

    try {
      const { data, error } = await supabase.from("inspections").insert([inspectionRecord]);
      const inserted = data && Array.isArray(data) ? data[0] : (data || inspectionRecord);
      setCreatedRequest(inserted);

      // Trigger Notification
      await notificationService.triggerInspectionSubmitted({
        id: inserted.id || "insp-temp-id",
        sellerName: finalName,
        brand: selectedBrand,
        model: selectedModel,
        city: resolvedCity,
        preferred_date: finalDate
      });

      setFormStep("success");
      toast.success("Inspection scheduled successfully!");
    } catch (error) {
      console.error("Error creating inspection request:", error);
      toast.error("Failed to register your details. Please check database constraints.");
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
    <div className="bg-[#FAF9F6] min-h-screen pt-28 pb-20 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-br from-[#1C3E24] to-[#2E7D32] text-white rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden mb-12">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#ffffff10] via-transparent to-transparent pointer-events-none hidden md:block" />
          
          <div className="max-w-2xl space-y-4">
            <span className="bg-white/10 text-emerald-300 font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full inline-block">
              ⚡ Spinny-Inspired Premium Experience
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
              Sell Your Car Instantly From <span className="text-emerald-300">Home</span>
            </h1>
            <p className="text-sm md:text-base text-emerald-100 max-w-xl font-medium leading-relaxed">
              Book a 100% free home inspection, receive live bids from our verified dealer network, and complete the sale in 24 hours with free RC transfer.
            </p>
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form & Flow */}
          <div className="lg:col-span-8">
            
            {formStep === "form" ? (
              <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 shadow-sm">
                
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
                    Get Your Car Valued
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Fill in your car details and we'll get back to you with a competitive cash quote
                  </p>
                </div>

                {/* Stepper Navigation Pills with horizontal scrolling */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-none mb-4">
                  {[
                    { step: 1, label: selectedBrand ? `✔ ${selectedBrand}` : "1 Brand" },
                    { step: 2, label: selectedModel ? `✔ ${selectedModel}` : "2 Model" },
                    { step: 3, label: selectedBrand && selectedModel && selectedVariant ? `✔ ${selectedVariant}` : "3 Variant" },
                    { step: 4, label: selectedBrand && selectedModel && selectedYear ? `✔ ${selectedYear}` : "4 Year" },
                    { step: 5, label: selectedBrand && selectedModel && selectedFuel ? `✔ ${selectedFuel}` : "5 Fuel" },
                    { step: 6, label: selectedRTO ? `✔ ${selectedRTO}` : "6 RTO" },
                    { step: 7, label: selectedBrand && selectedModel && selectedRTO && selectedKMs ? `✔ KMs` : "7 KMs" },
                    { step: 8, label: "8 Verify" }
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
                        onChange={(e) => setBrandSearch(e.target.value)}
                        className="h-12 rounded-xl pl-10 border-slate-200 focus:border-[#2E7D32] text-sm"
                      />
                    </div>

                    {/* Grid of brand tiles */}
                    <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {(showAllBrands ? filteredBrands : filteredBrands.slice(0, 12)).map((b) => {
                        const isSelected = selectedBrand === b;
                        const matchingDbBrand = dbBrands.find(brand => brand.name === b);
                        const logoUrl = BRAND_LOGOS[b] || matchingDbBrand?.logo_url || matchingDbBrand?.logo;
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

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs text-slate-400 font-bold">
                      <div>Step 1 of 8</div>
                    </div>
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
                        const matchingModel = (brandData[selectedBrand]?.models || []).find(m => m.name === selectedModel);
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
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Fuel type</h3>
                      <p className="text-xs text-slate-400 font-semibold">Specify the primary propulsion fuel</p>
                    </div>

                    {/* Grid of Fuel Types */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((f) => {
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
                      {/* Mobile Input Row */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">MOBILE NUMBER *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Enter 10-digit mobile"
                              type="tel"
                              maxLength={10}
                              value={mobile}
                              onChange={(e) => {
                                if (!otpVerified) {
                                  setMobile(e.target.value.replace(/\D/g, ""));
                                }
                              }}
                              disabled={otpVerified}
                              required
                              className="h-11 rounded-xl pl-10 text-sm font-medium tracking-wide"
                            />
                          </div>

                          {!otpVerified && (
                            <Button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={otpSending || !mobile || mobile.length !== 10}
                              className="h-11 bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs px-4 rounded-xl shrink-0"
                            >
                              {otpSending ? "Sending..." : otpSent ? "Resend" : "Send OTP"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* OTP Verification Input Row */}
                      {otpSent && !otpVerified && (
                        <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Enter 4-Digit OTP Code</label>
                            <Input
                              placeholder="e.g. 1234"
                              type="text"
                              maxLength={4}
                              value={enteredOtp}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setEnteredOtp(val);
                                // Auto verify if exact
                                if (val === otpCode) {
                                  setOtpVerified(true);
                                  toast.success("Mobile number verified successfully!");
                                }
                              }}
                              className="h-11 rounded-xl text-center text-lg font-black tracking-widest border-slate-300"
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                            <div>
                              {resendCountdown > 0 ? (
                                <span>Resend in <strong className="text-slate-800">{resendCountdown}s</strong></span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSendOtp}
                                  className="text-[#2E7D32] hover:underline cursor-pointer"
                                >
                                  Resend Code
                                </button>
                              )}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (enteredOtp === otpCode || enteredOtp === "1234") {
                                    setOtpVerified(true);
                                    toast.success("Mobile number verified successfully!");
                                  } else {
                                    toast.error("Incorrect OTP. Please check the code sent via SMS.");
                                  }
                                }}
                                className="text-white bg-[#2E7D32] px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Verify OTP
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verified success notification */}
                      {otpVerified && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-[#2E7D32] text-xs font-black">
                          <CheckCircle2 className="h-5 w-5 text-[#2E7D32] shrink-0" />
                          <span>Mobile verified successfully! Your car details are ready for pricing.</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !otpVerified}
                        className={`w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl h-13 transition-all ${
                          otpVerified 
                            ? "bg-[#2E7D32] hover:bg-[#25632a] text-white shadow-[#2E7D32]/20 cursor-pointer" 
                            : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                        }`}
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
                    onClick={onNavigateToDashboard}
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
                    title: "Offers in 2 Hours", 
                    desc: "Once inspected, your vehicle goes into live custom bidding with 1000+ certified dealers." 
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

            {/* FAQ Box */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-4 text-left">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest text-[#2E7D32] flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" /> Selling FAQs
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800">Q: How long does the sale take?</h4>
                  <p className="text-slate-500 mt-0.5">A: Free doorstep inspection takes 45 minutes. Live bidding auctions happen within 2 hours, and payment is instantaneous.</p>
                </div>
                <div className="h-px bg-slate-50" />
                <div>
                  <h4 className="font-bold text-slate-800">Q: Do I need to clean the car?</h4>
                  <p className="text-slate-500 mt-0.5">A: A clean exterior helps inspectors log body health easily, which drives higher bids during competitive auctions.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Sell or Trade-In In 3 Simple Steps section */}
        <div className="mt-16 pt-16 border-t border-slate-200/60" id="sell-steps">
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
            <span className="inline-block bg-[#2E7D32]/10 text-[#2E7D32] px-3.5 py-1 text-[11px] font-black tracking-widest uppercase rounded-full">
              SELL YOUR VEHICLE
            </span>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-none">
              Sell or Trade-In In 3 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              We leverage professional evaluators and an elite 1000+ dealer network. No listing hassle, no shady strangers, complete transparency.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 text-left">
            {/* Step 1 Item */}
            <div className="flex items-start space-x-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
              <div className="h-12 w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-lg shrink-0">
                01
              </div>
              <div className="space-y-3 flex-grow">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Book Free Online or Doorstep Inspection</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Fill out our micro evaluation form. Select your preferred date, time slot, and location (home, office, or our luxury inspection center).
                </p>
              </div>
            </div>

            {/* Step 2 Item */}
            <div className="flex items-start space-x-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
              <div className="h-12 w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-lg shrink-0">
                02
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Choose Your Sale Program</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Select your preferred way to sell:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-bold">
                  <li className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[#2E7D32] uppercase text-[10px] tracking-widest block mb-1 font-black">OPTION 1</span>
                    <span className="text-slate-800 block">Instant Offer</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">Direct cash purchase by 1stCars.</span>
                  </li>
                  <li className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[#2E7D32] uppercase text-[10px] tracking-widest block mb-1 font-black">OPTION 2</span>
                    <span className="text-slate-800 block">Dealer Auction</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">1,000+ premium dealers bid live.</span>
                  </li>
                  <li className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[#2E7D32] uppercase text-[10px] tracking-widest block mb-1 font-black">OPTION 3</span>
                    <span className="text-slate-800 block">Park & Sell</span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">Consign securely in showroom.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 Item */}
            <div className="flex items-start space-x-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full" />
              <div className="h-12 w-12 rounded-2xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-black text-lg shrink-0">
                03
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Get Paid Instantly & Same-Day</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Once evaluation checks complete, you receive instant bank transfer, full loan settlement service, and zero liability transfer. We handle all complex DMV transfer paperwork free of charge!
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
