// Single source of truth for auto-finance EMI calculations.
//
// Standard amortising-loan EMI:   P × r × (1 + r)^n / ((1 + r)^n − 1)
// where P is the financed principal, r the monthly interest rate and
// n the number of monthly payments.

// Site-wide listing assumptions (cards, seller/admin publish, checkout):
// 20% down payment, 5.49% APR, 60 months — the same tenure the finance
// calculator defaults to, so every EMI on the site agrees.
export const LISTING_EMI_APR_PERCENT = 5.49;
export const LISTING_EMI_TERM_MONTHS = 60;
export const LISTING_EMI_DOWN_PAYMENT_RATIO = 0.2;

export function calculateEmi(principal: number, annualRatePercent: number, months: number): number {
  if (!isFinite(principal) || !isFinite(annualRatePercent) || !isFinite(months)) return 0;
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return Math.round(principal / months);
  const factor = Math.pow(1 + monthlyRate, months);
  return Math.round((principal * monthlyRate * factor) / (factor - 1));
}

export function calculateListingEmi(price: number): number {
  if (!isFinite(price) || price <= 0) return 0;
  const principal = price * (1 - LISTING_EMI_DOWN_PAYMENT_RATIO);
  return calculateEmi(principal, LISTING_EMI_APR_PERCENT, LISTING_EMI_TERM_MONTHS);
}