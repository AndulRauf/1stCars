-- ============================================================================
-- 1stCars — profiles approval columns (idempotent quick-fix migration)
-- ----------------------------------------------------------------------------
-- Fixes the 400 PGRST205 "Could not find the '<column>' column of 'profiles'"
-- error the frontend hits on databases created before these columns existed:
--
--   src/App.tsx                  SELECT id, ..., is_approved, status     (login profile)
--   src/components/AdminCMS.tsx  UPDATE profiles SET is_approved, status (dealer approve)
--   src/lib/auctions.ts          SELECT id, role, is_verified, is_approved (dealer bids)
--
-- Safe to run repeatedly (ADD COLUMN IF NOT EXISTS). No existing data is altered.
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste entire file -> Run
-- ============================================================================

-- 1) Admin-approval gate used by AdminCMS and the auction bid RPC.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true NOT NULL;

-- 2) Review status written by AuthModal (pending_approval) and AdminCMS (Approved).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT;

-- 3) Dealer-verification flag read by src/lib/auctions.ts (verifiedDealerIds)
--    and seeded by seed_auction_flow.sql. DEFAULT false keeps existing rows safe.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL;