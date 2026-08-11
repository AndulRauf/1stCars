-- ============================================================
-- 1stCars Dealer Auction Engine V1
--
-- Introduces the canonical public.auctions table (replacing the
-- legacy flat "car_title / current_bid / highest_bidder_name"
-- auction demo) plus bid, eligibility and payment ledgers. All
-- state changes flow through SECURITY DEFINER RPCs so validation,
-- locking, anti-sniping extensions and automation events stay in
-- the database. No external tools required.
--
-- Order of operations:
--   1. Retire legacy public.auctions -> auctions_legacy (data kept)
--   2. Create new tables + status flow + RLS
--   3. Triggers (status guard, audit, events, eligibility)
--   4. RPCs (admin / dealer / seller / maintenance)
--   5. Realtime publication
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RETIRE LEGACY AUCTIONS TABLE
-- ============================================================

-- Drop legacy RLS policies before renaming (they move with the table,
-- but reference the old "active" status semantics we are replacing).
DROP POLICY IF EXISTS "Anyone reads auctions" ON public.auctions;
DROP POLICY IF EXISTS "Dealers bid on active auctions" ON public.auctions;
DROP POLICY IF EXISTS "Staff and inspectors manage auctions" ON public.auctions;

-- The legacy trigger/function from automation_schema.sql stays attached
-- to the renamed table so it keeps working on historical rows.
-- (Guarded so the migration can be re-run after a partial failure.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'auctions' AND c.relnamespace = 'public'::regnamespace)
     AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'auctions_legacy' AND c.relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.auctions RENAME TO auctions_legacy;
  END IF;
END $$;

-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- 2.1 Auction status transition map (enforced by a trigger).
CREATE TABLE IF NOT EXISTS public.auction_status_flow (
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO public.auction_status_flow (from_status, to_status) VALUES
  ('DRAFT', 'DRAFT'), ('DRAFT', 'READY'), ('DRAFT', 'SCHEDULED'), ('DRAFT', 'CANCELLED'),
  ('READY', 'READY'), ('READY', 'SCHEDULED'), ('READY', 'LIVE'), ('READY', 'CANCELLED'),
  ('SCHEDULED', 'SCHEDULED'), ('SCHEDULED', 'LIVE'), ('SCHEDULED', 'CANCELLED'), ('SCHEDULED', 'DRAFT'),
  ('LIVE', 'LIVE'), ('LIVE', 'EXTENDED'), ('LIVE', 'CLOSING'), ('LIVE', 'CANCELLED'),
  ('EXTENDED', 'EXTENDED'), ('EXTENDED', 'CLOSING'), ('EXTENDED', 'CANCELLED'),
  ('CLOSING', 'CLOSING'), ('CLOSING', 'CLOSED'), ('CLOSING', 'SELLER_REVIEW'), ('CLOSING', 'EXPIRED'), ('CLOSING', 'CANCELLED'),
  ('CLOSED', 'SELLER_REVIEW'), ('CLOSED', 'ACCEPTED'), ('CLOSED', 'REJECTED'),
  ('SELLER_REVIEW', 'SELLER_REVIEW'), ('SELLER_REVIEW', 'ACCEPTED'), ('SELLER_REVIEW', 'REJECTED'), ('SELLER_REVIEW', 'CANCELLED'),
  ('ACCEPTED', 'ACCEPTED'),
  ('REJECTED', 'REJECTED'),
  ('EXPIRED', 'EXPIRED'),
  ('CANCELLED', 'CANCELLED')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 2.2 Canonical auctions table.
CREATE TABLE IF NOT EXISTS public.auctions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id                 UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  inspection_id          UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  seller_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                 TEXT DEFAULT 'DRAFT' NOT NULL,
  starting_bid           INTEGER NOT NULL CHECK (starting_bid > 0),
  reserve_price          INTEGER DEFAULT 0 NOT NULL CHECK (reserve_price >= 0),
  current_highest_bid    INTEGER CHECK (current_highest_bid IS NULL OR current_highest_bid >= starting_bid),
  minimum_increment      INTEGER DEFAULT 5000 NOT NULL CHECK (minimum_increment > 0),
  starts_at              TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at                TIMESTAMP WITH TIME ZONE NOT NULL,
  extension_seconds      INTEGER DEFAULT 120 NOT NULL CHECK (extension_seconds > 0),
  max_extension_count    INTEGER DEFAULT 5 NOT NULL CHECK (max_extension_count >= 0),
  extension_count        INTEGER DEFAULT 0 NOT NULL CHECK (extension_count >= 0),
  winner_dealer_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winning_bid_id         UUID,
  closed_at              TIMESTAMP WITH TIME ZONE,
  ended_reason           TEXT,
  created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT auctions_time_window CHECK (ends_at > starts_at),
  CONSTRAINT auctions_status_enum CHECK (
    status IN ('DRAFT', 'READY', 'SCHEDULED', 'LIVE', 'EXTENDED', 'CLOSING', 'CLOSED', 'SELLER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')
  )
);

CREATE INDEX IF NOT EXISTS auctions_status_idx ON public.auctions (status);
CREATE INDEX IF NOT EXISTS auctions_ends_at_idx ON public.auctions (ends_at);
CREATE INDEX IF NOT EXISTS auctions_car_idx ON public.auctions (car_id);
CREATE INDEX IF NOT EXISTS auctions_seller_idx ON public.auctions (seller_id);

-- 2.3 Bid ledger. client_request_id is the idempotency key: a retried
-- request (double-click / network retry) returns the original outcome.
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id         UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  dealer_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount             INTEGER NOT NULL CHECK (amount > 0),
  status             TEXT DEFAULT 'WINNING' NOT NULL CHECK (status IN ('WINNING', 'OUTBID', 'CANCELLED', 'REJECTED')),
  client_request_id  TEXT UNIQUE,
  is_auto_extension  BOOLEAN DEFAULT false NOT NULL,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS auction_bids_auction_idx ON public.auction_bids (auction_id, amount DESC, created_at);
CREATE INDEX IF NOT EXISTS auction_bids_dealer_idx ON public.auction_bids (dealer_id);

-- 2.4 Dealer eligibility ledger (privacy + access control).
CREATE TABLE IF NOT EXISTS public.auction_dealer_eligibility (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id     UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  dealer_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status         TEXT DEFAULT 'INVITED' NOT NULL CHECK (status IN ('INVITED', 'ELIGIBLE', 'VIEWED', 'BIDDED', 'DISQUALIFIED')),
  invited_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  eligible_at    TIMESTAMP WITH TIME ZONE,
  viewed_at      TIMESTAMP WITH TIME ZONE,
  last_bid_at    TIMESTAMP WITH TIME ZONE,
  UNIQUE (auction_id, dealer_id)
);

CREATE INDEX IF NOT EXISTS auction_eligibility_dealer_idx ON public.auction_dealer_eligibility (dealer_id, status);

-- 2.5 Payment ledger (no gateway: statuses only).
CREATE TABLE IF NOT EXISTS public.auction_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id        UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  winner_dealer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bid_id            UUID REFERENCES public.auction_bids(id) ON DELETE SET NULL,
  amount            INTEGER NOT NULL CHECK (amount > 0),
  status            TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RECEIVED', 'FAILED', 'REFUNDED')),
  method            TEXT,
  reference         TEXT,
  paid_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.auction_status_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_dealer_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_payments ENABLE ROW LEVEL SECURITY;

-- auction_status_flow: public reference map (like car_status_flow).
CREATE POLICY "Anyone reads auction status flow" ON public.auction_status_flow
  FOR SELECT USING (true);

-- auctions
DROP POLICY IF EXISTS "Staff manage auctions" ON public.auctions;
DROP POLICY IF EXISTS "Staff read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Eligible dealers read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers read own auctions" ON public.auctions;

CREATE POLICY "Staff manage auctions" ON public.auctions
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Eligible dealers read auctions" ON public.auctions
  FOR SELECT USING (
    public.get_auth_user_role() = 'Dealer' AND
    EXISTS (
      SELECT 1 FROM public.auction_dealer_eligibility ade
      WHERE ade.auction_id = public.auctions.id
        AND ade.dealer_id = auth.uid()
        AND ade.status IN ('INVITED', 'ELIGIBLE', 'VIEWED', 'BIDDED')
    )
  );

CREATE POLICY "Sellers read own auctions" ON public.auctions
  FOR SELECT USING (
    public.get_auth_user_role() = 'Seller' AND
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = public.auctions.inspection_id
        AND i.seller_id = auth.uid()
    )
  );

-- auction_bids: staff full visibility; dealers only their own bids.
-- Inserts happen exclusively inside SECURITY DEFINER RPCs, so no INSERT policy.
DROP POLICY IF EXISTS "Staff manage bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Dealers read own bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Admin deletes bids" ON public.auction_bids;

CREATE POLICY "Staff manage bids" ON public.auction_bids
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Dealers read own bids" ON public.auction_bids
  FOR SELECT USING (public.get_auth_user_role() = 'Dealer' AND dealer_id = auth.uid());

-- auction_dealer_eligibility: staff full; dealers only their own record.
DROP POLICY IF EXISTS "Staff manage eligibility" ON public.auction_dealer_eligibility;
DROP POLICY IF EXISTS "Dealers read own eligibility" ON public.auction_dealer_eligibility;

CREATE POLICY "Staff manage eligibility" ON public.auction_dealer_eligibility
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Dealers read own eligibility" ON public.auction_dealer_eligibility
  FOR SELECT USING (public.get_auth_user_role() = 'Dealer' AND dealer_id = auth.uid());

-- auction_payments: staff full; winning dealer reads own record only.
DROP POLICY IF EXISTS "Staff manage payments" ON public.auction_payments;
DROP POLICY IF EXISTS "Winning dealer reads payment" ON public.auction_payments;

CREATE POLICY "Staff manage payments" ON public.auction_payments
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Winning dealer reads payment" ON public.auction_payments
  FOR SELECT USING (public.get_auth_user_role() = 'Dealer' AND winner_dealer_id = auth.uid());

-- ============================================================
-- 4. HELPER FUNCTIONS + TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.auction_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_touch_updated ON public.auctions;
CREATE TRIGGER auctions_touch_updated
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_touch_updated_at();

DROP TRIGGER IF EXISTS auction_payments_touch_updated ON public.auction_payments;
CREATE TRIGGER auction_payments_touch_updated
  BEFORE UPDATE ON public.auction_payments
  FOR EACH ROW EXECUTE FUNCTION public.auction_touch_updated_at();

-- 4.1 Status guard: every auctions.status change must follow the map.
CREATE OR REPLACE FUNCTION public.auction_guard_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auction_status_flow
    WHERE from_status = OLD.status AND to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'Invalid auction status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_guard_status ON public.auctions;
CREATE TRIGGER auctions_guard_status
  BEFORE UPDATE OF status ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_guard_status_transition();

-- 4.2 Audit trail for every status change (even direct updates).
CREATE OR REPLACE FUNCTION public.auction_audit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.automation_audit(
      'auction_status_changed', 'auctions', NEW.id::text,
      OLD.status, NEW.status, NEW.ended_reason,
      jsonb_build_object('car_id', NEW.car_id, 'winner_dealer_id', NEW.winner_dealer_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_audit_status ON public.auctions;
CREATE TRIGGER auctions_audit_status
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_audit_status_change();

-- 4.3 Created/eligibility events.
CREATE OR REPLACE FUNCTION public.auction_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.automation_record_event(
    'auction.created', 'auctions', NEW.id::text,
    jsonb_build_object(
      'auction_id', NEW.id, 'car_id', NEW.car_id,
      'inspection_id', NEW.inspection_id,
      'starting_bid', NEW.starting_bid, 'reserve_price', NEW.reserve_price,
      'starts_at', NEW.starts_at, 'ends_at', NEW.ends_at,
      'status', NEW.status
    )
  );
  PERFORM public.automation_audit('auction_created', 'auctions', NEW.id::text, NULL, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_on_insert ON public.auctions;
CREATE TRIGGER auctions_on_insert
  AFTER INSERT ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_on_insert();

CREATE OR REPLACE FUNCTION public.auction_eligibility_on_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.automation_record_event(
      'auction.dealer_invited', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
      jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'ELIGIBLE' THEN
      PERFORM public.automation_record_event(
        'auction.dealer_eligible', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
        jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
      );
    ELSIF NEW.status = 'VIEWED' THEN
      PERFORM public.automation_record_event(
        'auction.viewed', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
        jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
      );
    ELSIF NEW.status = 'DISQUALIFIED' THEN
      PERFORM public.automation_record_event(
        'auction.dealer_disqualified', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
        jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_eligibility_on_change ON public.auction_dealer_eligibility;
CREATE TRIGGER auction_eligibility_on_change
  AFTER INSERT OR UPDATE ON public.auction_dealer_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.auction_eligibility_on_change();

-- 4.4 Role helper for RPCs.
CREATE OR REPLACE FUNCTION public.auction_require_role(p_roles text[])
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role text;
BEGIN
  SELECT public.get_auth_user_role()::text INTO v_role;
  IF v_role IS NULL OR NOT (v_role = ANY (p_roles)) THEN
    RAISE EXCEPTION 'Not authorized. Required role: %', array_to_string(p_roles, ', ');
  END IF;
  RETURN v_role;
END;
$$;

-- ============================================================
-- 5. ADMIN / STAFF RPCS
-- ============================================================

-- 5.1 Create a DRAFT auction from a certified inspection.
CREATE OR REPLACE FUNCTION public.auction_create_auction(
  p_car_id uuid,
  p_inspection_id uuid,
  p_starting_bid integer,
  p_reserve_price integer DEFAULT 0,
  p_minimum_increment integer DEFAULT 5000,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_extension_seconds integer DEFAULT 120,
  p_max_extension_count integer DEFAULT 5,
  p_eligible_dealer_ids uuid[] DEFAULT NULL
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_seller_id uuid;
  v_auction public.auctions;
  v_start timestamptz := coalesce(p_starts_at, timezone('utc'::text, now()));
  v_end timestamptz := coalesce(p_ends_at, timezone('utc'::text, now()) + interval '24 hours');
  v_dealer uuid;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);

  IF p_car_id IS NULL OR p_inspection_id IS NULL THEN
    RAISE EXCEPTION 'car_id and inspection_id are required';
  END IF;
  IF p_starting_bid IS NULL OR p_starting_bid <= 0 THEN
    RAISE EXCEPTION 'starting_bid must be positive';
  END IF;
  IF p_reserve_price IS NULL OR p_reserve_price < 0 THEN
    RAISE EXCEPTION 'reserve_price cannot be negative';
  END IF;
  IF v_end <= v_start THEN
    RAISE EXCEPTION 'ends_at must be after starts_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cars WHERE id = p_car_id AND status IN ('available', 'listed', 'ready_for_sale', 'inspection_completed')) THEN
    RAISE EXCEPTION 'Car is not available for auction (status must be available/listed)';
  END IF;

  SELECT seller_id INTO v_seller_id FROM public.inspections WHERE id = p_inspection_id;
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Inspection not found or has no seller';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.inspections
    WHERE id = p_inspection_id AND overall_score IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Inspection must be completed (overall score required) before auction';
  END IF;

  INSERT INTO public.auctions (
    car_id, inspection_id, seller_id, status, starting_bid, reserve_price,
    minimum_increment, starts_at, ends_at, extension_seconds, max_extension_count, created_by
  ) VALUES (
    p_car_id, p_inspection_id, v_seller_id, 'DRAFT', p_starting_bid, coalesce(p_reserve_price, 0),
    coalesce(p_minimum_increment, 5000), v_start, v_end,
    coalesce(p_extension_seconds, 120), coalesce(p_max_extension_count, 5), auth.uid()
  ) RETURNING * INTO v_auction;

  IF p_eligible_dealer_ids IS NOT NULL THEN
    FOR v_dealer IN SELECT unnest(p_eligible_dealer_ids) LOOP
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_dealer AND role::text = 'Dealer') THEN
        INSERT INTO public.auction_dealer_eligibility (auction_id, dealer_id, status)
        VALUES (v_auction.id, v_dealer, 'INVITED')
        ON CONFLICT (auction_id, dealer_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  PERFORM public.automation_audit('auction_created', 'auctions', v_auction.id::text, NULL, 'DRAFT',
    'Auction created by ' || v_role, jsonb_build_object('car_id', p_car_id, 'inspection_id', p_inspection_id));

  RETURN v_auction;
END;
$$;

-- 5.2 Publish: DRAFT -> READY (admin finalizes parameters, ready to schedule).
CREATE OR REPLACE FUNCTION public.auction_publish_auction(p_auction_id uuid)
RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  UPDATE public.auctions SET status = 'READY', updated_at = now()
  WHERE id = p_auction_id AND status = 'DRAFT'
  RETURNING * INTO v_auction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found or not in DRAFT status';
  END IF;
  PERFORM public.automation_record_event('auction.published', 'auctions', v_auction.id::text,
    jsonb_build_object('auction_id', v_auction.id, 'status', 'READY'));
  PERFORM public.automation_audit('auction_published', 'auctions', v_auction.id::text, 'DRAFT', 'READY',
    'Published by ' || v_role);
  RETURN v_auction;
END;
$$;

-- 5.3 Schedule: READY/DRAFT -> SCHEDULED with an explicit time window.
CREATE OR REPLACE FUNCTION public.auction_schedule_auction(
  p_auction_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'A valid start/end window is required';
  END IF;
  UPDATE public.auctions
  SET status = 'SCHEDULED', starts_at = p_starts_at, ends_at = p_ends_at,
      extension_count = 0, updated_at = now()
  WHERE id = p_auction_id AND status IN ('DRAFT', 'READY')
  RETURNING * INTO v_auction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found or not schedulable from its current status';
  END IF;
  PERFORM public.automation_record_event('auction.scheduled', 'auctions', v_auction.id::text,
    jsonb_build_object('auction_id', v_auction.id, 'starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at));
  PERFORM public.automation_audit('auction_scheduled', 'auctions', v_auction.id::text, NULL, 'SCHEDULED',
    'Scheduled by ' || v_role, jsonb_build_object('starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at));
  RETURN v_auction;
END;
$$;

-- 5.4 Start: SCHEDULED/READY -> LIVE. Vehicle enters bidding.
CREATE OR REPLACE FUNCTION public.auction_start_auction(p_auction_id uuid)
RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
  v_seller uuid;
  v_eligible uuid;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  UPDATE public.auctions SET status = 'LIVE', updated_at = now()
  WHERE id = p_auction_id AND status IN ('READY', 'SCHEDULED')
  RETURNING * INTO v_auction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found or not startable from its current status';
  END IF;

  IF v_auction.car_id IS NOT NULL THEN
    UPDATE public.cars SET status = 'bidding', updated_at = now()
    WHERE id = v_auction.car_id AND status IN ('available', 'listed');
  END IF;

  SELECT seller_id INTO v_seller FROM public.inspections WHERE id = v_auction.inspection_id;
  IF v_seller IS NOT NULL THEN
    PERFORM public.automation_notify(v_seller, 'Auction Started',
      'Your certified vehicle is now live in the dealer auction. Track the result in your seller dashboard.',
      'info', jsonb_build_object('auction_id', v_auction.id));
  END IF;

  FOR v_eligible IN
    SELECT ade.dealer_id FROM public.auction_dealer_eligibility ade
    WHERE ade.auction_id = v_auction.id AND ade.status IN ('INVITED', 'ELIGIBLE', 'VIEWED', 'BIDDED')
  LOOP
    PERFORM public.automation_notify(v_eligible, 'Auction Live',
      'A new dealer auction you are eligible for is now live. Place your bids before it ends.',
      'action', jsonb_build_object('auction_id', v_auction.id));
  END LOOP;

  PERFORM public.automation_record_event('auction.started', 'auctions', v_auction.id::text,
    jsonb_build_object('auction_id', v_auction.id, 'starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at));
  PERFORM public.automation_audit('auction_started', 'auctions', v_auction.id::text, NULL, 'LIVE',
    'Started by ' || v_role);
  RETURN v_auction;
END;
$$;

-- 5.5 Add / refresh the eligible dealer pool for an auction.
CREATE OR REPLACE FUNCTION public.auction_set_eligible_dealers(
  p_auction_id uuid,
  p_dealer_ids uuid[]
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_dealer uuid;
  v_count integer := 0;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  IF NOT EXISTS (SELECT 1 FROM public.auctions WHERE id = p_auction_id) THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  IF p_dealer_ids IS NOT NULL THEN
    FOR v_dealer IN SELECT unnest(p_dealer_ids) LOOP
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_dealer AND role::text = 'Dealer') THEN
        INSERT INTO public.auction_dealer_eligibility (auction_id, dealer_id, status, eligible_at)
        VALUES (p_auction_id, v_dealer, 'ELIGIBLE', now())
        ON CONFLICT (auction_id, dealer_id)
        DO UPDATE SET status = CASE WHEN public.auction_dealer_eligibility.status IN ('INVITED', 'ELIGIBLE') THEN 'ELIGIBLE' ELSE public.auction_dealer_eligibility.status END,
                      eligible_at = COALESCE(public.auction_dealer_eligibility.eligible_at, now());
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- Remove invitations that were never activated (keeps the pool clean).
  DELETE FROM public.auction_dealer_eligibility
  WHERE auction_id = p_auction_id
    AND status = 'INVITED'
    AND (p_dealer_ids IS NULL OR NOT (dealer_id = ANY (p_dealer_ids)));

  PERFORM public.automation_audit('auction_eligibility_updated', 'auctions', p_auction_id::text,
    NULL, NULL, 'Eligible dealers updated by ' || v_role,
    jsonb_build_object('dealer_count', v_count));
  RETURN v_count;
END;
$$;

-- 5.6 Disqualify a single dealer from an auction.
CREATE OR REPLACE FUNCTION public.auction_disqualify_dealer(
  p_auction_id uuid,
  p_dealer_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  UPDATE public.auction_dealer_eligibility
  SET status = 'DISQUALIFIED'
  WHERE auction_id = p_auction_id AND dealer_id = p_dealer_id AND status <> 'BIDDED';
  PERFORM public.automation_audit('auction_dealer_disqualified', 'auction_dealer_eligibility',
    p_auction_id::text || ':' || p_dealer_id::text, NULL, 'DISQUALIFIED',
    'Disqualified by ' || v_role);
END;
$$;

-- 5.7 Cancel an auction and restore the vehicle.
CREATE OR REPLACE FUNCTION public.auction_cancel_auction(
  p_auction_id uuid,
  p_reason text DEFAULT 'Cancelled by staff'
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
  v_was_open boolean;
  v_eligible uuid;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  SELECT * INTO v_auction
  FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;
  v_was_open := v_auction.status IN ('LIVE', 'EXTENDED');

  UPDATE public.auctions
  SET status = 'CANCELLED', closed_at = now(), ended_reason = coalesce(p_reason, 'Cancelled by staff'), updated_at = now()
  WHERE id = p_auction_id AND status IN ('DRAFT', 'READY', 'SCHEDULED', 'LIVE', 'EXTENDED');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction cannot be cancelled from its current status (%)', v_auction.status;
  END IF;

  IF v_auction.car_id IS NOT NULL THEN
    UPDATE public.cars SET status = 'available', updated_at = now()
    WHERE id = v_auction.car_id AND status = 'bidding';
  END IF;

  IF v_was_open THEN
    FOR v_eligible IN
      SELECT ade.dealer_id FROM public.auction_dealer_eligibility ade
      WHERE ade.auction_id = p_auction_id AND ade.status IN ('ELIGIBLE', 'VIEWED', 'BIDDED')
    LOOP
      PERFORM public.automation_notify(v_eligible, 'Auction Cancelled',
        'An auction you were participating in was cancelled. No charges apply.',
        'alert', jsonb_build_object('auction_id', p_auction_id));
    END LOOP;
  END IF;

  PERFORM public.automation_record_event('auction.cancelled', 'auctions', p_auction_id::text,
    jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason, 'previous_status', v_auction.status));
  PERFORM public.automation_audit('auction_cancelled', 'auctions', p_auction_id::text,
    v_auction.status, 'CANCELLED', p_reason);
  RETURN v_auction;
END;
$$;

-- ============================================================
-- 6. DEALER RPCS
-- ============================================================

-- 6.1 Mark an auction as viewed (eligibility INVITED/ELIGIBLE -> VIEWED).
CREATE OR REPLACE FUNCTION public.auction_mark_viewed(p_auction_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.auction_require_role(ARRAY['Dealer']) IS NULL THEN RETURN; END IF;
  UPDATE public.auction_dealer_eligibility
  SET status = 'VIEWED', viewed_at = COALESCE(viewed_at, now())
  WHERE auction_id = p_auction_id AND dealer_id = v_uid
    AND status IN ('INVITED', 'ELIGIBLE');
END;
$$;

-- 6.2 Atomic, idempotent bid placement with anti-sniping extension.
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id uuid,
  p_amount integer,
  p_client_request_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_auction public.auctions%ROWTYPE;
  v_prev_bid_id uuid;
  v_prev_bid_amount integer;
  v_prev_dealer uuid;
  v_new_bid_id uuid;
  v_extended boolean := false;
  v_new_ends_at timestamptz;
  v_existing uuid;
  v_result jsonb;
  v_next_bid integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'Dealer' THEN RAISE EXCEPTION 'Only dealers can place bids'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND is_verified = true) THEN
    RAISE EXCEPTION 'Dealer account is not verified for auction participation';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Bid amount must be positive'; END IF;
  IF p_client_request_id IS NULL OR p_client_request_id = '' THEN
    RAISE EXCEPTION 'client_request_id is required';
  END IF;

  -- Idempotency: a retried request returns the original outcome.
  SELECT b.id INTO v_existing FROM public.auction_bids b
  WHERE b.auction_id = p_auction_id AND b.client_request_id = p_client_request_id;
  IF v_existing IS NOT NULL THEN
    SELECT jsonb_build_object('success', true, 'duplicate', true,
             'bid_id', b.id, 'amount', b.amount, 'created_at', b.created_at)
      INTO v_result FROM public.auction_bids b WHERE b.id = v_existing;
    RETURN v_result;
  END IF;

  -- Lock the auction row so concurrent bids serialize.
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;

  IF v_auction.status NOT IN ('LIVE', 'EXTENDED') THEN
    RAISE EXCEPTION 'Auction is not open for bidding (current status: %)', v_auction.status;
  END IF;
  IF timezone('utc'::text, now()) < v_auction.starts_at THEN
    RAISE EXCEPTION 'Auction has not started yet';
  END IF;
  IF timezone('utc'::text, now()) >= v_auction.ends_at THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.auction_dealer_eligibility ade
    WHERE ade.auction_id = p_auction_id AND ade.dealer_id = v_uid
      AND ade.status IN ('ELIGIBLE', 'VIEWED', 'BIDDED')
  ) THEN
    RAISE EXCEPTION 'Dealer is not eligible to bid on this auction';
  END IF;

  IF v_auction.current_highest_bid IS NULL THEN
    IF p_amount < v_auction.starting_bid THEN
      RAISE EXCEPTION 'Bid must be at least the starting bid of ₹%', v_auction.starting_bid;
    END IF;
  ELSE
    v_next_bid := v_auction.current_highest_bid + v_auction.minimum_increment;
    IF p_amount < v_next_bid THEN
      RAISE EXCEPTION 'Bid must be at least ₹% (current high ₹% + increment ₹%)',
        v_next_bid, v_auction.current_highest_bid, v_auction.minimum_increment;
    END IF;
  END IF;

  SELECT b.id, b.amount, b.dealer_id INTO v_prev_bid_id, v_prev_bid_amount, v_prev_dealer
  FROM public.auction_bids b
  WHERE b.auction_id = p_auction_id AND b.status = 'WINNING'
  LIMIT 1;

  INSERT INTO public.auction_bids (auction_id, dealer_id, amount, status, client_request_id)
  VALUES (p_auction_id, v_uid, p_amount, 'WINNING', p_client_request_id)
  RETURNING id INTO v_new_bid_id;

  IF v_prev_bid_id IS NOT NULL THEN
    UPDATE public.auction_bids SET status = 'OUTBID' WHERE id = v_prev_bid_id;
  END IF;

  -- Anti-sniping: bids landing inside the extension window extend the clock.
  v_new_ends_at := v_auction.ends_at;
  IF (v_auction.ends_at - timezone('utc'::text, now())) <= make_interval(secs => v_auction.extension_seconds)
     AND v_auction.extension_count < v_auction.max_extension_count THEN
    v_new_ends_at := v_auction.ends_at + make_interval(secs => v_auction.extension_seconds);
    v_extended := true;
  END IF;

  UPDATE public.auctions SET
    current_highest_bid = p_amount,
    winner_dealer_id = v_uid,
    winning_bid_id = v_new_bid_id,
    extension_count = CASE WHEN v_extended THEN v_auction.extension_count + 1 ELSE v_auction.extension_count END,
    ends_at = v_new_ends_at,
    status = CASE WHEN v_extended THEN 'EXTENDED' ELSE v_auction.status END,
    updated_at = now()
  WHERE id = p_auction_id;

  UPDATE public.auction_dealer_eligibility
  SET status = 'BIDDED', last_bid_at = now(), viewed_at = COALESCE(viewed_at, now())
  WHERE auction_id = p_auction_id AND dealer_id = v_uid;

  PERFORM public.automation_record_event('auction.bid_placed', 'auction_bids', v_new_bid_id::text,
    jsonb_build_object('auction_id', p_auction_id, 'bid_id', v_new_bid_id,
      'amount', p_amount, 'extended', v_extended));

  IF v_prev_bid_id IS NOT NULL AND v_prev_dealer IS DISTINCT FROM v_uid THEN
    PERFORM public.automation_record_event('auction.bid_outbid', 'auction_bids',
      v_prev_bid_id::text || ':' || v_new_bid_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'outbid_bid_id', v_prev_bid_id,
        'new_bid_id', v_new_bid_id, 'previous_amount', v_prev_bid_amount, 'new_amount', p_amount));
    PERFORM public.automation_notify(v_prev_dealer, 'You have been outbid',
      'A higher bid of ₹' || p_amount::text || ' was placed on the auction you were winning. Place a new bid to stay in the race.',
      'alert', jsonb_build_object('auction_id', p_auction_id, 'new_amount', p_amount));
  END IF;

  IF v_extended THEN
    PERFORM public.automation_record_event('auction.extended', 'auctions',
      p_auction_id::text || '#ext' || (v_auction.extension_count + 1)::text,
      jsonb_build_object('auction_id', p_auction_id,
        'extension_count', v_auction.extension_count + 1,
        'old_ends_at', v_auction.ends_at, 'new_ends_at', v_new_ends_at));
  END IF;

  PERFORM public.automation_audit('auction_bid_placed', 'auctions', p_auction_id::text,
    v_auction.status, CASE WHEN v_extended THEN 'EXTENDED' ELSE v_auction.status END, NULL,
    jsonb_build_object('bid_id', v_new_bid_id, 'amount', p_amount, 'extended', v_extended));

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'amount', p_amount,
    'new_highest_bid', p_amount,
    'new_end_time', v_new_ends_at,
    'auction_status', CASE WHEN v_extended THEN 'EXTENDED' ELSE v_auction.status END,
    'extended', v_extended
  );
END;
$$;

-- 6.3 Masked public bid history (amounts + timing, never dealer identity).
CREATE OR REPLACE FUNCTION public.auction_public_bid_history(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_auction public.auctions%ROWTYPE;
  v_result jsonb;
  v_rank integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;

  IF v_role IN ('Admin', 'Sales Associate', 'Inspector') THEN
    SELECT jsonb_agg(jsonb_build_object(
      'bid_id', b.id, 'amount', b.amount, 'status', b.status,
      'dealer_id', b.dealer_id, 'created_at', b.created_at)
      ORDER BY b.created_at DESC)
      INTO v_result FROM public.auction_bids b WHERE b.auction_id = p_auction_id;
  ELSIF v_role = 'Dealer' THEN
    -- Dealers see amounts and their own bid marker only.
    SELECT jsonb_agg(jsonb_build_object(
      'amount', b.amount, 'status', b.status, 'is_mine', (b.dealer_id = v_uid),
      'rank', (SELECT count(*) FROM public.auction_bids b2
               WHERE b2.auction_id = p_auction_id AND b2.amount >= b.amount),
      'created_at', b.created_at)
      ORDER BY b.created_at DESC)
      INTO v_result FROM public.auction_bids b WHERE b.auction_id = p_auction_id;
  ELSIF v_role = 'Seller' AND EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = v_auction.inspection_id AND i.seller_id = v_uid
  ) THEN
    -- Sellers see counts/amounts without identities too.
    SELECT jsonb_agg(jsonb_build_object(
      'amount', b.amount, 'status', b.status,
      'rank', (SELECT count(*) FROM public.auction_bids b2
               WHERE b2.auction_id = p_auction_id AND b2.amount >= b.amount),
      'created_at', b.created_at)
      ORDER BY b.created_at DESC)
      INTO v_result FROM public.auction_bids b WHERE b.auction_id = p_auction_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to view bid history';
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- 7. CLOSE FLOW + SELLER / ADMIN DECISION
-- ============================================================

-- 7.1 Close a finished auction. Returns the outcome key.
CREATE OR REPLACE FUNCTION public.auction_close_if_ended(p_auction_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_seller uuid;
  v_winner uuid;
  v_winning_bid uuid;
  v_amount integer;
  v_staff uuid;
  v_vehicle text;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_auction.status NOT IN ('LIVE', 'EXTENDED', 'CLOSING') THEN
    RETURN 'not_closable';
  END IF;

  IF v_auction.status IN ('LIVE', 'EXTENDED') THEN
    UPDATE public.auctions SET status = 'CLOSING', updated_at = now() WHERE id = p_auction_id;
    PERFORM public.automation_record_event('auction.closing', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'previous_status', v_auction.status));
    v_auction.status := 'CLOSING';
  END IF;

  SELECT i.seller_id, i.brand || ' ' || i.model
    INTO v_seller, v_vehicle
    FROM public.inspections i WHERE i.id = v_auction.inspection_id;

  IF v_auction.current_highest_bid IS NULL OR v_auction.winner_dealer_id IS NULL THEN
    -- No bids: expiry, vehicle returns to inventory.
    UPDATE public.auctions
    SET status = 'EXPIRED', closed_at = now(), ended_reason = 'no_bids', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'available', updated_at = now()
      WHERE id = v_auction.car_id AND status = 'bidding';
    END IF;
    PERFORM public.automation_record_event('auction.expired', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'reason', 'no_bids'));
    PERFORM public.automation_audit('auction_expired', 'auctions', p_auction_id::text,
      v_auction.status, 'EXPIRED', 'No bids placed before deadline');
    SELECT id INTO v_staff FROM public.profiles
      WHERE role::text = 'Admin' ORDER BY created_at ASC LIMIT 1;
    IF v_staff IS NOT NULL THEN
      PERFORM public.automation_notify(v_staff, 'Auction Expired',
        'Auction ended with no bids' || CASE WHEN v_vehicle IS NOT NULL THEN ' for ' || v_vehicle ELSE '' END || '. Vehicle returned to inventory.',
        'info', jsonb_build_object('auction_id', p_auction_id));
    END IF;
    RETURN 'expired';
  END IF;

  -- Has a winner: review stage.
  SELECT id, dealer_id, amount INTO v_winning_bid, v_winner, v_amount
  FROM public.auction_bids
  WHERE auction_id = p_auction_id AND status = 'WINNING' LIMIT 1;

  UPDATE public.auctions
  SET status = 'SELLER_REVIEW', closed_at = now(), ended_reason = 'time_elapsed', updated_at = now()
  WHERE id = p_auction_id;

  PERFORM public.automation_record_event('auction.closed', 'auctions', p_auction_id::text,
    jsonb_build_object('auction_id', p_auction_id, 'winner_amount', v_amount));
  PERFORM public.automation_record_event('auction.winner_selected', 'auctions',
    p_auction_id::text || ':winner',
    jsonb_build_object('auction_id', p_auction_id, 'amount', v_amount,
      'reserve_met', v_amount >= v_auction.reserve_price));
  PERFORM public.automation_record_event('auction.seller_review', 'auctions',
    p_auction_id::text || ':review',
    jsonb_build_object('auction_id', p_auction_id, 'winner_amount', v_amount,
      'reserve_met', v_amount >= v_auction.reserve_price));

  IF v_winner IS NOT NULL AND v_winner IS DISTINCT FROM v_seller THEN
    PERFORM public.automation_notify(v_winner, 'Auction Won',
      'Congratulations! You won the auction with the highest bid of ₹' || v_amount::text ||
      '. 1stCars will guide you through payment and transfer.',
      'success', jsonb_build_object('auction_id', p_auction_id, 'amount', v_amount));
  END IF;

  IF v_seller IS NOT NULL THEN
    PERFORM public.automation_notify(v_seller, 'Auction Result Ready',
      'Your vehicle auction ended with a highest bid of ₹' || v_amount::text ||
      (CASE WHEN v_auction.reserve_price > 0 AND v_amount >= v_auction.reserve_price
            THEN ' (reserve met). Review and accept or reject the result.'
            ELSE '. The reserve was not met. You may reject the result.'
       END),
      'action', jsonb_build_object('auction_id', p_auction_id, 'amount', v_amount,
        'reserve_price', v_auction.reserve_price, 'reserve_met', v_amount >= v_auction.reserve_price));
  END IF;

  -- Staff follow-up task: route the result to the seller.
  SELECT id INTO v_staff FROM public.profiles
    WHERE role::text IN ('Admin', 'Sales Associate')
    ORDER BY (role::text = 'Admin') DESC, created_at ASC LIMIT 1;
  IF v_staff IS NOT NULL THEN
    PERFORM public.automation_create_task(
      v_staff, 'auction_result_review',
      'Review auction result and follow up with seller',
      'Auction #' || p_auction_id::text || ' closed at ₹' || v_amount::text ||
      '. Get the seller to accept/reject, then route the winner to payment.',
      'high', timezone('utc'::text, now()) + interval '24 hours',
      'auctions', p_auction_id::text, 'auction_result_review:' || p_auction_id::text
    );
  END IF;

  PERFORM public.automation_audit('auction_closed', 'auctions', p_auction_id::text,
    v_auction.status, 'SELLER_REVIEW', 'Auction closed', jsonb_build_object('winner_amount', v_amount));
  RETURN 'review';
END;
$$;

-- 7.2 Admin manual close.
CREATE OR REPLACE FUNCTION public.auction_admin_close(
  p_auction_id uuid,
  p_reason text DEFAULT 'Closed by staff'
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  SELECT status INTO v_status FROM public.auctions WHERE id = p_auction_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_status IN ('LIVE', 'EXTENDED', 'CLOSING') THEN
    RETURN public.auction_close_if_ended(p_auction_id);
  ELSIF v_status IN ('DRAFT', 'READY', 'SCHEDULED') THEN
    RETURN 'cancelled';
  ELSE
    RAISE EXCEPTION 'Auction cannot be closed from status %', v_status;
  END IF;
END;
$$;

-- 7.3 Seller decision on the auction result.
CREATE OR REPLACE FUNCTION public.seller_auction_decision(
  p_auction_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_auction public.auctions%ROWTYPE;
  v_seller uuid;
  v_vehicle text;
  v_staff uuid;
  v_payment public.auction_payments;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.auction_require_role(ARRAY['Seller']) IS NULL THEN RETURN NULL; END IF;
  IF p_decision NOT IN ('ACCEPT', 'REJECT') THEN
    RAISE EXCEPTION 'Decision must be ACCEPT or REJECT';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  SELECT seller_id INTO v_seller FROM public.inspections WHERE id = v_auction.inspection_id;
  IF v_seller IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only decide on auctions for your own vehicles';
  END IF;
  IF v_auction.status <> 'SELLER_REVIEW' THEN
    RAISE EXCEPTION 'Auction is not awaiting a seller decision (status: %)', v_auction.status;
  END IF;

  SELECT i.brand || ' ' || i.model INTO v_vehicle FROM public.inspections i WHERE i.id = v_auction.inspection_id;

  IF p_decision = 'ACCEPT' THEN
    UPDATE public.auctions SET status = 'ACCEPTED', ended_reason = 'seller_accepted', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'sold', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;

    INSERT INTO public.auction_payments (auction_id, winner_dealer_id, bid_id, amount, status)
    VALUES (p_auction_id, v_auction.winner_dealer_id, v_auction.winning_bid_id, v_auction.current_highest_bid, 'PENDING')
    RETURNING * INTO v_payment;

    IF v_auction.winner_dealer_id IS NOT NULL THEN
      PERFORM public.automation_notify(v_auction.winner_dealer_id, 'Payment Required',
        'Seller accepted the auction result. Pay ₹' || v_auction.current_highest_bid::text ||
        ' to complete your purchase.',
        'action', jsonb_build_object('auction_id', p_auction_id, 'payment_id', v_payment.id,
          'amount', v_auction.current_highest_bid));
    END IF;

    SELECT id INTO v_staff FROM public.profiles
      WHERE role::text = 'Admin' ORDER BY created_at ASC LIMIT 1;
    IF v_staff IS NOT NULL THEN
      PERFORM public.automation_create_task(
        v_staff, 'dealer_payment',
        'Collect dealer payment for auction #' || p_auction_id::text,
        'Collect ₹' || v_auction.current_highest_bid::text || ' from the winning dealer, then initiate vehicle transfer.',
        'urgent', timezone('utc'::text, now()) + interval '48 hours',
        'auctions', p_auction_id::text, 'dealer_payment:' || p_auction_id::text
      );
      PERFORM public.automation_notify(v_staff, 'Dealer Payment Task Created',
        'Collect ₹' || v_auction.current_highest_bid::text || ' for auction #' || p_auction_id::text || '.',
        'action', jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
    END IF;

    PERFORM public.automation_record_event('auction.seller_accepted', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
    PERFORM public.automation_record_event('auction.vehicle_sold', 'auctions', p_auction_id::text || ':sold',
      jsonb_build_object('auction_id', p_auction_id, 'car_id', v_auction.car_id,
        'amount', v_auction.current_highest_bid, 'winner_dealer_id', v_auction.winner_dealer_id));
    PERFORM public.automation_audit('auction_seller_accepted', 'auctions', p_auction_id::text,
      'SELLER_REVIEW', 'ACCEPTED', p_reason, jsonb_build_object('amount', v_auction.current_highest_bid));
  ELSE
    UPDATE public.auctions SET status = 'REJECTED', ended_reason = 'seller_rejected', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'available', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;
    IF v_auction.winner_dealer_id IS NOT NULL AND v_auction.winner_dealer_id IS DISTINCT FROM v_uid THEN
      PERFORM public.automation_notify(v_auction.winner_dealer_id, 'Auction Result Rejected',
        'The seller did not accept the auction result for the vehicle you won. Your winning bid has been released.',
        'info', jsonb_build_object('auction_id', p_auction_id));
    END IF;
    PERFORM public.automation_record_event('auction.seller_rejected', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason));
    PERFORM public.automation_audit('auction_seller_rejected', 'auctions', p_auction_id::text,
      'SELLER_REVIEW', 'REJECTED', p_reason);
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  RETURN v_auction;
END;
$$;

-- 7.4 Admin override decision (used when the seller is unreachable).
CREATE OR REPLACE FUNCTION public.auction_admin_decision(
  p_auction_id uuid,
  p_decision text,
  p_reason text DEFAULT 'Admin override'
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions%ROWTYPE;
  v_seller uuid;
  v_payment public.auction_payments;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  IF p_decision NOT IN ('ACCEPT', 'REJECT') THEN
    RAISE EXCEPTION 'Decision must be ACCEPT or REJECT';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_auction.status NOT IN ('SELLER_REVIEW', 'CLOSED') THEN
    RAISE EXCEPTION 'Auction is not awaiting a decision (status: %)', v_auction.status;
  END IF;
  SELECT seller_id INTO v_seller FROM public.inspections WHERE id = v_auction.inspection_id;

  IF p_decision = 'ACCEPT' THEN
    UPDATE public.auctions SET status = 'ACCEPTED', ended_reason = 'admin_accepted', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'sold', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;
    INSERT INTO public.auction_payments (auction_id, winner_dealer_id, bid_id, amount, status)
    VALUES (p_auction_id, v_auction.winner_dealer_id, v_auction.winning_bid_id, v_auction.current_highest_bid, 'PENDING')
    ON CONFLICT (auction_id) DO NOTHING
    RETURNING * INTO v_payment;
    IF v_auction.winner_dealer_id IS NOT NULL THEN
      PERFORM public.automation_notify(v_auction.winner_dealer_id, 'Auction Accepted — Payment Required',
        'Auction result accepted. Pay ₹' || v_auction.current_highest_bid::text || ' to complete your purchase.',
        'action', jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
    END IF;
    PERFORM public.automation_record_event('auction.admin_accepted', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
  ELSE
    UPDATE public.auctions SET status = 'REJECTED', ended_reason = 'admin_rejected', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'available', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;
    PERFORM public.automation_record_event('auction.admin_rejected', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason));
  END IF;

  PERFORM public.automation_audit('auction_admin_decision', 'auctions', p_auction_id::text,
    v_auction.status, CASE WHEN p_decision = 'ACCEPT' THEN 'ACCEPTED' ELSE 'REJECTED' END, p_reason);
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  RETURN v_auction;
END;
$$;

-- ============================================================
-- 8. MAINTENANCE (auto-start + auto-close; safe to run via pg_cron
--    or the in-app poller — no auth context required).
-- ============================================================

CREATE OR REPLACE FUNCTION public.auction_run_maintenance()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_started integer := 0;
  v_closed integer := 0;
  v_auction public.auctions%ROWTYPE;
BEGIN
  -- Auto-start scheduled auctions.
  FOR v_auction IN
    SELECT * FROM public.auctions
    WHERE status = 'SCHEDULED' AND starts_at <= timezone('utc'::text, now())
    FOR UPDATE
  LOOP
    UPDATE public.auctions SET status = 'LIVE', updated_at = now() WHERE id = v_auction.id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'bidding', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('available', 'listed');
    END IF;
    PERFORM public.automation_record_event('auction.started', 'auctions', v_auction.id::text,
      jsonb_build_object('auction_id', v_auction.id, 'source', 'auto_start'));
    v_started := v_started + 1;
  END LOOP;

  -- Auto-close ended auctions.
  FOR v_auction IN
    SELECT * FROM public.auctions
    WHERE status IN ('LIVE', 'EXTENDED', 'CLOSING') AND ends_at <= timezone('utc'::text, now())
    FOR UPDATE
  LOOP
    PERFORM public.auction_close_if_ended(v_auction.id);
    v_closed := v_closed + 1;
  END LOOP;

  RETURN jsonb_build_object('started', v_started, 'closed', v_closed);
END;
$$;

-- ============================================================
-- 9. GRANTS
-- ============================================================

GRANT SELECT ON public.auction_status_flow TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auctions, public.auction_bids,
  public.auction_dealer_eligibility, public.auction_payments TO authenticated;

GRANT EXECUTE ON FUNCTION public.auction_create_auction(uuid, uuid, integer, integer, integer, timestamptz, timestamptz, integer, integer, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_publish_auction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_schedule_auction(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_start_auction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_set_eligible_dealers(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_disqualify_dealer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_cancel_auction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_admin_close(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_admin_decision(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_mark_viewed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_public_bid_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_auction_decision(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_run_maintenance() TO authenticated;

-- ============================================================
-- 10. REALTIME PUBLICATION
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_dealer_eligibility;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMIT;
