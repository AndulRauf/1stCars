import * as React from "react";
import { Mail, Phone, MapPin, ArrowUpRight, Github, Heart, Shield, Award, Sparkles } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";

interface FooterProps {
  onViewChange?: (view: any, pageId?: string) => void;
  currentView?: string;
  hideTrustBadges?: boolean;
  onAuthClick?: (mode: "login" | "register") => void;
}

export function Footer({ onViewChange, currentView, hideTrustBadges, onAuthClick }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [footerPages, setFooterPages] = React.useState<any[]>([]);

  const [settings, setSettings] = React.useState({
    supportEmail: "suport@1stcars.in",
    supportPhone: "+91 8866377722",
    supportAddress: "1stCars Seller Hub, Ring 101 Vikas Arced, Vadod ,   Masma, Olpad, Surat, Gujarat 394540, India",
    brandSlogan: "The Luxury Pre-Owned Hub",
    brandDescription: "We curate only top-tier luxury, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute luxury service.",
    footerText: "© 2026 1stCars Luxury Marketplace. All rights reserved.",
    highlight1Title: "120-Point Certificate",
    highlight1Desc: "Every vehicle undergoes our rigorous mechanical & structural evaluation before listing.",
    highlight2Title: "Single Owned, Non Accident Trusted*",
    highlight2Desc: "Verified single owner history with zero chassis frame damage guarantee.",
    highlight3Title: "Aggregator Marketplace",
    highlight3Desc: "Connecting verified Car Buyers, Sellers, and Dealers with transparent deal mediation.",
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.supportAddress || parsed.supportAddress.includes("Los Angeles") || parsed.supportAddress.includes("Greenwood") || parsed.supportAddress.includes("722") || parsed.supportAddress.includes("Bhatar") || (parsed.highlight2Title && parsed.highlight2Title.includes("Buyback"))) {
            parsed.supportAddress = "1stCars Seller Hub, Ring 101 Vikas Arced, Vadod ,   Masma, Olpad, Surat, Gujarat 394540, India";
            parsed.supportPhone = "+91 8866377722";
            parsed.supportEmail = "suport@1stcars.in";
            parsed.highlight1Title = "120-Point Certificate";
            parsed.highlight1Desc = "Every vehicle undergoes our rigorous mechanical & structural evaluation before listing.";
            parsed.highlight2Title = "Single Owned, Non Accident Trusted*";
            parsed.highlight2Desc = "Verified single owner history with zero chassis frame damage guarantee.";
            parsed.highlight3Title = "Aggregator Marketplace";
            parsed.highlight3Desc = "Connecting verified Car Buyers, Sellers, and Dealers with transparent deal mediation.";
            localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(parsed));
          }
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse website settings in Footer", e);
        }
      }
    }

    const loadFooterPages = async () => {
      const { data } = await supabase.from("pages").select();
      if (data) {
        setFooterPages(data.filter((p: any) => p.is_footer));
      }
    };
    loadFooterPages();

    const handleUpdate = () => {
      loadFooterPages();
    };
    window.addEventListener("1stcars_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("1stcars_settings_updated", handleUpdate);
    };
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic for newsletter
  };

  return (
    <footer className="bg-[#F8F6F0] text-slate-900 border-t border-[#2E7D32]/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        


        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pb-12">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col space-y-5">
            <div className="flex items-center space-x-3">
              <img 
                src={(settings as any).logoUrl || "/logo.png"} 
                alt="1stCars Logo" 
                className="h-10 w-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter text-[#2E7D32]">
                  1stCars
                </span>
                <span className="text-xs font-bold tracking-widest text-slate-500 uppercase mt-0.5">
                  {settings.brandSlogan}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              {settings.brandDescription}
            </p>
            <div className="flex flex-col space-y-2.5 pt-2">
              <div className="flex items-start space-x-3 text-sm text-slate-600">
                <MapPin className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{settings.supportAddress}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-600">
                <Phone className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>{settings.supportPhone}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-600">
                <Mail className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>{settings.supportEmail}</span>
              </div>
            </div>
          </div>

          {/* Quick Links Column 1: Trust & Policies (Dynamic Footer Pages) */}
          <div>
            <h5 className="font-bold text-xs text-slate-900 tracking-widest uppercase mb-5">
              Warranty & Trust
            </h5>
            <ul className="space-y-3.5 text-sm text-slate-500 font-medium">
              {footerPages.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => onViewChange?.("custom_page", page.id)}
                    className="hover:text-primary transition-colors flex items-center group text-left cursor-pointer"
                  >
                    <span>{page.title}</span>
                    <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links Column 2: Portal Access */}
          <div>
            <h5 className="font-bold text-xs text-slate-900 tracking-widest uppercase mb-5">
              Dealer Portal & Registration
            </h5>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onAuthClick?.("register")}
                className="w-full bg-[#2E7D32] hover:bg-[#25632a] text-white font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl flex items-center justify-between shadow-md shadow-[#2E7D32]/20 transition-all cursor-pointer group"
              >
                <span className="flex items-center gap-1.5">🤝 Partnered Dealer Register</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-white shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onAuthClick?.("login")}
                className="w-full bg-white hover:bg-[#2E7D32]/5 text-[#2E7D32] border border-[#2E7D32]/25 font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl flex items-center justify-between shadow-2xs hover:border-[#2E7D32] transition-all cursor-pointer group"
              >
                <span className="flex items-center gap-1.5">🔑 Dealer Login</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#2E7D32] shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onViewChange?.("role_dashboards")}
                className="hover:text-primary transition-colors flex items-center group font-bold text-xs text-slate-500 uppercase tracking-wider cursor-pointer text-left pt-1"
              >
                <span>🛡️ Staff & Inspector Portal</span>
                <ArrowUpRight className="h-3 w-3 ml-1 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#2E7D32]/10 pt-8 mt-12 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 font-semibold">
          <p>{settings.footerText.includes("©") ? settings.footerText : `© ${currentYear} ${settings.footerText}`}</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#sitemap" className="hover:text-primary transition-colors">Sitemap</a>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 text-primary fill-primary animate-pulse" />
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
