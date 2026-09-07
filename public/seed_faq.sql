-- ============================================================================
-- 1stCars — FAQ seed
-- ----------------------------------------------------------------------------
-- Idempotent-ish reseed of the public.faq table with the canonical, categorized
-- FAQ set used by the redesigned /faq page (FaqLanding).
--
-- HOW TO RUN
--   Option A (easiest): open the Supabase dashboard → SQL Editor → paste this
--                       file → Run.
--   Option B (CLI):      psql "$YOUR_SUPABASE_DB_URL" -f public/seed_faq.sql
--                       (or: supabase db execute < public/seed_faq.sql)
--
-- NOTE: This DELETES existing rows in public.faq and replaces them with the
-- set below, so display_order stays globally consistent (1..30) and categories
-- render grouped. If you have hand-added FAQs you want to keep, export them
-- first, or switch the DELETE line for the commented ON CONFLICT upsert.
--
-- After running, the live page refreshes automatically (FaqLanding polls every
-- 30s and subscribes to realtime), so just reload the FAQ page.
-- ============================================================================

DELETE FROM public.faq;

INSERT INTO public.faq (question, answer, category, display_order) VALUES
  -- Buying
  ('How do I buy a car from 1stCars?', 'Browse available cars, open a vehicle''s details and book a test drive where offered. A small refundable booking token then reserves the car and unlocks priority assistance.', 'Buying', 1),
  ('Can I book a test drive?', 'Yes — free of charge wherever the option is shown on the listing. Our concierge team arranges a convenient slot, and you decide on the booking token afterwards.', 'Buying', 2),
  ('Are the cars inspected?', 'Yes. Every certified car passes our 120-Point Inspection and receives an official Vehicle Grade before it goes live.', 'Buying', 3),
  ('What is included in the displayed price?', 'The drive-away price. A full cost breakup — including RC transfer and documentation charges — is shown at checkout. No hidden charges.', 'Buying', 4),
  ('How do I reserve a car?', 'Pay a refundable booking token equal to 1% of the vehicle value (min ₹3,000, max ₹10,000). It adjusts against the final price and is fully refundable per our policy.', 'Buying', 5),

  -- Selling
  ('How can I sell my car?', 'Submit your car details, book a free doorstep inspection, and let verified dealers compete in a live auction for your car. Listing is free — no hidden charges.', 'Selling', 6),
  ('Where does the inspection happen?', 'At your doorstep — our equipped team covers Surat, Vadodara, Bharuch and Vapi — or at an inspection centre, whichever suits you.', 'Selling', 7),
  ('How is my car valued?', 'Your car''s details, condition and current market trends set the baseline; competing dealer bids then lift the final price.', 'Selling', 8),
  ('What documents do I need to sell?', 'RC, valid insurance, pollution certificate and your ID proof. Our team helps you gather and verify everything.', 'Selling', 9),
  ('How and when do I get paid?', 'As soon as you accept a dealer''s offer, payment is processed and RC transfer is handled by 1stCars or its authorised partners.', 'Selling', 10),

  -- Inspection
  ('What does the inspection cover?', 'Exterior, body and structure, mechanicals, electricals, interior, tyres and other key details — recorded in a transparent report.', 'Inspection', 11),
  ('How long does an inspection take?', 'Typically within 24 hours of your scheduled slot.', 'Inspection', 12),
  ('Do you check for odometer tampering?', 'Yes. Genuine kilometres are verified via ECU diagnostics and service-log sweeps; tampered odometers are auto-delisted.', 'Inspection', 13),

  -- Certification
  ('What is the 1stMark Certificate?', 'Our certificate, signed off by a Master Engineer after a car passes the 120-Point Inspection. It confirms three pillars: Single Owner, Non-Accident and Genuine KM.', 'Certification', 14),
  ('Is certification a warranty?', 'No. It reflects the vehicle''s condition at inspection time and is informational — not a mechanical warranty unless separately agreed in writing.', 'Certification', 15),
  ('How is a vehicle graded?', 'Across 12 mechanical and structural categories, with an official grade of A+, A, B+ or B.', 'Certification', 16),
  ('What happens if a car fails inspection?', 'It is not listed until the issues are fixed — or it is withdrawn. Only cars that meet our standards go live.', 'Certification', 17),

  -- Financing
  ('Can I get a car loan or EMI?', 'Yes. Every listing includes an EMI calculator, and our team guides you through financing with partner banks and NBFCs. We do not lend directly.', 'Financing', 18),
  ('What are the eligibility requirements?', 'Standard KYC — identity, address and income proof. Exact terms depend on the financier and the chosen model.', 'Financing', 19),

  -- Payments
  ('What payment methods are accepted?', 'Indian Rupees (INR) via UPI or bank transfer, as shown at checkout.', 'Payments', 20),
  ('How long do token refunds take?', '7–10 working days to the original payment method, subject to our cancellation and damage policy.', 'Payments', 21),

  -- Delivery
  ('Do you offer home delivery?', 'Yes — delivery and ownership-transfer assistance across Gujarat for your purchased vehicle.', 'Delivery', 22),
  ('How is RC transfer handled?', 'End-to-end by 1stCars or its authorised partners — our team coordinates all paperwork with you and the RTO. Charges appear in the price breakup.', 'Delivery', 23),
  ('How long does RC transfer take?', 'It depends on RTO processing, which varies. We keep you updated at every step.', 'Delivery', 24),

  -- Account & safety
  ('How do I create an account?', 'Sign up with your email or mobile number and verify via OTP. Choose your role — Buyer, Seller or Dealer.', 'Account & safety', 25),
  ('Is my personal data safe?', 'Yes. Your data is handled per our Privacy Policy; mobile numbers used for OTP and coordination stay private.', 'Account & safety', 26),
  ('Can I reset my password?', 'Yes — use account recovery and follow the verification steps sent to your registered email or mobile.', 'Account & safety', 27),

  -- General
  ('Where does 1stCars operate?', 'Across Gujarat — starting in Surat and serving Vadodara, Bharuch and Vapi — with more regions planned.', 'General', 28),
  ('How can I contact 1stCars?', 'Email support@1stcars.com, use the contact options on the website, or visit the Surat Experience Centre.', 'General', 29),
  ('What are the showroom timings?', 'Surat Experience Center: Monday–Sunday, 09:30 AM–08:30 PM. Other outlets are listed on the Location page.', 'General', 30);

-- Optional, non-destructive alternative (keeps any FAQs not in this list):
-- INSERT INTO public.faq (question, answer, category, display_order)
-- VALUES ( /* ...same rows... */ )
-- ON CONFLICT (question) DO UPDATE SET
--   answer = EXCLUDED.answer,
--   category = EXCLUDED.category,
--   display_order = EXCLUDED.display_order;
