// Default copy for the system pages that are editable from Admin CMS → Edit Pages.
// These mirror the original hardcoded strings so the live site is unchanged until
// an admin edits a value. They live in the same `website_settings` blob as the
// existing theme/branding/SEO settings.

import { sanitizeSettings } from "./utils";

export const PAGE_CONTENT_DEFAULTS: Record<string, string> = {
  // ---- About Us ----
  aboutHeroBadge: "ABOUT 1STCARS",
  aboutHeroHeading: "Your Trusted Pre-Owned Car Marketplace",
  aboutHeroHighlight: "",
  aboutHeroSubtitle:
    "1stCars makes buying and selling pre-owned cars simple, transparent and convenient. Based in Surat, we connect car buyers, sellers and verified dealers through a technology-driven marketplace. Every 1stMark Certified Car goes through a detailed 120-point inspection, helping customers make their next car decision with greater confidence.",
  aboutBrowseButton: "Explore Certified Cars",
  aboutBackButton: "Sell Your Car",

  aboutM1Value: "120+",
  aboutM1Label: "Point Inspection",
  aboutM2Value: "180+",
  aboutM2Label: "Dealer Network",
  aboutM3Value: "0",
  aboutM3Label: "Hidden Fees",
  aboutM4Value: "",
  aboutM4Label: "",

  aboutStoryBadge: "OUR STORY",
  aboutStoryHeading: "Built on a simple belief — buying a used car should feel safe.",
  aboutStoryHighlight: "buying a used car should feel safe.",
  aboutStoryPara1:
    "1stCars makes pre-owned car buying simple, transparent, and trustworthy. With doorstep inspections, certified vehicle grading, and a network of verified dealers, we help customers buy and sell with confidence.",
  aboutStoryPara2: "",
  aboutVisionTitle: "Our Vision",
  aboutVisionText:
    "To become India's most trusted destination for certified pre-owned vehicles.",
  aboutMissionTitle: "Our Mission",
  aboutMissionText:
    "To make the pre-owned car market more transparent, trustworthy and technology-driven \u2014 combining professional vehicle inspection with a simple customer experience.",

  aboutQuoteText:
    "\u201cWe don't just sell cars — we sell the confidence that the car you see is exactly the car you get. That promise is non-negotiable.\u201d",
  aboutTeamLabel: "The 1stCars Team",
  aboutTeamSubtitle: "Certified Inspectors • Dealers • Concierge",
  aboutStat1Value: "4+",
  aboutStat1Label: "Active Cities",
  aboutStat2Value: "12",
  aboutStat2Label: "Inspection Categories",
  aboutStat3Value: "100%",
  aboutStat3Label: "Verified Listings",

  aboutValue1Title: "120-Point Inspection",
  aboutValue1Desc:
    "Every 1stMark Certified Car undergoes a detailed inspection covering key mechanical, structural and functional areas.",
  aboutValue2Title: "Transparent Information",
  aboutValue2Desc:
    "Customers get access to inspection details, vehicle information and available ownership history.",
  aboutValue3Title: "Verified Network",
  aboutValue3Desc:
    "We connect customers with a network of verified dealers and buyers to make transactions more reliable.",
  aboutValue4Title: "Simple Experience",
  aboutValue4Desc:
    "From inspection to documentation, we aim to make every step easier and more convenient.",

  aboutDiff1Title: "Certified Cars",
  aboutDiff1Desc:
    "Inspected vehicles with clear information before listing.",
  aboutDiff2Title: "Fair Market Offers",
  aboutDiff2Desc:
    "Competitive offers through our verified network.",
  aboutDiff3Title: "Transparent Process",
  aboutDiff3Desc:
    "Clear information without unnecessary complexity.",
  aboutDiff4Title: "Customer First",
  aboutDiff4Desc:
    "A simple experience designed around convenience and confidence.",

  aboutStep1Title: "Doorstep Inspection",
  aboutStep1Desc:
    "A certified 1stCars inspector visits your location, photographs the vehicle, and runs the full 120-point mechanical & structural checklist.",
  aboutStep2Title: "Live Dealer Bidding",
  aboutStep2Desc:
    "Verified elite dealers compete in live, time-boxed auctions to give you the best possible value for your car.",
  aboutStep3Title: "Safe & Fast Handover",
  aboutStep3Desc:
    "Transparent deal closure with quick payment, complete documentation, and a hassle-free handover experience.",

  aboutContactHeading: "Talk To The 1stCars Team",
  aboutContactSubtitle:
    "Have a question about buying, selling, or our certification process? We're here to help — no pressure, just answers.",
  aboutContactPhone: "+91 8866377722",
  aboutContactEmail: "support@1stcars.com",
  aboutContactAddress: "1stCars Seller Hub, Surat, Gujarat",

  // ---- 1stMark Certification ----
  certHeroBadge: "OFFICIAL 120-POINT CERTIFIED STANDARD",
  certHeroHeadingA: "1stMark",
  certHeroHeadingHighlight: "Certification",
  certHeroSubheading:
    "The ultimate benchmark for pre-owned car certification. Every vehicle undergoes our rigorous 120-Point Inspection across 12 vital mechanical and structural categories to assign an official Vehicle Grade (A+, A, B+, B, C).",
  certBrowseButton: "Browse 120-Point Inspected Cars",
  certChecklistButton: "Explore 120 Checklist Items",
  certPillarsTitle: "Our 120-Point Verification Pillars",
  certPillarsSubtitle: "Strict, meticulous checks conducted by master inspectors",
  certChecklistLabel: "Full Transparent Protocol",
  certChecklistTitle: "Interactive 120-Point Inspection Directory",
  certChecklistSubtitle: "Select a category to view all verified checkpoints",

  // ---- FAQ ----
  faqPageBadge: "FAQ",
  faqPageHeading: "Frequently Asked Questions",
  faqPageSubheading:
    "Everything you need to know about buying, selling and 1stMark Certified Cars with 1stCars.",
};

// Helpers used by the public views to read page copy.
export const PAGE_CONTENT_STORAGE_KEY = "1stcars_cms_website_settings";
export const PAGE_CONTENT_UPDATED_EVENT = "1stcars_settings_updated";

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

// Default FAQ entries shared by the public /faq page and the Admin FAQ editor.
// Curated to ~15 high-value objections with short, clear Indian English answers.
// All answers reflect functionality already present on the website — no
// warranty, buyback, guaranteed-sale or fixed-price claims are made here.
export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  // ---- Buying a Car ----
  { id: "fq-buy-1", category: "Buying a Car", question: "What is 1stCars?", answer: "1stCars is a technology-driven pre-owned car marketplace connecting buyers, sellers and verified dealers. We make buying and selling used cars simpler, more transparent and convenient." },
  { id: "fq-buy-2", category: "Buying a Car", question: "What is a 1stMark Certified Car?", answer: "A 1stMark Certified Car is a vehicle that has undergone our 120-point inspection covering key mechanical, structural and functional areas before being listed as certified." },
  { id: "fq-buy-3", category: "Buying a Car", question: "Are 1stMark cars single-owner vehicles?", answer: "Where specified as single-owner, the ownership details are verified against available vehicle and documentation records. Always check the individual vehicle listing for its specific details." },
  { id: "fq-buy-4", category: "Buying a Car", question: "Are the kilometres verified?", answer: "We verify the available vehicle information using inspection checks and available service or vehicle-history records. The verification details are provided as part of the vehicle information where available." },
  { id: "fq-buy-5", category: "Buying a Car", question: "Can I inspect or test drive a car before buying?", answer: "Yes, test drives can be arranged for eligible vehicles. Availability depends on the vehicle and location." },
  // ---- Selling Your Car ----
  { id: "fq-sell-1", category: "Selling Your Car", question: "How can I sell my car through 1stCars?", answer: "Start by submitting your car details through our Sell Your Car form. After verification, our team can arrange a free inspection and help you explore the best available selling option." },
  { id: "fq-sell-2", category: "Selling Your Car", question: "Is the car inspection free?", answer: "Yes. 1stCars offers a free doorstep inspection for eligible sellers." },
  { id: "fq-sell-3", category: "Selling Your Car", question: "How is my car's price determined?", answer: "We consider the vehicle's condition, age, kilometres, documentation and current market demand. Depending on the selling route, you may receive an offer from 1stCars or competitive offers through our verified dealer network." },
  { id: "fq-sell-4", category: "Selling Your Car", question: "Do I have to accept the offer?", answer: "No. You remain in control of the decision. You can review the available offer and decide whether you want to proceed." },
  // ---- Inspection & Dealer Network ----
  { id: "fq-net-1", category: "Inspection & Dealer Network", question: "What does the 120-point inspection cover?", answer: "The inspection checks key mechanical, electrical, structural, exterior and interior aspects of the vehicle. The purpose is to identify the actual condition of the car before it is certified or offered." },
  { id: "fq-net-2", category: "Inspection & Dealer Network", question: "Who buys cars through 1stCars?", answer: "Depending on the selling route, your car may be purchased by 1stCars, a verified dealer or an eligible buyer connected through the platform." },
  { id: "fq-net-3", category: "Inspection & Dealer Network", question: "What is Dealer Auction?", answer: "Dealer Auction allows verified dealers in the 1stCars network to compete for eligible vehicles. This can help sellers discover competitive market offers." },
  // ---- Payment & Documentation ----
  { id: "fq-pay-1", category: "Payment & Documentation", question: "When will I receive payment?", answer: "Payment timing depends on the selected selling route and completion of the required documentation. The applicable payment process will be explained before the final handover." },
  { id: "fq-pay-2", category: "Payment & Documentation", question: "Does 1stCars help with RC transfer?", answer: "Yes. 1stCars provides assistance with the required ownership-transfer documentation and RC transfer process as applicable to the transaction." },
  { id: "fq-pay-3", category: "Payment & Documentation", question: "Are there any hidden charges?", answer: "We aim to keep the transaction transparent. Any applicable charges or deductions will be communicated before you proceed with the transaction." }
];

export function getPageContent(overrides?: Record<string, string | undefined>): Record<string, string> {
  const merged: Record<string, string> = { ...PAGE_CONTENT_DEFAULTS };
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PAGE_CONTENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Known keys override defaults...
        for (const key of Object.keys(PAGE_CONTENT_DEFAULTS)) {
          if (typeof parsed[key] === "string" && parsed[key].length > 0) {
            merged[key] = parsed[key];
          }
        }
        // ...and any newly-added stored keys are carried through too, so a
        // settings key added after PAGE_CONTENT_DEFAULTS still takes effect.
        for (const key of Object.keys(parsed)) {
          if (!(key in merged) && typeof parsed[key] === "string" && parsed[key].length > 0) {
            merged[key] = parsed[key];
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse page content settings", e);
    }
  }
  if (overrides) {
    for (const key of Object.keys(PAGE_CONTENT_DEFAULTS)) {
      const val = overrides[key];
      if (typeof val === "string" && val.length > 0) {
        merged[key] = val;
      }
    }
    for (const key of Object.keys(overrides)) {
      if (!(key in merged)) {
        const val = overrides[key];
        if (typeof val === "string" && val.length > 0) {
          merged[key] = val;
        }
      }
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Website settings normalization (shared by App / AdminCMS / Footer).
// ---------------------------------------------------------------------------
// AdminCMS exposes many marketing fields for editing (hero, brand, footer, SEO,
// and section subheadings). Older builds / demo data wrote "luxury"-worded or
// demo placeholder copy into those fields; legacy code also force-canonicalized
// them on every load — which silently discarded genuine admin edits on refresh.
// We now swap a stored value to canonical copy ONLY on an exact match with a
// known legacy string, so CMS-authored copy survives page reloads.

const CANONICAL_MARKETING_COPY: Record<string, string> = {
  heroSubtitle:
    "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
  footerText: "© 2026 1stCars Marketplace. All rights reserved.",
  brandSlogan: "Easy Way",
  brandDescription:
    "Rigorous standards, reimagined for you. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
  seoTitle: "1stCars - Certified Car Marketplace",
  seoDescription:
    "The premier platform to buy and sell certified pre-owned vehicles with a 120-Point Certificate.",
  certifiedSubheadingText:
    "We engineered a rigorous quality benchmark to remove the friction, anxiety, and guesswork of buying pre-owned cars.",
  testimonialSubheadingText:
    "We have completed over 280+ deliveries. Read reviews from verified car owners.",
  ctaSubheadingText:
    "Please contact our Surat sell car hub to request a home evaluation, or register for rare car arrivals.",
  buyCarsSubheadingText:
    "1stCars is Gujarat's premier aggregator platform connecting Car Buyers, Sellers, and Dealers. Every vehicle undergoes strict 1stMark certification for Single Owned status, Non-Accident trusted frame, and Genuine KM verification.",
};

// Exact legacy demo/luxury values that must be replaced with canonical copy.
const LEGACY_MARKETING_COPY: Record<string, string[]> = {
  heroSubtitle: [
    "Rigorous standards, reimagined for luxury. 120-point inspected, certified vehicles single-owner, accident-free, verified km.",
    "Inspired by rigorous standards, reimagined for ultimate convenience.",
    "Inspired by rigorous pre-owned standards, reimagined for the ultimate experience. Explore 120-point inspected, hassle-free certified vehicles with single-owner pedigree, non-accident trust, and genuine km verification.",
  ],
  footerText: ["© 2026 1stCars Luxury Marketplace. All rights reserved."],
  brandSlogan: ["The Luxury Pre-Owned Hub"],
  brandDescription: [
    "We curate only top-tier luxury, sports, and specialty vehicles. Our mission is to bridge pristine engineering with absolute luxury service.",
  ],
  seoTitle: ["1stCars - Certified Luxury Car Marketplace"],
  seoDescription: [
    "The premier platform to buy and sell certified luxury pre-owned vehicles with a 120-Point Certificate.",
  ],
  certifiedSubheadingText: [
    "We engineered a rigorous quality benchmark to remove the friction, anxiety, and guesswork of buying pre-owned luxury.",
  ],
  testimonialSubheadingText: [
    "We have completed over 4,500 doorstep premium deliveries. Read reviews from verified luxury car owners.",
  ],
  ctaSubheadingText: [
    "Contact our Surat flagship concierge center to schedule a private showroom tour, request home evaluation, or register for rare luxury car arrivals.",
  ],
};

// Legacy highlight pillar Titles (exact matches) → canonical Title + Desc pair.
const LEGACY_HIGHLIGHT_COPY: Record<string, { title: string; desc: string }> = {
  "120-Point Inspection": {
    title: "Single Owned",
    desc: "Every vehicle is verified to have had only one premium owner, with pristine documentation.",
  },
  "Single Owned, Non Accident Trusted*": {
    title: "Non Accident Trusted",
    desc: "Zero structural or chassis frame damages. Vetted strictly by paint-depth laser diagnostics.",
  },
  "Aggregator Marketplace": {
    title: "Genuine KM",
    desc: "Mileage certified 100% authentic through advanced ECU sweeps and historical service logs.",
  },
};

/**
 * Normalizes a parsed `website_settings` blob for safe rendering:
 *  - strips retired marketing phrases (`sanitizeSettings`),
 *  - replaces demo contact details / logo placeholders,
 *  - swaps ONLY exact known legacy demo/luxury copy for the canonical version.
 * Genuine admin edits are left untouched, so CMS content survives refreshes.
 */
export function normalizeWebsiteSettings(parsed: any): any {
  if (!parsed || typeof parsed !== "object") return parsed;
  const next = sanitizeSettings(parsed);

  // Demo contact details that must never render on the live site.
  const isDemoAddress =
    !next.supportAddress ||
    next.supportAddress.includes("Los Angeles") ||
    next.supportAddress.includes("Greenwood") ||
    next.supportAddress.includes("722") ||
    next.supportAddress.includes("Bhatar");
  if (isDemoAddress) {
    next.supportAddress =
      "1stCars Seller Hub, Vikas Arced, Masma, Olpad, Surat, Gujarat 394540, India";
    next.supportPhone = "+91 8866377722";
    next.supportEmail = "support@1stcars.com";
  }
  if (
    typeof next.buyCarsSubheadingText === "string" &&
    next.buyCarsSubheadingText.includes("owned directly")
  ) {
    next.buyCarsSubheadingText = CANONICAL_MARKETING_COPY.buyCarsSubheadingText;
  }
  if (!next.logoUrl || next.logoUrl === "🏎️ 1stCars" || next.logoUrl === "⭐") {
    next.logoUrl = "/logo.png";
  }

  // Swap only exact legacy demo/luxury values back to canonical copy.
  for (const key of Object.keys(LEGACY_MARKETING_COPY)) {
    const value = next[key];
    if (typeof value === "string" && LEGACY_MARKETING_COPY[key].includes(value)) {
      next[key] = CANONICAL_MARKETING_COPY[key];
    }
  }

  // Legacy highlight pillar titles → canonical Title + Desc pair.
  const highlightKeys: Array<[string, string]> = [
    ["highlight1Title", "highlight1Desc"],
    ["highlight2Title", "highlight2Desc"],
    ["highlight3Title", "highlight3Desc"],
  ];
  for (const [titleKey, descKey] of highlightKeys) {
    const legacy = LEGACY_HIGHLIGHT_COPY[next[titleKey]];
    if (legacy) {
      next[titleKey] = legacy.title;
      if (typeof next[descKey] === "string") next[descKey] = legacy.desc;
    }
  }

  return next;
}
