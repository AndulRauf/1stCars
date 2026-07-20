import * as React from "react";
import { Mail, Phone, MapPin, ArrowUpRight, Github, Heart, Shield, Award, Sparkles } from "lucide-react";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { supabase } from "@/src/lib/supabaseClient";

interface FooterProps {
  onViewChange?: (view: any, pageId?: string) => void;
}

export function Footer({ onViewChange }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [footerPages, setFooterPages] = React.useState<any[]>([]);

  const [settings, setSettings] = React.useState({
    supportEmail: "concierge@1stcars.com",
    supportPhone: "+91 99999 99999",
    supportAddress: "722 S. Greenwood Avenue, Suite A, Los Angeles",
    brandSlogan: "The Luxury Pre-Owned Hub",
    brandDescription: "We curate only top-tier luxury, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute luxury service.",
    footerText: "© 2026 1stCars Luxury Marketplace. All rights reserved.",
    highlight1Title: "Single Owned",
    highlight1Desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation.",
    highlight2Title: "Non Accident Trusted",
    highlight2Desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics.",
    highlight3Title: "Genuine KM",
    highlight3Desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs.",
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
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
        
        {/* Top Highlight Section / Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 mb-12 border-b border-[#2E7D32]/10">
          <div className="flex items-start space-x-4">
            <div className="bg-[#2E7D32]/5 p-3 rounded-2xl text-primary border border-[#2E7D32]/15 shadow-sm">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 tracking-tight">{settings.highlight1Title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {settings.highlight1Desc}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-[#2E7D32]/5 p-3 rounded-2xl text-primary border border-[#2E7D32]/15 shadow-sm">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 tracking-tight">{settings.highlight2Title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {settings.highlight2Desc}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-[#2E7D32]/5 p-3 rounded-2xl text-primary border border-[#2E7D32]/15 shadow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 tracking-tight">{settings.highlight3Title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {settings.highlight3Desc}
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 pb-12">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col space-y-5">
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-[#2E7D32]">
                1stCars
              </span>
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase mt-0.5">
                {settings.brandSlogan}
              </span>
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

          {/* Quick Links Column 1: Inventory */}
          <div>
            <h5 className="font-bold text-xs text-slate-900 tracking-widest uppercase mb-5">
              Inventory
            </h5>
            <ul className="space-y-3.5 text-sm text-slate-500 font-medium">
              {["Hypercars & Exotic", "Grand Tourers", "Premium Luxury SUVs", "Electric & Hybrids", "Vintage Classics"].map((item) => (
                <li key={item}>
                  <a href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-primary transition-colors flex items-center group">
                    <span>{item}</span>
                    <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links Column 2: Services */}
          <div>
            <h5 className="font-bold text-xs text-slate-900 tracking-widest uppercase mb-5">
              Premium Services
            </h5>
            <ul className="space-y-3.5 text-sm text-slate-500 font-medium">
              {["Bespoke Finder", "Pre-Purchase Evaluation", "Private Trade-in Concierge", "Elite Finance Programs", "Corporate Fleet Hub"].map((item) => (
                <li key={item}>
                  <a href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-primary transition-colors flex items-center group">
                    <span>{item}</span>
                    <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                  </a>
                </li>
              ))}
              <li className="pt-2 border-t border-[#2E7D32]/10 mt-2">
                <button
                  type="button"
                  onClick={() => onViewChange?.("role_dashboards")}
                  className="hover:text-primary transition-colors flex items-center group font-black text-xs text-[#2E7D32] uppercase tracking-wider cursor-pointer text-left"
                >
                  <span>🔑 Portal Gateway</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 shrink-0" />
                </button>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none font-semibold">
                  (Dashboard, Dealer & Sales Portals)
                </p>
              </li>
            </ul>
          </div>

          {/* Quick Links Column 3: Trust & Policies (Dynamic Footer Pages) */}
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

          {/* Column 3: Premium Club Newsletter */}
          <div className="flex flex-col space-y-4">
            <h5 className="font-bold text-xs text-slate-900 tracking-widest uppercase mb-1">
              Join the VIP Club
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Get weekly updates on rare luxury arrivals and private collector auctions before they hit the open market.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col space-y-2.5">
              <Input
                type="email"
                placeholder="vip.collector@email.com"
                className="bg-white border-slate-200 text-slate-900 focus-visible:border-primary focus-visible:ring-primary placeholder:text-slate-400 h-10 py-1"
                aria-label="Email address for newsletter"
                required
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white h-10 py-1 text-xs font-bold">
                Receive Access
              </Button>
            </form>
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
