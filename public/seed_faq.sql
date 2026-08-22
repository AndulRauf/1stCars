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
-- set below, so display_order stays globally consistent (1..46) and categories
-- render grouped. If you have hand-added FAQs you want to keep, export them
-- first, or switch the DELETE line for the commented ON CONFLICT upsert.
--
-- After running, the live page refreshes automatically (FaqLanding polls every
-- 30s and subscribes to realtime), so just reload the FAQ page.
-- ============================================================================

DELETE FROM public.faq;

INSERT INTO public.faq (question, answer, category, display_order) VALUES
  -- Buying
  ('How do I buy a car from 1stCars?', 'Browse available cars, open the vehicle details, book a test drive where available, and continue with the buying process. A refundable booking token reserves the car and gives you priority assistance.', 'Buying', 1),
  ('Can I book a test drive?', 'Yes, where the option is available on the vehicle listing. Our concierge team coordinates a convenient slot for you to experience the car before you decide.', 'Buying', 2),
  ('Are the cars inspected?', 'Yes. Vehicles listed through our certified process undergo the 120-Point Inspection and are graded across 12 vital mechanical and structural categories before they go live.', 'Buying', 3),
  ('What is included in the displayed price?', 'The displayed price is the drive-away price and includes a transparent cost breakup shown at checkout. Applicable RC transfer and documentation charges are part of that breakup.', 'Buying', 4),
  ('How do I reserve a car?', 'Pay a refundable booking token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price and is 100% refundable as per our policy.', 'Buying', 5),
  ('Do you offer financing or EMI?', 'Every listing includes an EMI calculator, and our team can guide you through financing options during the buying process.', 'Buying', 6),

  -- Selling
  ('How can I sell my car?', 'Start by submitting your car details and booking a free doorstep inspection. After inspection, verified elite dealers compete in a live, time-boxed auction to offer you the best value.', 'Selling', 7),
  ('Where does the inspection happen?', 'Depending on the available option, inspection can be arranged at a suitable location or our inspection centre across Surat, Vadodara, Bharuch and Vapi.', 'Selling', 8),
  ('How is my car valued?', 'We consider the vehicle''s details, condition and current market factors to determine its value, then let competing dealers bid so you receive a competitive market price.', 'Selling', 9),
  ('What documents do I need to sell?', 'You will need the RC, valid insurance, pollution certificate and your identity proof. Our team helps you gather and verify everything.', 'Selling', 10),
  ('How and when do I get paid?', 'Once you accept a dealer''s offer, payment is processed and RC transfer is facilitated by 1stCars or its authorised partners.', 'Selling', 11),
  ('Is there any cost to list my car?', 'No. The doorstep inspection is free, and there are no hidden listing charges.', 'Selling', 12),

  -- Inspection
  ('What does the inspection cover?', 'The inspection checks important areas such as exterior, body, structure, mechanical components, electrical systems, interior, tyres and other relevant vehicle details.', 'Inspection', 13),
  ('How long does an inspection take?', 'Inspections are typically completed within 24 hours of the scheduled slot.', 'Inspection', 14),
  ('What is the 1stMark Certification process?', 'Every vehicle undergoes our rigorous 120-Point Certificate inspection focusing on chassis, engine diagnostics, electrical elements, and paint levels.', 'Inspection', 15),
  ('What are the 1stMark Certification USPs?', 'Our 1stMark certification covers three core pillars: Single Owned, Non-Accident Trusted, and Genuine KM verified through OBD diagnostics and service log sweeps.', 'Inspection', 16),
  ('Do you check for odometer tampering?', 'Yes. We verify genuine kilometres through multiple ECU-sweep diagnostics. Vehicles with tampered odometers are automatically delisted.', 'Inspection', 17),
  ('Can I get a doorstep inspection?', 'Yes. Our equipped team vans visit any address across Surat, Vadodara, Bharuch and Vapi, usually within 24 hours.', 'Inspection', 18),

  -- Certification
  ('What is the 1stMark Certificate?', 'It is our exclusive certificate, signed off by a Master Engineer, issued to every vehicle that passes the 120-Point Inspection.', 'Certification', 19),
  ('Is certification the same as a warranty?', 'No. The certification reflects the vehicle''s condition at the time of inspection and is informational. It is not a mechanical warranty unless separately agreed in writing.', 'Certification', 20),
  ('How is a vehicle graded?', 'Each car is graded across 12 vital mechanical and structural categories and assigned an official Vehicle Grade of A+, A, B+ or B.', 'Certification', 21),
  ('What happens if a car fails inspection?', 'The vehicle is not listed until the issues are resolved or it is withdrawn. We only list cars that meet our certification standards.', 'Certification', 22),

  -- Financing
  ('Can I get a car loan or EMI?', 'Yes. Each listing has an EMI calculator and our concierge team can guide you through financing with our partner banks and NBFCs.', 'Financing', 23),
  ('What are the eligibility requirements?', 'Standard KYC such as identity, address and income proof is required. Exact eligibility depends on the financier and the chosen model.', 'Financing', 24),
  ('Is there a down payment?', 'The booking token (1% of value, min ₹3,000, max ₹10,000) is adjustable against the price; the financier decides the loan-to-value and down payment.', 'Financing', 25),
  ('Does 1stCars finance directly?', 'We partner with banks and NBFCs and assist you end-to-end; we do not lend directly.', 'Financing', 26),

  -- Test drive
  ('How do I book a test drive?', 'Use the option on the vehicle listing or contact our concierge team. Test drives are arranged subject to availability.', 'Test drive', 27),
  ('Is the test drive free?', 'Yes, where the test drive option is available on the listing.', 'Test drive', 28),
  ('Can I test drive before paying the token?', 'Yes. You can experience the car first wherever the test drive option is available, then decide on the booking token.', 'Test drive', 29),
  ('Where does the test drive happen?', 'At our experience centre or an arranged location convenient to you, based on availability.', 'Test drive', 30),

  -- Payments
  ('What payment methods are accepted?', 'Payments are made in Indian Rupees (INR) through UPI or bank transfer as shown at checkout.', 'Payments', 31),
  ('What is the booking token?', 'It is a refundable token equal to 1% of the vehicle value (minimum ₹3,000, maximum ₹10,000). It is adjusted against the final drive-away price.', 'Payments', 32),
  ('How long do token refunds take?', 'Refunds are processed within 7 to 10 working days to the same payment method, provided no applicable cancellation or damage policy is triggered.', 'Payments', 33),
  ('Are there any hidden charges?', 'No. The full price breakup, including RC transfer and documentation charges, is shown transparently at checkout.', 'Payments', 34),

  -- Delivery
  ('Do you offer home delivery?', 'We facilitate delivery and ownership transfer assistance across Gujarat for your purchased vehicle.', 'Delivery', 35),
  ('How is RC transfer handled?', 'Ownership transfer, RC transfer and applicable road tax are facilitated by 1stCars or its authorised partners; related charges appear in the price breakup.', 'Delivery', 36),
  ('How long does RC transfer take?', 'Timelines depend on RTO and government processing, which are outside our direct control. We keep you updated throughout.', 'Delivery', 37),
  ('Who handles the paperwork?', 'Our team coordinates the documentation with you and the concerned authorities so the transfer is smooth and compliant.', 'Delivery', 38),

  -- Account & safety
  ('How do I create an account?', 'Sign up with your email or mobile number and verify via OTP. You can choose a role such as Buyer, Seller or Dealer.', 'Account & safety', 39),
  ('Is my personal data safe?', 'Your data is handled per our Privacy Policy and applicable laws. Mobile numbers used for OTP and coordination are kept strictly private.', 'Account & safety', 40),
  ('How can I contact support?', 'Email support@1stcars.com or call our team. Contact details are also listed on our Location and Terms pages.', 'Account & safety', 41),
  ('Can I reset my password?', 'Yes, use the account recovery option and follow the verification steps sent to your registered email or mobile.', 'Account & safety', 42),

  -- General
  ('Where does 1stCars operate?', 'Currently, 1stCars is focused on Gujarat, starting with Surat, and serves Vadodara, Bharuch and Vapi.', 'General', 43),
  ('How can I contact 1stCars?', 'Use the contact options available on the website, email support@1stcars.com, or visit our Surat experience centre.', 'General', 44),
  ('What are the showroom timings?', 'The Surat Experience Center is open Monday to Sunday, 09:30 AM to 08:30 PM. Other outlets have their own timings listed on the Location page.', 'General', 45),
  ('Is 1stCars only in Gujarat?', 'Yes, we currently operate across Gujarat, beginning with Surat, with plans to expand to more regions.', 'General', 46);

-- Optional, non-destructive alternative (keeps any FAQs not in this list):
-- INSERT INTO public.faq (question, answer, category, display_order)
-- VALUES ( /* ...same rows... */ )
-- ON CONFLICT (question) DO UPDATE SET
--   answer = EXCLUDED.answer,
--   category = EXCLUDED.category,
--   display_order = EXCLUDED.display_order;
