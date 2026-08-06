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
