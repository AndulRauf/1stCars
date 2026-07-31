import { 
  BarChart3, Car, Award, MapPin, 
  ClipboardList, FileText, Gavel, Users, UserCheck, 
  ShieldCheck, Shield, Star, HelpCircle, DollarSign, 
  Bell, TrendingUp, BookOpen, Link, Palette, Edit3,
  Sparkles, Calendar, QrCode
} from "lucide-react";

export type CMSModule = 
  | "dashboard" | "cars" | "users" | "test_drive_requests" | "booking_requests" | "seller_enquiries" | "staff" | "dealers" | "inspectors" | "sales"

  | "inspections" | "certifications" | "auctions" | "brands" | "cities"
  | "faqs" | "testimonials" | "finance" | "notifications" | "expenses"
  | "reports" | "pages" | "footer_links" | "settings" | "text_editor" | "payment_settings";

export interface NavItem {
  id: CMSModule;
  label: string;
  icon: any;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: BarChart3 }
    ]
  },
  {
    title: "Inventory",
    items: [
      { id: "cars", label: "Cars Catalog", icon: Car },
      { id: "brands", label: "Brands & Models", icon: Award },
      { id: "cities", label: "Cities", icon: MapPin }
    ]
  },
  {
    title: "Leads & Sales",
    items: [
      { id: "test_drive_requests", label: "Test Drive Requests", icon: Calendar },
      { id: "booking_requests", label: "Booking Requests", icon: ClipboardList },
      { id: "seller_enquiries", label: "Seller Enquiries", icon: FileText },

      { id: "auctions", label: "Live Auctions", icon: Gavel, badge: "LIVE" }
    ]
  },
  {
    title: "People & Access",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "staff", label: "Staff", icon: UserCheck },
      { id: "dealers", label: "Dealers & Approvals", icon: ShieldCheck },
      { id: "inspectors", label: "Inspectors", icon: Shield },
      { id: "sales", label: "Sales Associates", icon: UserCheck }
    ]
  },
  {
    title: "Quality & Trust",
    items: [
      { id: "inspections", label: "120-Pt Inspections", icon: ClipboardList },
      { id: "certifications", label: "1st Mark Certification", icon: Sparkles },
      { id: "testimonials", label: "Reviews", icon: Star },
      { id: "faqs", label: "FAQs", icon: HelpCircle }
    ]
  },
  {
    title: "Finance & Operations",
    items: [
      { id: "finance", label: "Finance", icon: DollarSign },
      { id: "payment_settings", label: "UPI Payments", icon: QrCode },
      { id: "expenses", label: "Ledger", icon: FileText },
      { id: "notifications", label: "Alerts Core", icon: Bell },
      { id: "reports", label: "Reports", icon: TrendingUp }
    ]
  },
  {
    title: "Site & Content",
    items: [
      { id: "pages", label: "Custom Pages", icon: BookOpen },
      { id: "footer_links", label: "Footer Links", icon: Link },
      { id: "settings", label: "Theme Design", icon: Palette },
      { id: "text_editor", label: "Text Editor", icon: Edit3 }
    ]
  }
];

export function getSectionAndItemForModule(moduleKey: CMSModule): { sectionTitle: string; itemLabel: string; itemIcon: any } {
  for (const section of ADMIN_NAV_SECTIONS) {
    const item = section.items.find(i => i.id === moduleKey);
    if (item) {
      return { sectionTitle: section.title, itemLabel: item.label, itemIcon: item.icon };
    }
  }
  return { sectionTitle: "Overview", itemLabel: "Dashboard", itemIcon: BarChart3 };
}
