-- ─── Migration 028: Customer Membership & Loyalty ───────────────────────────
-- Tables: membership_settings, membership_tiers, members, member_tree, member_points_log
-- Closure table pattern for MLM tree — O(1) ancestor/descendant queries.
-- Safe to re-run (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ─── 1. membership_settings (singleton per company) ─────────────────────────

CREATE TABLE IF NOT EXISTS membership_settings (
  company_id          UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  points_per_baht     NUMERIC(10,4) NOT NULL DEFAULT 1.0,   -- ฿1 = 1 pt
  baht_per_point      NUMERIC(10,4) NOT NULL DEFAULT 0.10,  -- 100 pts = ฿10
  max_redeem_pct      NUMERIC(5,2)  NOT NULL DEFAULT 20.0,  -- cap: 20% of bill
  points_expiry_days  INT,                                   -- NULL = never
  mlm_enabled         BOOLEAN NOT NULL DEFAULT false,
  mlm_levels          JSONB   NOT NULL DEFAULT '[]',
  -- e.g. [{"level":1,"rate_pct":5},{"level":2,"rate_pct":2},{"level":3,"rate_pct":1}]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE membership_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_settings_tenant" ON membership_settings;
CREATE POLICY "membership_settings_tenant" ON membership_settings
  FOR ALL TO authenticated
  USING (
    company_id = get_current_company_id()
    OR is_platform_admin()
  )
  WITH CHECK (
    company_id = get_current_company_id()
    OR is_platform_admin()
  );


-- ─── 2. membership_tiers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS membership_tiers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  color             TEXT NOT NULL DEFAULT '#6366f1',
  min_spend_baht    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  points_multiplier NUMERIC(5,2)  NOT NULL DEFAULT 1.0,
  sort_order        INT  NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);

ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_tiers_tenant" ON membership_tiers;
CREATE POLICY "membership_tiers_tenant" ON membership_tiers
  FOR ALL TO authenticated
  USING (
    company_id = get_current_company_id()
    OR is_platform_admin()
  )
  WITH CHECK (
    company_id = get_current_company_id()
    OR is_platform_admin()
  );


-- ─── 3. members ──────────────────────────────────────────────────────────────
-- Members are first-class entities — not derived from customers.
-- Walk-in sales simply have no member_id attached.

CREATE TABLE IF NOT EXISTS members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
                        DEFAULT get_current_company_id(),
  member_no             TEXT NOT NULL,
  name                  TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  address               TEXT,
  tier_id               UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,
  points_balance        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  total_spend_baht      NUMERIC(12,2) NOT NULL DEFAULT 0,
  referred_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  enrolled_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, member_no),
  UNIQUE (company_id, phone)   -- phone is the natural lookup key at POS
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_tenant" ON members;
CREATE POLICY "members_tenant" ON members
  FOR ALL TO authenticated
  USING (
    company_id = get_current_company_id()
    OR is_platform_admin()
  )
  WITH CHECK (
    company_id = get_current_company_id()
    OR is_platform_admin()
  );


-- ─── 4. member_tree (closure table) ──────────────────────────────────────────
-- Stores every ancestor–descendant pair at every depth.
-- depth 0 = self, 1 = direct referrer, 2 = referrer's referrer, …
-- Populated/maintained by trigger — never insert/update directly.

CREATE TABLE IF NOT EXISTS member_tree (
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ancestor_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  descendant_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  depth         INT  NOT NULL CHECK (depth >= 0),
  PRIMARY KEY (ancestor_id, descendant_id)
);

ALTER TABLE member_tree ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_tree_tenant_read" ON member_tree;
CREATE POLICY "member_tree_tenant_read" ON member_tree
  FOR SELECT TO authenticated
  USING (company_id = get_current_company_id() OR is_platform_admin());

-- Only the trigger (SECURITY DEFINER) writes to this table.
-- Grant nothing else to authenticated users.


-- ─── 5. member_points_log (full ledger — immutable) ─────────────────────────

CREATE TABLE IF NOT EXISTS member_points_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
                   DEFAULT get_current_company_id(),
  member_id        UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('earn','redeem','expire','commission','adjust')),
  points           NUMERIC(12,2) NOT NULL,   -- positive = credit, negative = debit
  balance_after    NUMERIC(12,2) NOT NULL,
  sale_id          UUID REFERENCES sales(id) ON DELETE SET NULL,
  source_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_points_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_points_log_tenant" ON member_points_log;
CREATE POLICY "member_points_log_tenant" ON member_points_log
  FOR SELECT TO authenticated
  USING (company_id = get_current_company_id() OR is_platform_admin());


-- ─── 6. Indexes ───────────────────────────────────────────────────────────────

-- members: primary lookup at POS is phone; secondary is member_no
CREATE INDEX IF NOT EXISTS idx_members_company_id  ON members (company_id);
CREATE INDEX IF NOT EXISTS idx_members_phone       ON members (company_id, phone);
CREATE INDEX IF NOT EXISTS idx_members_tier_id     ON members (tier_id);

-- member_tree: two critical query shapes
--   "all uplines of X"   → WHERE descendant_id = X AND depth > 0
--   "all downlines of X" → WHERE ancestor_id   = X AND depth > 0
CREATE INDEX IF NOT EXISTS idx_member_tree_descendant ON member_tree (descendant_id, depth);
CREATE INDEX IF NOT EXISTS idx_member_tree_ancestor   ON member_tree (ancestor_id, depth);

-- points log: history per member
CREATE INDEX IF NOT EXISTS idx_member_points_log_member ON member_points_log (member_id, created_at DESC);


-- ─── 7. member_no auto-generation ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION next_member_no(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INT;
BEGIN
  -- Advisory lock prevents concurrent INSERT from getting the same number.
  PERFORM pg_advisory_xact_lock(abs(hashtext(p_company_id::text || '_member_no')));

  SELECT COALESCE(MAX(
    CASE WHEN member_no ~ '^M[0-9]+$'
    THEN CAST(SUBSTRING(member_no FROM 2) AS INT)
    ELSE 0 END
  ), 0) + 1
  INTO v_next
  FROM members
  WHERE company_id = p_company_id;

  RETURN 'M' || LPAD(v_next::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION next_member_no(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION trg_set_member_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.member_no IS NULL OR NEW.member_no = '' THEN
    NEW.member_no := next_member_no(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_set_no ON members;
CREATE TRIGGER trg_members_set_no
BEFORE INSERT ON members
FOR EACH ROW EXECUTE FUNCTION trg_set_member_no();


-- ─── 8. Closure table trigger ─────────────────────────────────────────────────
-- Fires AFTER INSERT on members.
-- Inserts the self-row (depth 0) plus one row for each ancestor of the referrer.

CREATE OR REPLACE FUNCTION trg_insert_member_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Self row
  INSERT INTO member_tree (company_id, ancestor_id, descendant_id, depth)
  VALUES (NEW.company_id, NEW.id, NEW.id, 0);

  -- All ancestors of the referrer, each shifted one level deeper
  IF NEW.referred_by_member_id IS NOT NULL THEN
    INSERT INTO member_tree (company_id, ancestor_id, descendant_id, depth)
    SELECT NEW.company_id, ancestor_id, NEW.id, depth + 1
    FROM   member_tree
    WHERE  descendant_id = NEW.referred_by_member_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_insert_tree ON members;
CREATE TRIGGER trg_members_insert_tree
AFTER INSERT ON members
FOR EACH ROW EXECUTE FUNCTION trg_insert_member_tree();


-- ─── 9. updated_at on membership_settings ────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_membership_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_membership_settings_touch ON membership_settings;
CREATE TRIGGER trg_membership_settings_touch
BEFORE UPDATE ON membership_settings
FOR EACH ROW EXECUTE FUNCTION trg_membership_settings_updated_at();


-- ─── 10. Seed default membership_settings for existing companies ──────────────

INSERT INTO membership_settings (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;
