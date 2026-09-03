import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS classes with clsx and twMerge.
 * This is the standard utility function used in shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HIDDEN_PAGE_TITLES = ["warranty terms"];

/**
 * Returns true for pages that must never be shown on the site (footer links,
 * navigation, or the admin page manager). Used to retire CMS pages that can no
 * longer be deleted from Supabase with the anon key (RLS blocks DELETE).
 */
export function isHiddenPage(page: { title?: string; slug?: string } | null | undefined): boolean {
  if (!page) return false;
  const title = (page.title || "").trim().toLowerCase();
  const slug = (page.slug || "").trim().toLowerCase();
  return HIDDEN_PAGE_TITLES.includes(title) || HIDDEN_PAGE_TITLES.includes(slug.replace(/-/g, " "));
}

const RETIRED_PHRASES = ["standard buyback guarantee"];

/**
 * Removes retired marketing phrases from any string value so they can never
 * render on the live site even if they still exist in the DB/localStorage.
 */
export function stripRetiredCopy(value: any): any {
  if (typeof value === "string") {
    let next = value;
    for (const phrase of RETIRED_PHRASES) {
      next = next
        .replace(new RegExp(`,\\s*${phrase}`, "gi"), "")
        .replace(new RegExp(`\\s*${phrase}\\s*`, "gi"), " ");
    }
    return next.replace(/\s{2,}/g, " ").trim();
  }
  return value;
}

/** Applies stripRetiredCopy to every string field of a parsed settings object. */
export function sanitizeSettings(parsed: any): any {
  if (parsed && typeof parsed === "object") {
    for (const key of Object.keys(parsed)) {
      parsed[key] = stripRetiredCopy(parsed[key]);
    }
  }
  return parsed;
}

/**
 * Builds a stable, unique email from a mobile number when the visible email
 * field is hidden from a form (email collection is deferred to a later
 * version). The derived email keeps lead records and auto-account creation
 * working without requiring the visitor to type one.
 */
export function generateDerivedEmail(mobile: string): string {
  const digits = (mobile || "").replace(/\D/g, "").slice(-10);
  return `${digits || "visitor"}@buyer.local`;
}

