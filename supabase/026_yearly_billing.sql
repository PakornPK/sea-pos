-- ============================================================
-- SEA-POS: Yearly billing cycle (026)
--
-- Plans gain an optional yearly price (typically discounted).
-- Subscriptions track which cycle the company is on.
-- ============================================================

-- ─── 1. plans — add yearly price ─────────────────────────────
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS yearly_price_baht NUMERIC(12,2);

COMMENT ON COLUMN plans.yearly_price_baht
  IS 'Annual price billed up-front. NULL = yearly plan not available for this tier.';

-- ─── 2. subscriptions — add billing cycle ────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

COMMENT ON COLUMN subscriptions.billing_cycle
  IS 'monthly = billed every month, yearly = billed once per year up-front.';

-- ─── 3. Seed yearly prices for existing plans ────────────────
-- Roughly 2 months free (16.7% discount) for annual commit.
UPDATE plans SET yearly_price_baht = ROUND(monthly_price_baht * 10, 2)
WHERE monthly_price_baht IS NOT NULL AND monthly_price_baht > 0
  AND yearly_price_baht IS NULL;
