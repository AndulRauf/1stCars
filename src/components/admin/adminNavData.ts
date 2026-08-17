import { 
  BarChart3, Car, Award, MapPin, 
  ClipboardList, FileText, Gavel, Users, UserCheck, 
  ShieldCheck, Shield, Star, HelpCircle, DollarSign, 
  Bell, TrendingUp, BookOpen, Link, Palette, Edit3,
  Sparkles, QrCode, ClipboardEdit, Zap, Inbox
} from "lucide-react";

export type CMSModule = 
  | "dashboard" | "crm" | "cars" | "users" | "test_drive_requests" | "booking_requests" | "seller_enquiries" | "staff" | "dealers" | "inspectors" | "sales"
  | "test_drives" | "purchases" | "crm_activities" | "leads"

  | "inspections" | "certifications" | "auctions" | "brands" | "cities"
  | "faqs" | "testimonials" | "finance" | "notifications" | "expenses"
  | "reports" | "pages" | "footer_links" | "settings" | "text_editor" | "payment_settings"
  | "sell_form" | "automation";

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
      { id: "dashboard", label: "Dashboard", icon: BarChart3 },
      { id: "reports", label: "Reports & Analytics", icon: TrendingUp },
      { id: "automation", label: "Automation Center", icon: Zap }
    ]
  },
  {
    title: "Leads & Sales",
    items: [
      { id: "leads", label: "Leads & Enquiries", icon: Inbox },
      { id: "seller_enquiries", label: "Seller Enquiries", icon: FileText },
      { id: "purchases", label: "Purchases & Orders", icon: QrCode },
      { id: "crm_activities", label: "CRM Activity Log", icon: ClipboardEdit },
      { id: "auctions", label: "Live Auctions", icon: Gavel, badge: "LIVE" }
    ]
  },
  {
    title: "Inventory & Catalog",
    items: [
      { id: "cars", label: "Cars Catalog", icon: Car },
      { id: "brands", label: "Brands & Models", icon: Award },
      { id: "cities", label: "Cities", icon: MapPin }
    ]
  },
  {
    title: "Quality & Trust",
    items: [
      { id: "inspections", label: "120-Pt Inspections", icon: ClipboardList },
      { id: "certifications", label: "1st Mark Certification", icon: Sparkles },
      { id: "testimonials", label: "Reviews", icon: Star },
      { id: "faqs", label: "FAQs", icon: HelpCircle },
      { id: "sell_form", label: "Sell Form & Brands", icon: ClipboardEdit }
    ]
  },
  {
    title: "People & Access",
    items: [
      { id: "users", label: "Users & Staff", icon: Users },
      { id: "dealers", label: "Dealers & Approvals", icon: ShieldCheck },
      { id: "inspectors", label: "Inspectors", icon: Shield },
      { id: "sales", label: "Sales Associates", icon: UserCheck }
    ]
  },
  {
    title: "Finance & Operations",
    items: [
      { id: "finance", label: "Finance", icon: DollarSign },
      { id: "expenses", label: "Ledger", icon: FileText },
      { id: "notifications", label: "Alerts Core", icon: Bell }
    ]
  },
  {
    title: "Website & Content",
    items: [
      { id: "pages", label: "Edit Pages", icon: BookOpen },
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