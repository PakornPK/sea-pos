-- ============================================================
-- SEA-POS: Platform Billing & Subscriptions (024)
--
-- Adds the full platform billing layer:
--   1. companies — billing contact columns (tax_id, address, etc.)
--   2. platform_settings — singleton: seller info, VAT toggle, bank details
--   3. subscriptions — one per company; tracks billing cycle + status
--   4. subscription_payments — manual payment records by platform admin
--   5. platform_invoices — Thai ใบกำกับภาษีเต็มรูปแบบ with frozen snapshots
--   6. next_invoice_no() — INV-YYYY-NNNN sequential number generator
--
-- Subscription status flow:
--   trialing → active → past_due → suspended → (cancelled | active)
--
-- Safe to run multiple times.
-- ============================================================

-- ─── 1. Billing columns on companies ─────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tax_id         TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS contact_email  TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone  TEXT;

COMMENT ON COLUMN companies.tax_id        IS 'Thai company tax ID (เลขประจำตัวผู้เสียภาษี) — 13 digits';
COMMENT ON COLUMN companies.address       IS 'Official registered address for invoices';
COMMENT ON COLUMN companies.contact_email IS 'Primary billing contact email';
COMMENT ON COLUMN companies.contact_phone IS 'Primary billing contact phone';

-- ─── 2. platform_settings (singleton) ────────────────────────
-- code = 'default' always; no second row should exist.
CREATE TABLE IF NOT EXISTS platform_settings (
  code                TEXT PRIMARY KEY DEFAULT 'default' CHECK (code = 'default'),

  -- Seller identity (printed on all platform invoices)
  seller_name         TEXT NOT NULL DEFAULT 'SEA-POS Co., Ltd.',
  seller_tax_id       TEXT,
  seller_address      TEXT,
  seller_phone        TEXT,
  seller_email        TEXT,

  -- VAT configuration for platform billing
  vat_enabled         BOOLEAN NOT NULL DEFAULT true,
  vat_rate_pct        NUMERIC(5,2) NOT NULL DEFAULT 7.00,

  -- Payment / banking info shown on invoices
  bank_name           TEXT,
  bank_account_name   TEXT,
  bank_account_no     TEXT,
  promptpay_id        TEXT,       -- phone or tax-ID registered with PromptPay

  -- Invoice numbering: prefix + last used sequence per year
  invoice_prefix      TEXT NOT NULL DEFAULT 'INV',
  invoice_year        INTEGER,    -- year of the last issued invoice
  invoice_seq         INTEGER NOT NULL DEFAULT 0,  -- last used seq within that year

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE platform_settings IS 'Singleton row (code=default) — SEA-POS seller info, VAT, banking for platform invoices.';

-- Seed with defaults so the row always exists.
INSERT INTO platform_settings (code) VALUES ('default') ON CONFLICT (code) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_select" ON platform_settings;
CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT
  TO authenticated USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_settings_update" ON platform_settings;
CREATE POLICY "platform_settings_update" ON platform_settings FOR UPDATE
  TO authenticated USING (is_platform_admin());

-- ─── 3. subscriptions ────────────────────────────────────────
-- One subscription per company at a time.
-- Platform admin creates/resets manually; no automated Stripe-style engine yet.
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_code       TEXT NOT NULL REFERENCES plans(code) ON UPDATE CASCADE,

  -- Billing cycle
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  due_date        TIMESTAMPTZ GENERATED ALWAYS AS (current_period_end) STORED,

  -- Status lifecycle: trialing | active | past_due | suspended | cancelled
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing','active','past_due','suspended','cancelled')),

  -- Overdue tracking — incremented by the monthly cron job
  overdue_months  SMALLINT NOT NULL DEFAULT 0,

  -- Free-form notes by platform admin
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE subscriptions IS 'One subscription per company. Status managed by platform admin + monthly cron.';

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_company_active_idx
  ON subscriptions(company_id)
  WHERE status NOT IN ('cancelled');

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT
  TO authenticated
  USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "subscriptions_insert" ON subscriptions;
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "subscriptions_update" ON subscriptions;
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE
  TO authenticated USING (is_platform_admin());

DROP POLICY IF EXISTS "subscriptions_delete" ON subscriptions;
CREATE POLICY "subscriptions_delete" ON subscriptions FOR DELETE
  TO authenticated USING (is_platform_admin());

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION subscriptions_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS subscriptions_touch_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_touch_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION subscriptions_touch_updated_at();

-- ─── 4. subscription_payments ────────────────────────────────
-- Each row = one manual payment recorded by a platform admin.
CREATE TABLE IF NOT EXISTS subscription_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Payment details
  amount_baht     NUMERIC(12,2) NOT NULL,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method          TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (method IN ('bank_transfer','promptpay','cash','other')),
  reference_no    TEXT,       -- slip / ref from bank
  note            TEXT,

  -- Which period this payment covers
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,

  -- Who recorded it
  recorded_by     UUID REFERENCES auth.users(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE subscription_payments IS 'Manual payment log recorded by platform admins.';

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_payments_select" ON subscription_payments;
CREATE POLICY "sub_payments_select" ON subscription_payments FOR SELECT
  TO authenticated USING (is_platform_admin());

DROP POLICY IF EXISTS "sub_payments_insert" ON subscription_payments;
CREATE POLICY "sub_payments_insert" ON subscription_payments FOR INSERT
  TO authenticated WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "sub_payments_delete" ON subscription_payments;
CREATE POLICY "sub_payments_delete" ON subscription_payments FOR DELETE
  TO authenticated USING (is_platform_admin());

-- ─── 5. next_invoice_no() ─────────────────────────────────────
-- Atomically bumps the counter and returns the next invoice number.
-- Format: {prefix}-{YYYY}-{NNNN}  e.g. INV-2026-0001
-- Runs SECURITY DEFINER so it can UPDATE platform_settings.
CREATE OR REPLACE FUNCTION next_invoice_no()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_year    INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_prefix  TEXT;
  v_seq     INTEGER;
BEGIN
  -- Reset seq at year boundary; otherwise just bump.
  UPDATE public.platform_settings
  SET
    invoice_year = v_year,
    invoice_seq  = CASE WHEN invoice_year = v_year THEN invoice_seq + 1 ELSE 1 END,
    updated_at   = NOW()
  WHERE code = 'default'
  RETURNING invoice_prefix, invoice_seq INTO v_prefix, v_seq;

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION next_invoice_no() TO authenticated;

-- ─── 6. platform_invoices ─────────────────────────────────────
-- Full ใบกำกับภาษีเต็มรูปแบบ.  All seller/buyer info is FROZEN at
-- issue time — never recalculate from live records.
CREATE TABLE IF NOT EXISTS platform_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      TEXT UNIQUE NOT NULL DEFAULT next_invoice_no(),

  -- Links
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_id      UUID REFERENCES subscription_payments(id) ON DELETE SET NULL,

  -- Issue metadata
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at          TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','void')),

  -- Seller snapshot (from platform_settings at issue time)
  seller_name     TEXT NOT NULL,
  seller_tax_id   TEXT,
  seller_address  TEXT,
  seller_phone    TEXT,
  seller_email    TEXT,

  -- Buyer snapshot (from companies at issue time)
  buyer_name      TEXT NOT NULL,
  buyer_tax_id    TEXT,
  buyer_address   TEXT,
  buyer_contact_email TEXT,
  buyer_contact_phone TEXT,

  -- Line items stored as JSONB array:
  -- [{ description, qty, unit_price_baht, amount_baht }]
  lines           JSONB NOT NULL DEFAULT '[]',

  -- Amounts
  subtotal_baht   NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,   -- 0 if VAT exempt
  vat_baht        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_baht      NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Notes / void reason
  notes           TEXT,
  void_reason     TEXT,
  voided_at       TIMESTAMPTZ,
  voided_by       UUID REFERENCES auth.users(id),

  -- Who issued it
  issued_by       UUID REFERENCES auth.users(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE platform_invoices IS 'Thai tax invoices for platform subscriptions. All fields frozen at issue time.';

CREATE INDEX IF NOT EXISTS platform_invoices_company_idx ON platform_invoices(company_id);
CREATE INDEX IF NOT EXISTS platform_invoices_issued_at_idx ON platform_invoices(issued_at DESC);

ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;

-- Platform admin: full access
DROP POLICY IF EXISTS "invoices_select" ON platform_invoices;
CREATE POLICY "invoices_select" ON platform_invoices FOR SELECT
  TO authenticated USING (is_platform_admin());

DROP POLICY IF EXISTS "invoices_insert" ON platform_invoices;
CREATE POLICY "invoices_insert" ON platform_invoices FOR INSERT
  TO authenticated WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "invoices_update" ON platform_invoices;
CREATE POLICY "invoices_update" ON platform_invoices FOR UPDATE
  TO authenticated USING (is_platform_admin());

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION invoices_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS invoices_touch_updated_at ON platform_invoices;
CREATE TRIGGER invoices_touch_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_touch_updated_at();

-- ─── 7. Seed subscriptions for existing companies ─────────────
-- Give every existing active company an 'active' subscription on their
-- current plan so the billing dashboard isn't empty.
INSERT INTO subscriptions (company_id, plan_code, status)
SELECT id, plan, 'active'
FROM companies
WHERE status = 'active'
ON CONFLICT DO NOTHING;
