import * as React from "react";
import { Mail, Phone, MapPin, ArrowUpRight, Github, Heart, Shield, Award, Sparkles } from "lucide-react";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";

interface FooterProps {
  onViewChange?: (view: any) => void;
}

export function Footer({ onViewChange }: FooterProps) {
  const currentYear = new Date().getFullYear();

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
              <h4 className="font-bold text-base text-slate-900 tracking-tight">150-Point Certificate</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Every vehicle in our collection undergoes rigorous mechanical & structural inspections.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-[#2E7D32]/5 p-3 rounded-2xl text-primary border border-[#2E7D32]/15 shadow-sm">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 tracking-tight">Buyback Protection</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Drive with maximum peace of mind. We offer a transparent, premium 7-day buyback guarantee.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-[#2E7D32]/5 p-3 rounded-2xl text-primary border border-[#2E7D32]/15 shadow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 tracking-tight">Doorstep Whiteglove Delivery</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enjoy home test drives and direct delivery with our fully closed premium transports.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col space-y-5">
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-[#2E7D32]">
                1stCars
              </span>
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase mt-0.5">
                The Luxury Pre-Owned Hub
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              We curate only top-tier luxury, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute luxury service.
            </p>
            <div className="flex flex-col space-y-2.5 pt-2">
              <div className="flex items-center space-x-3 text-sm text-slate-600">
                <MapPin className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>722 S. Greenwood Avenue, Suite A, Los Angeles</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-600">
                <Phone className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>+1 (800) 555-0199</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-600">
                <Mail className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>concierge@1stcars.com</span>
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
          <p>© {currentYear} 1stCars Inc. All rights reserved. Licenses & listings verified.</p>
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
