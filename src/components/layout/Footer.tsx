import * as React from "react";
import { Mail, Phone, MapPin, ArrowUpRight, Facebook, Instagram } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { isHiddenPage } from "@/src/lib/utils";
import { normalizeWebsiteSettings } from "@/src/lib/pageContentDefaults";

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
    supportEmail: "support@1stcars.com",
    supportPhone: "+91 8866377722",
    supportAddress: "1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India",
    brandSlogan: "Easy Way",
    brandDescription: "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles, single-owner, accident-free, verified km.",
    footerText: "© 2026 1stCars Marketplace. All rights reserved.",
    facebook: "https://www.facebook.com/1stcars.in",
    instagram: "https://www.instagram.com/1stcars.in",
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("1stcars_cms_website_settings");
      if (stored) {
        try {
          const parsed = normalizeWebsiteSettings(JSON.parse(stored));
          // Persist the corrected contact details / legacy-copy values so the
          // fix sticks across reloads (idempotent — genuine admin edits pass
          // through unchanged).
          localStorage.setItem("1stcars_cms_website_settings", JSON.stringify(parsed));
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse website settings in Footer", e);
        }
      }
    }

    const loadFooterPages = async () => {
      const { data } = await supabase.from("pages").select();
      if (data) {
        setFooterPages(data.filter((p: any) => p.is_footer && !isHiddenPage(p)));
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

  const b2bLink = (key: string) => (
    <li key={key}>
      <button
        type="button"
        onClick={() => onAuthClick?.("login")}
        className="hover:text-primary transition-colors flex items-center group text-left cursor-pointer"
      >
        <span>B2B Login</span>
        <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
      </button>
    </li>
  );

  const quickLinks: React.ReactNode[] = [];
  let locationSeen = false;
  footerPages.forEach((page) => {
    const isLocationPage = /showroom|location/i.test(page.title);
    if (isLocationPage && locationSeen) return;
    if (isLocationPage) locationSeen = true;
    quickLinks.push(
      <li key={page.id}>
        <button
          type="button"
          onClick={() => onViewChange?.("custom_page", page.id)}
          className="hover:text-primary transition-colors flex items-center group text-left cursor-pointer"
        >
          <span>{/showroom/i.test(page.title) ? "Our Location" : page.title}</span>
          <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
        </button>
      </li>
    );
    if (isLocationPage) quickLinks.push(b2bLink(`b2b-${page.id}`));
  });
  if (!locationSeen) quickLinks.push(b2bLink("b2b-fallback"));

  return (
    <footer className="bg-[#F8F6F0] text-slate-900 border-t border-[#2E7D32]/10 pt-7 md:pt-12 pb-5 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">



        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8 md:pb-10">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col space-y-3 sm:space-y-5">
            <div className="flex items-center space-x-3">
              <img 
                src={(settings as any).logoUrl || "/logo.png"} 
                alt="1stCars Logo" 
                className="h-9 w-9 md:h-10 md:w-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black tracking-tighter text-[#2E7D32]">
                  1stCars
                </span>
                <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-500 uppercase mt-0.5">
                  {settings.brandSlogan}
                </span>
              </div>
            </div>
            <p className="hidden sm:block text-sm text-slate-500 leading-relaxed max-w-sm">
              {settings.brandDescription}
            </p>
            <div className="flex flex-col space-y-1.5 md:space-y-2.5 pt-1 md:pt-2">
              <div className="flex items-start space-x-2.5 text-[13px] md:text-sm text-slate-600">
                <MapPin className="h-4 w-4 md:h-4.5 md:w-4.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{settings.supportAddress}</span>
              </div>
              <div className="flex items-center space-x-2.5 text-[13px] md:text-sm text-slate-600">
                <Phone className="h-4 w-4 md:h-4.5 md:w-4.5 text-primary flex-shrink-0" />
                <span>{settings.supportPhone}</span>
              </div>
              <div className="flex items-center space-x-2.5 text-[13px] md:text-sm text-slate-600">
                <Mail className="h-4 w-4 md:h-4.5 md:w-4.5 text-primary flex-shrink-0" />
                <span>{settings.supportEmail}</span>
              </div>
            </div>
          </div>

          {/* Mobile: link columns side-by-side (2 cols); md+ display:contents keeps original grid */}
          <div className="grid grid-cols-2 gap-5 md:contents">
          {/* Quick Links Column 1: Trust & Policies (Dynamic Footer Pages) */}
          <div>
            <h5 className="font-bold text-[11px] md:text-xs text-slate-900 tracking-widest uppercase mb-3 md:mb-5">
              Trust & Policies
            </h5>
            <ul className="space-y-2.5 md:space-y-3.5 text-[13px] md:text-sm text-slate-500 font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onViewChange?.("about")}
                  className="hover:text-primary transition-colors flex items-center group text-left cursor-pointer"
                >
                  <span>About Us</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onViewChange?.("faq")}
                  className="hover:text-primary transition-colors flex items-center group text-left cursor-pointer"
                >
                  <span>FAQ</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onViewChange?.("careers")}
                  className="hover:text-primary transition-colors flex items-center group text-left cursor-pointer"
                >
                  <span>Careers</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                </button>
              </li>
              {quickLinks}
            </ul>
          </div>

          {/* Follow Us column: Social Links */}
          <div>
            <h5 className="font-bold text-[11px] md:text-xs text-slate-900 tracking-widest uppercase mb-3 md:mb-5">
              Follow Us
            </h5>
            <ul className="space-y-2.5 md:space-y-3.5 text-[13px] md:text-sm text-slate-500 font-medium">
              <li>
                <a
                  href={settings.facebook || "https://www.facebook.com/1stcars.in"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors flex items-center group"
                >
                  <Facebook className="h-4 w-4 mr-2 text-primary" />
                  <span>Facebook</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                </a>
              </li>
              <li>
                <a
                  href={settings.instagram || "https://www.instagram.com/1stcars.in"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors flex items-center group"
                >
                  <Instagram className="h-4 w-4 mr-2 text-primary" />
                  <span>Instagram</span>
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-all duration-200" />
                </a>
              </li>
            </ul>
          </div>


          </div>{/* /mobile-2col */}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#2E7D32]/10 pt-4 md:pt-6 mt-6 md:mt-10 flex flex-col md:flex-row items-center justify-between text-[11px] md:text-xs text-slate-400 font-semibold">
          <p>{settings.footerText.includes("©") ? settings.footerText : `© ${currentYear} ${settings.footerText}`}</p>
        </div>

      </div>
    </footer>
  );
}
