import { 
  BarChart3, Car, Award, MapPin, 
  ClipboardList, FileText, Gavel, Users, UserCheck, 
  ShieldCheck, Shield, Star, HelpCircle, DollarSign, 
  Bell, TrendingUp, BookOpen, Link, Palette, Edit3,
  Sparkles, QrCode, ClipboardEdit, Zap, Inbox, Briefcase
} from "lucide-react";

export type CMSModule = 
  | "dashboard" | "crm" | "cars" | "users" | "test_drive_requests" | "booking_requests" | "seller_enquiries" | "staff" | "dealers" | "inspectors" | "sales"
  | "test_drives" | "purchases" | "crm_activities" | "leads"

  | "inspections" | "certifications" | "auctions" | "brands" | "cities"
  | "faqs" | "testimonials" | "finance" | "notifications" | "expenses"
  | "reports" | "pages" | "footer_links" | "settings" | "text_editor" | "payment_settings"
  | "sell_form" | "automation" | "career_applications";

export interface NavItem {
  id: CMSModule;
  label: string;
  icon: any;
  badge?: string;
  /**
   * Optional pre-set list filter applied when this item is opened (deep link).
   * Used for role-scoped entries like "Buyer Customers" (users module pre-filtered
   * to Role: Buyer) — reuses the existing generic status/role filter, no new module.
   */
  deepFilter?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Car statuses that count as "ready to sell". Shared by the dashboard KPI card
// and the AdminCMS list filter so the KPI number always matches what clicking
// the card shows.
export const READY_CAR_STATUSES = ["available", "listed", "inspection_completed", "ready_for_sale"];

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
    title: "CRM & Leads",
    items: [
      { id: "leads", label: "Leads & Enquiries", icon: Inbox },
      { id: "crm_activities", label: "CRM Activity Log", icon: ClipboardEdit },
      { id: "career_applications", label: "Job Applications", icon: Briefcase }
    ]
  },
  {
    title: "Cars",
    items: [
      { id: "cars", label: "Cars Catalog", icon: Car },
      { id: "brands", label: "Brands & Models", icon: Award },
      { id: "cities", label: "Cities", icon: MapPin }
    ]
  },
  {
    title: "Inspections",
    items: [
      { id: "inspections", label: "120-Pt Inspections", icon: ClipboardList },
      { id: "certifications", label: "1st Mark Certification", icon: Sparkles }
    ]
  },
  {
    title: "Auctions",
    items: [
      { id: "auctions", label: "Live Auctions", icon: Gavel, badge: "LIVE" }
    ]
  },
  {
    title: "Buyers",
    items: [
      { id: "users", label: "Buyer Customers", icon: Users, deepFilter: "Buyer" }
    ]
  },
  {
    title: "Sellers",
    items: [
      { id: "seller_enquiries", label: "Seller Enquiries", icon: FileText },
      { id: "sell_form", label: "Sell Form & Brands", icon: ClipboardEdit },
      { id: "users", label: "Seller Customers", icon: UserCheck, deepFilter: "Seller" }
    ]
  },
  {
    title: "Dealers",
    items: [
      { id: "dealers", label: "Dealers & Approvals", icon: ShieldCheck }
    ]
  },
  {
    title: "Orders / Payments",
    items: [
      { id: "purchases", label: "Purchases & Orders", icon: QrCode },
      { id: "finance", label: "Finance", icon: DollarSign },
      { id: "expenses", label: "Ledger", icon: FileText }
    ]
  },
  {
    title: "Users / Staff",
    items: [
      { id: "users", label: "Users & Staff", icon: Users },
      { id: "inspectors", label: "Inspectors", icon: Shield },
      { id: "sales", label: "Sales Associates", icon: UserCheck }
    ]
  },
  {
    title: "Content / FAQ",
    items: [
      { id: "pages", label: "Edit Pages", icon: BookOpen },
      { id: "faqs", label: "FAQs", icon: HelpCircle },
      { id: "testimonials", label: "Reviews", icon: Star },
      { id: "footer_links", label: "Footer Links", icon: Link },
      { id: "text_editor", label: "Text Editor", icon: Edit3 }
    ]
  },
  {
    title: "Settings",
    items: [
      { id: "settings", label: "Theme & Payment Settings", icon: Palette },
      { id: "notifications", label: "System Alerts", icon: Bell }
    ]
  }
];

// Is a sidebar item the active one? Filter-aware so that deep-filtered entries
// (e.g. "Buyer Customers" = users + Role: Buyer) highlight only when their
// filter is actually applied, and the plain entry ("Users & Staff") yields to
// them while it is.
export function isNavItemActive(item: NavItem, activeModule: CMSModule, activeFilter?: string): boolean {
  if (activeModule !== item.id) return false;
  if (item.deepFilter) return item.deepFilter === activeFilter;
  return !ADMIN_NAV_SECTIONS.some(section =>
    section.items.some(i => i.id === item.id && i.deepFilter && i.deepFilter === activeFilter)
  );
}

export function getSectionAndItemForModule(moduleKey: CMSModule, activeFilter?: string): { sectionTitle: string; itemLabel: string; itemIcon: any } {
  let fallback: { sectionTitle: string; itemLabel: string; itemIcon: any } | null = null;
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.id !== moduleKey) continue;
      // A deep-filtered entry matching the active filter wins the breadcrumb;
      // otherwise the plain (unfiltered) entry represents the module.
      if (item.deepFilter && item.deepFilter === activeFilter) {
        return { sectionTitle: section.title, itemLabel: item.label, itemIcon: item.icon };
      }
      if (!item.deepFilter && !fallback) {
        fallback = { sectionTitle: section.title, itemLabel: item.label, itemIcon: item.icon };
      }
    }
  }
  return fallback || { sectionTitle: "Overview", itemLabel: "Dashboard", itemIcon: BarChart3 };
}