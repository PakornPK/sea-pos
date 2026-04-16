-- ─── Migration 029: Link sales to members ───────────────────────────────────
-- Adds member_id + redemption tracking to sales.
-- Walk-in sales keep member_id NULL — no schema change required for them.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS member_id            UUID REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeem_points_used   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS member_discount_baht NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sales_member_id ON sales (member_id);
