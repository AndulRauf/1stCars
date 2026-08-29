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
  { id: "fq-buy-1", category: "Buying", question: "How do I buy a car from 1stCars?", answer: "Browse available cars, open the vehicle details, book a test drive where available, and continue with the buying process. A refundable booking token reserves the car and gives you priority assistance." },
  { id: "fq-buy-2", category: "Buying", question: "Can I book a test drive?", answer: "Yes, where the option is available on the vehicle listing. Our concierge team coordinates a convenient slot for you to experience the car before you decide." },
  { id: "fq-buy-3", category: "Buying", question: "Are the cars inspected?", answer: "Yes. Vehicles listed through our certified process undergo the 120-Point Inspection and are graded across 12 vital mechanical and structural categories before they go live." },
  { id: "fq-buy-4", category: "Buying", question: "What is included in the displayed price?", answer: "The displayed price is the drive-away price and includes a transparent cost breakup shown at checkout. Applicable RC transfer and documentation charges are part of that breakup." },
  { id: "fq-buy-5", category: "Buying", question: "How do I reserve a car?", answer: "Pay a refundable booking token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price and is 100% refundable as per our policy." },
  { id: "fq-buy-6", category: "Buying", question: "Do you offer financing or EMI?", answer: "Every listing includes an EMI calculator, and our team can guide you through financing options during the buying process." },
  { id: "fq-sell-1", category: "Selling", question: "How can I sell my car?", answer: "Start by submitting your car details and booking a free doorstep inspection. After inspection, verified elite dealers compete in a live, time-boxed auction to offer you the best value." },
  { id: "fq-sell-2", category: "Selling", question: "Where does the inspection happen?", answer: "Depending on the available option, inspection can be arranged at a suitable location or our inspection centre across Surat, Vadodara, Bharuch and Vapi." },
  { id: "fq-sell-3", category: "Selling", question: "How is my car valued?", answer: "We consider the vehicle's details, condition and current market factors to determine its value, then let competing dealers bid so you receive a competitive market price." },
  { id: "fq-sell-4", category: "Selling", question: "What documents do I need to sell?", answer: "You will need the RC, valid insurance, pollution certificate and your identity proof. Our team helps you gather and verify everything." },
  { id: "fq-sell-5", category: "Selling", question: "How and when do I get paid?", answer: "Once you accept a dealer's offer, payment is processed and RC transfer is facilitated by 1stCars or its authorised partners." },
  { id: "fq-sell-6", category: "Selling", question: "Is there any cost to list my car?", answer: "No. The doorstep inspection is free, and there are no hidden listing charges." },
  { id: "fq-insp-1", category: "Inspection", question: "What does the inspection cover?", answer: "The inspection checks important areas such as exterior, body, structure, mechanical components, electrical systems, interior, tyres and other relevant vehicle details." },
  { id: "fq-insp-2", category: "Inspection", question: "How long does an inspection take?", answer: "Inspections are typically completed within 24 hours of the scheduled slot." },
  { id: "fq-insp-3", category: "Inspection", question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
  { id: "fq-insp-4", category: "Inspection", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification covers three core pillars: Single Owned, Non-Accident Trusted, and Genuine KM verified through OBD diagnostics and service log sweeps." },
  { id: "fq-insp-5", category: "Inspection", question: "Do you check for odometer tampering?", answer: "Yes. We verify genuine kilometres through multiple ECU-sweep diagnostics. Vehicles with tampered odometers are automatically delisted." },
  { id: "fq-insp-6", category: "Inspection", question: "Can I get a doorstep inspection?", answer: "Yes. Our equipped team vans visit any address across Surat, Vadodara, Bharuch and Vapi, usually within 24 hours." },
  { id: "fq-cert-1", category: "Certification", question: "What is the 1stMark Certificate?", answer: "It is our exclusive certificate, signed off by a Master Engineer, issued to every vehicle that passes the 120-Point Inspection." },
  { id: "fq-cert-2", category: "Certification", question: "Is certification the same as a warranty?", answer: "No. The certification reflects the vehicle's condition at the time of inspection and is informational. It is not a mechanical warranty unless separately agreed in writing." },
  { id: "fq-cert-3", category: "Certification", question: "How is a vehicle graded?", answer: "Each car is graded across 12 vital mechanical and structural categories and assigned an official Vehicle Grade of A+, A, B+ or B." },
  { id: "fq-cert-4", category: "Certification", question: "What happens if a car fails inspection?", answer: "The vehicle is not listed until the issues are resolved or it is withdrawn. We only list cars that meet our certification standards." },
  { id: "fq-fin-1", category: "Financing", question: "Can I get a car loan or EMI?", answer: "Yes. Each listing has an EMI calculator and our concierge team can guide you through financing with our partner banks and NBFCs." },
  { id: "fq-fin-2", category: "Financing", question: "What are the eligibility requirements?", answer: "Standard KYC such as identity, address and income proof is required. Exact eligibility depends on the financier and the chosen model." },
  { id: "fq-fin-3", category: "Financing", question: "Is there a down payment?", answer: "The booking token (1% of value, min ₹3,000, max ₹10,000) is adjustable against the price; the financier decides the loan-to-value and down payment." },
  { id: "fq-fin-4", category: "Financing", question: "Does 1stCars finance directly?", answer: "We partner with banks and NBFCs and assist you end-to-end; we do not lend directly." },
  { id: "fq-td-1", category: "Test drive", question: "How do I book a test drive?", answer: "Use the option on the vehicle listing or contact our concierge team. Test drives are arranged subject to availability." },
  { id: "fq-td-2", category: "Test drive", question: "Is the test drive free?", answer: "Yes, where the test drive option is available on the listing." },
  { id: "fq-td-3", category: "Test drive", question: "Can I test drive before paying the token?", answer: "Yes. You can experience the car first wherever the test drive option is available, then decide on the booking token." },
  { id: "fq-td-4", category: "Test drive", question: "Where does the test drive happen?", answer: "At our experience centre or an arranged location convenient to you, based on availability." },
  { id: "fq-pay-1", category: "Payments", question: "What payment methods are accepted?", answer: "Payments are made in Indian Rupees (INR) through UPI or bank transfer as shown at checkout." },
  { id: "fq-pay-2", category: "Payments", question: "What is the booking token?", answer: "It is a refundable token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price." },
  { id: "fq-pay-3", category: "Payments", question: "How long do token refunds take?", answer: "Refunds are processed within 7 to 10 working days to the same payment method, provided no applicable cancellation or damage policy is triggered." },
  { id: "fq-pay-4", category: "Payments", question: "Are there any hidden charges?", answer: "No. The full price breakup, including RC transfer and documentation charges, is shown transparently at checkout." },
  { id: "fq-del-1", category: "Delivery", question: "Do you offer home delivery?", answer: "We facilitate delivery and ownership transfer assistance across Gujarat for your purchased vehicle." },
  { id: "fq-del-2", category: "Delivery", question: "How is RC transfer handled?", answer: "Ownership transfer, RC transfer and applicable road tax are facilitated by 1stCars or its authorised partners; related charges appear in the price breakup." },
  { id: "fq-del-3", category: "Delivery", question: "How long does RC transfer take?", answer: "Timelines depend on RTO and government processing, which are outside our direct control. We keep you updated throughout." },
  { id: "fq-del-4", category: "Delivery", question: "Who handles the paperwork?", answer: "Our team coordinates the documentation with you and the concerned authorities so the transfer is smooth and compliant." },
  { id: "fq-acc-1", category: "Account & safety", question: "How do I create an account?", answer: "Sign up with your email or mobile number and verify via OTP. You can choose a role such as Buyer, Seller or Dealer." },
  { id: "fq-acc-2", category: "Account & safety", question: "Is my personal data safe?", answer: "Your data is handled per our Privacy Policy and applicable laws. Mobile numbers used for OTP and coordination are kept strictly private." },
  { id: "fq-acc-3", category: "Account & safety", question: "How can I contact support?", answer: "Email support@1stcars.com or call our team. Contact details are also listed on our Location and Terms pages." },
  { id: "fq-acc-4", category: "Account & safety", question: "Can I reset my password?", answer: "Yes, use the account recovery option and follow the verification steps sent to your registered email or mobile." },
  { id: "fq-gen-1", category: "General", question: "Where does 1stCars operate?", answer: "Currently, 1stCars is focused on Gujarat, starting with Surat, and serves Vadodara, Bharuch and Vapi." },
  { id: "fq-gen-2", category: "General", question: "How can I contact 1stCars?", answer: "Use the contact options available on the website, email support@1stcars.com, or visit our Surat experience centre." },
  { id: "fq-gen-3", category: "General", question: "What are the showroom timings?", answer: "The Surat Experience Center is open Monday to Sunday, 09:30 AM to 08:30 PM. Other outlets have their own timings listed on the Location page." },
  { id: "fq-gen-4", category: "General", question: "Is 1stCars only in Gujarat?", answer: "Yes, we currently operate across Gujarat, beginning with Surat, with plans to expand to more regions." }
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
  brandSlogan: "The Premium Pre-Owned Hub",
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
