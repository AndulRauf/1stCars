// Default copy for the system pages that are editable from Admin CMS → Edit Pages.
// These mirror the original hardcoded strings so the live site is unchanged until
// an admin edits a value. They live in the same `website_settings` blob as the
// existing theme/branding/SEO settings.

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
  { id: "fq-1", category: "Buying", question: "How do I buy a car from 1stCars?", answer: "Browse available cars, check the vehicle details, book a test drive if available, and continue with the buying process." },
  { id: "fq-2", category: "Buying", question: "Can I book a test drive?", answer: "Yes, where the option is available on the vehicle listing." },
  { id: "fq-3", category: "Buying", question: "Are the cars inspected?", answer: "Vehicles listed through our certified process are checked across important vehicle areas." },
  { id: "fq-4", category: "Selling", question: "How can I sell my car?", answer: "Start by submitting your car details and booking an inspection." },
  { id: "fq-5", category: "Selling", question: "Where does the inspection happen?", answer: "Depending on the available option, inspection can be arranged at a suitable location or inspection centre." },
  { id: "fq-6", category: "Selling", question: "How is my car valued?", answer: "We consider the vehicle's details, condition and current market factors to determine its value." },
  { id: "fq-7", category: "Inspection", question: "What does the inspection cover?", answer: "The inspection checks important areas such as exterior, body, structure, mechanical components, electrical systems, interior, tyres and other relevant vehicle details." },
  { id: "fq-8", category: "Inspection", question: "How long does an inspection take?", answer: "Inspections are typically completed within 24 hours." },
  { id: "fq-9", category: "Inspection", question: "What is the 1stMark Certification process?", answer: "Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels." },
  { id: "fq-10", category: "Inspection", question: "What are the 1stMark Certification USPs?", answer: "Our 1stMark certification covers three core pillars: Single Owned, Non-Accident Trusted, and Genuine KM verified through OBD diagnostics and service log sweeps." },
  { id: "fq-11", category: "Payments", question: "Can I get financing or EMI for a car?", answer: "Each vehicle listing includes an EMI calculator. Our team can also guide you through financing options during the buying process." },
  { id: "fq-12", category: "General", question: "Where does 1stCars operate?", answer: "Currently, 1stCars is focused on Gujarat, starting with Surat." },
  { id: "fq-13", category: "General", question: "How can I contact 1stCars?", answer: "Use the contact options available on the website." }
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
