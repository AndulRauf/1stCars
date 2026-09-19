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
    title: "Dashboard",
    items: [
      { id: "dashboard", label: "Dashboard", icon: BarChart3 }
    ]
  },
  {
    title: "Leads & Customers",
    items: [
      { id: "leads", label: "Leads & Enquiries", icon: Inbox },
      { id: "seller_enquiries", label: "Seller Enquiries", icon: FileText },
      { id: "sell_form", label: "Sell Form & Brands", icon: ClipboardEdit },
      { id: "crm_activities", label: "CRM Activity Log", icon: ClipboardList },
      { id: "users", label: "Buyer Customers", icon: Users, deepFilter: "Buyer" },
      { id: "users", label: "Seller Customers", icon: UserCheck, deepFilter: "Seller" }
    ]
  },
  {
    title: "Cars & Inventory",
    items: [
      { id: "cars", label: "Cars Catalog", icon: Car },
      { id: "brands", label: "Brands & Models", icon: Award },
      { id: "cities", label: "Cities", icon: MapPin }
    ]
  },
  {
    title: "Auctions",
    items: [
      { id: "auctions", label: "Live Auctions", icon: Gavel, badge: "LIVE" }
    ]
  },
  {
    title: "Sales & Purchase",
    items: [
      { id: "purchases", label: "Purchases & Orders", icon: QrCode },
      { id: "finance", label: "Finance", icon: DollarSign },
      { id: "expenses", label: "Ledger", icon: FileText }
    ]
  },
  {
    title: "Inspections & Operations",
    items: [
      { id: "inspections", label: "120-Pt Inspections", icon: ClipboardList },
      { id: "certifications", label: "1st Mark Certification", icon: Sparkles },
      { id: "inspectors", label: "Inspectors", icon: Shield }
    ]
  },
  {
    title: "Dealers",
    items: [
      { id: "dealers", label: "Dealers & Approvals", icon: ShieldCheck }
    ]
  },
  {
    title: "Users & Team",
    items: [
      { id: "users", label: "Users & Staff", icon: Users },
      { id: "sales", label: "Sales Associates", icon: UserCheck },
      { id: "career_applications", label: "Job Applications", icon: Briefcase }
    ]
  },
  {
    title: "Analytics",
    items: [
      { id: "reports", label: "Reports & Analytics", icon: TrendingUp },
      { id: "automation", label: "Automation Center", icon: Zap }
    ]
  },
  {
    title: "Settings",
    items: [
      { id: "settings", label: "Theme & Payment Settings", icon: Palette },
      { id: "pages", label: "Edit Pages", icon: BookOpen },
      { id: "faqs", label: "FAQs", icon: HelpCircle },
      { id: "testimonials", label: "Reviews", icon: Star },
      { id: "footer_links", label: "Footer Links", icon: Link },
      { id: "text_editor", label: "Text Editor", icon: Edit3 },
      { id: "notifications", label: "System Alerts", icon: Bell }
    ]
  }
];

// Friendlier display titles for list-page headers — used by the generic CRUD
// table so pages read "Manage Cars Catalog" instead of raw module keys.
export const MODULE_TITLES: Record<string, string> = {
  cars: "Cars Catalog",
  users: "Users & Staff",
  leads: "Leads & Enquiries",
  test_drive_requests: "Test Drive Requests",
  booking_requests: "Booking Requests",
  seller_enquiries: "Seller Enquiries",
  test_drives: "Test Drives Log",
  dealers: "Dealers & Approvals",
  inspectors: "Inspectors",
  sales: "Sales Associates",
  purchases: "Purchases & Orders",
  crm_activities: "CRM Activity Log",
  inspections: "120-Pt Inspections",
  brands: "Brands & Models",
  cities: "Cities",
  faqs: "FAQs",
  testimonials: "Reviews",
  finance: "Finance Partners",
  notifications: "System Alerts",
  expenses: "Expense Ledger",
  pages: "Edit Pages",
  footer_links: "Footer Links",
  career_applications: "Job Applications",
  staff: "Staff"
};

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
  return fallback || { sectionTitle: "Dashboard", itemLabel: "Dashboard", itemIcon: BarChart3 };
}