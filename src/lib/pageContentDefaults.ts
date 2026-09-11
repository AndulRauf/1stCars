// Default copy for the system pages that are editable from Admin CMS → Edit Pages.
// These mirror the original hardcoded strings so the live site is unchanged until
// an admin edits a value. They live in the same `website_settings` blob as the
// existing theme/branding/SEO settings.

import { sanitizeSettings } from "./utils";

export const PAGE_CONTENT_DEFAULTS: Record<string, string> = {
  // ---- About Us ----
  aboutHeroBadge: "ABOUT 1STCARS",
  aboutHeroHeading: "Making Pre-Owned Cars Simple.",
  aboutHeroHighlight: "Simple.",
  aboutHeroSubtitle:
    "1stCars brings a simpler, more transparent way to buy and sell pre-owned cars.",
  aboutBrowseButton: "Explore Cars",
  aboutBackButton: "Sell Your Car",

  aboutM1Value: "120",
  aboutM1Label: "Point Inspection",
  aboutM2Value: "1000+",
  aboutM2Label: "Elite Dealer Network",
  aboutM3Value: "0",
  aboutM3Label: "Hidden Fees",
  aboutM4Value: "24Hr",
  aboutM4Label: "Inspection Turnaround",

  aboutStoryBadge: "OUR STORY",
  aboutStoryHeading: "Built on a simple belief — buying a used car should feel safe.",
  aboutStoryHighlight: "buying a used car should feel safe.",
  aboutStoryPara1:
    "1stCars makes pre-owned car buying simple, transparent, and trustworthy. With doorstep inspections, certified vehicle grading, and a network of verified dealers, we help customers buy and sell with confidence.",
  aboutStoryPara2: "",
  aboutVisionTitle: "Our Vision",
  aboutVisionText:
    "To build a trusted pre-owned car marketplace where buying and selling feels simple, transparent and convenient.",
  aboutMissionTitle: "Make every car transaction simpler.",
  aboutMissionText:
    "From first search to final handover, we remove the guesswork so you can buy and sell with confidence.",

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

  aboutValue1Title: "Transparency",
  aboutValue1Desc:
    "Clear information helps people make better decisions.",
  aboutValue2Title: "Trust",
  aboutValue2Desc:
    "Every car decision should start with confidence.",
  aboutValue3Title: "Simplicity",
  aboutValue3Desc:
    "Buying and selling should not feel complicated.",
  aboutValue4Title: "Customer First",
  aboutValue4Desc:
    "We build around what buyers and sellers actually need.",

  aboutDiff1Title: "Vehicle Inspection",
  aboutDiff1Desc:
    "Every car passes our rigorous 120-point inspection across 12 vital vehicle areas before it is listed.",
  aboutDiff2Title: "Transparent Information",
  aboutDiff2Desc:
    "Complete inspection reports, genuine odometer readings and honest ownership history on every listing.",
  aboutDiff3Title: "Fair Valuation",
  aboutDiff3Desc:
    "Verified dealers compete through transparent bidding so sellers get fair market value.",
  aboutDiff4Title: "Simple Process",
  aboutDiff4Desc:
    "From doorstep inspection to doorstep delivery, every step is designed to be effortless.",

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
  faqPageHeading: "Questions? We've Got Answers.",
  faqPageSubheading:
    "Find quick answers about buying, selling, inspections and 1stCars.",
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
// All answers reflect functionality already present on the website.
export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  // Buying
  { id: "fq-buy-1", category: "Buying", question: "How do I buy a car from 1stCars?", answer: "Browse available cars, open a vehicle's details and book a test drive where offered. A small refundable booking token then reserves the car and unlocks priority assistance." },
  { id: "fq-buy-2", category: "Buying", question: "Can I book a test drive?", answer: "Yes — free of charge wherever the option is shown on the listing. Our concierge team arranges a convenient slot, and you decide on the booking token afterwards." },
  { id: "fq-buy-3", category: "Buying", question: "Are the cars inspected?", answer: "Yes. Every certified car passes our 120-Point Inspection and receives an official Vehicle Grade before it goes live." },
  { id: "fq-buy-4", category: "Buying", question: "What is included in the displayed price?", answer: "The drive-away price. A full cost breakup — including RC transfer and documentation charges — is shown at checkout. No hidden charges." },
  { id: "fq-buy-5", category: "Buying", question: "How do I reserve a car?", answer: "Pay a refundable booking token equal to 1% of the vehicle value (min ₹3,000, max ₹10,000). It adjusts against the final price and is fully refundable per our policy." },
  // Selling
  { id: "fq-sell-1", category: "Selling", question: "How can I sell my car?", answer: "Submit your car details, book a free doorstep inspection, and let verified dealers compete in a live auction for your car. Listing is free — no hidden charges." },
  { id: "fq-sell-2", category: "Selling", question: "Where does the inspection happen?", answer: "At your doorstep — our equipped team covers Surat, Vadodara, Bharuch and Vapi — or at an inspection centre, whichever suits you." },
  { id: "fq-sell-3", category: "Selling", question: "How is my car valued?", answer: "Your car's details, condition and current market trends set the baseline; competing dealer bids then lift the final price." },
  { id: "fq-sell-4", category: "Selling", question: "What documents do I need to sell?", answer: "RC, valid insurance, pollution certificate and your ID proof. Our team helps you gather and verify everything." },
  { id: "fq-sell-5", category: "Selling", question: "How and when do I get paid?", answer: "As soon as you accept a dealer's offer, payment is processed and RC transfer is handled by 1stCars or its authorised partners." },
  // Inspection
  { id: "fq-insp-1", category: "Inspection", question: "What does the inspection cover?", answer: "Exterior, body and structure, mechanicals, electricals, interior, tyres and other key details — recorded in a transparent report." },
  { id: "fq-insp-2", category: "Inspection", question: "How long does an inspection take?", answer: "Typically within 24 hours of your scheduled slot." },
  { id: "fq-insp-5", category: "Inspection", question: "Do you check for odometer tampering?", answer: "Yes. Genuine kilometres are verified via ECU diagnostics and service-log sweeps; tampered odometers are auto-delisted." },
  // Certification
  { id: "fq-cert-1", category: "Certification", question: "What is the 1stMark Certificate?", answer: "Our certificate, signed off by a Master Engineer after a car passes the 120-Point Inspection. It confirms three pillars: Single Owner, Non-Accident and Genuine KM." },
  { id: "fq-cert-2", category: "Certification", question: "Is certification a warranty?", answer: "No. It reflects the vehicle's condition at inspection time and is informational — not a mechanical warranty unless separately agreed in writing." },
  { id: "fq-cert-3", category: "Certification", question: "How is a vehicle graded?", answer: "Across 12 mechanical and structural categories, with an official grade of A+, A, B+ or B." },
  { id: "fq-cert-4", category: "Certification", question: "What happens if a car fails inspection?", answer: "It is not listed until the issues are fixed — or it is withdrawn. Only cars that meet our standards go live." },
  // Financing
  { id: "fq-fin-1", category: "Financing", question: "Can I get a car loan or EMI?", answer: "Yes. Every listing includes an EMI calculator, and our team guides you through financing with partner banks and NBFCs. We do not lend directly." },
  { id: "fq-fin-2", category: "Financing", question: "What are the eligibility requirements?", answer: "Standard KYC — identity, address and income proof. Exact terms depend on the financier and the chosen model." },
  // Payments
  { id: "fq-pay-1", category: "Payments", question: "What payment methods are accepted?", answer: "Indian Rupees (INR) via UPI or bank transfer, as shown at checkout." },
  { id: "fq-pay-3", category: "Payments", question: "How long do token refunds take?", answer: "7–10 working days to the original payment method, subject to our cancellation and damage policy." },
  // Delivery
  { id: "fq-del-1", category: "Delivery", question: "Do you offer home delivery?", answer: "Yes — delivery and ownership-transfer assistance across Gujarat for your purchased vehicle." },
  { id: "fq-del-2", category: "Delivery", question: "How is RC transfer handled?", answer: "End-to-end by 1stCars or its authorised partners — our team coordinates all paperwork with you and the RTO. Charges appear in the price breakup." },
  { id: "fq-del-3", category: "Delivery", question: "How long does RC transfer take?", answer: "It depends on RTO processing, which varies. We keep you updated at every step." },
  // Account & safety
  { id: "fq-acc-1", category: "Account & safety", question: "How do I create an account?", answer: "Sign up with your email or mobile number and verify via OTP. Choose your role — Buyer, Seller or Dealer." },
  { id: "fq-acc-2", category: "Account & safety", question: "Is my personal data safe?", answer: "Yes. Your data is handled per our Privacy Policy; mobile numbers used for OTP and coordination stay private." },
  { id: "fq-acc-4", category: "Account & safety", question: "Can I reset my password?", answer: "Yes — use account recovery and follow the verification steps sent to your registered email or mobile." },
  // General
  { id: "fq-gen-1", category: "General", question: "Where does 1stCars operate?", answer: "Across Gujarat — starting in Surat and serving Vadodara, Bharuch and Vapi — with more regions planned." },
  { id: "fq-gen-2", category: "General", question: "How can I contact 1stCars?", answer: "Email support@1stcars.com, use the contact options on the website, or visit the Surat Experience Centre." },
  { id: "fq-gen-3", category: "General", question: "What are the showroom timings?", answer: "Surat Experience Center: Monday–Sunday, 09:30 AM–08:30 PM. Other outlets are listed on the Location page." }
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
