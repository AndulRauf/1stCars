// Default copy for the system pages that are editable from Admin CMS → Edit Pages.
// These mirror the original hardcoded strings so the live site is unchanged until
// an admin edits a value. They live in the same `website_settings` blob as the
// existing theme/branding/SEO settings.

export const PAGE_CONTENT_DEFAULTS: Record<string, string> = {
  // ---- About Us ----
  aboutHeroBadge: "ABOUT 1STCARS",
  aboutHeroHeading: "Your Trusted Pre-Owned Marketplace",
  aboutHeroHighlight: "Pre-Owned",
  aboutHeroSubtitle:
    "1stCars is Gujarat's modern hub for buying and selling certified pre-owned vehicles. We combine rigorous 120-point inspections, transparent pricing, and an elite dealer network to make every transaction simple, safe, and fair.",
  aboutBrowseButton: "Browse Certified Cars",
  aboutBackButton: "Back to Home",

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
    "1stCars was founded to solve a very real problem: pre-owned car shopping is full of hidden defects, inflated prices, and shady strangers. We set out to change that with a marketplace that puts verification, transparency, and the customer first.",
  aboutStoryPara2:
    "Today, we operate across Gujarat with doorstep inspections, certified vehicle grading, and an elite network of verified dealers who compete transparently for your business. Every listing is owned and backed by 1stCars — so you always know exactly what you're getting.",
  aboutVisionTitle: "Our Vision",
  aboutVisionText: "Become India's most trusted destination for certified pre-owned vehicles.",
  aboutMissionTitle: "Our Mission",
  aboutMissionText: "Bridge pristine engineering with absolute service through verified, transparent car deals.",

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

  aboutValue1Title: "Total Transparency",
  aboutValue1Desc:
    "Every car is listed with its complete inspection report, genuine odometer reading, and honest ownership history. No hidden surprises, ever.",
  aboutValue2Title: "Certified Quality",
  aboutValue2Desc:
    "Every vehicle passes our rigorous 120-Point Certification across 12 vital mechanical and structural categories before it earns a listing.",
  aboutValue3Title: "Fair Deal Mediation",
  aboutValue3Desc:
    "We connect verified buyers, sellers, and elite dealers through transparent, competitive bidding with zero high-pressure sales.",
  aboutValue4Title: "Customer First",
  aboutValue4Desc:
    "From doorstep inspections to doorstep delivery, every process is designed around your convenience and peace of mind.",

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
  faqPageHeading: "Frequently Asked Questions",
  faqPageSubheading:
    "Here are the answers to the most common queries about 1stCars, our 120-point inspections, and how buying and selling works.",
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
export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  { id: "fq-1", category: "Certification", question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
  { id: "fq-2", category: "Trust", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification guarantees three core pillars: Single Owned, Non-Accident Trusted, and Genuine KM verified through OBD diagnostics and service log sweeps." }
];

export function getPageContent(overrides?: Record<string, string | undefined>): Record<string, string> {
  const merged: Record<string, string> = { ...PAGE_CONTENT_DEFAULTS };
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PAGE_CONTENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const key of Object.keys(PAGE_CONTENT_DEFAULTS)) {
          if (typeof parsed[key] === "string" && parsed[key].length > 0) {
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
  }
  return merged;
}
