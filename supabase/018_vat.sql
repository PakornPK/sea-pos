-- ============================================================
-- SEA-POS: VAT configuration (018)
--
-- Three-level model:
--   Company (companies.settings JSONB):
--     vat_mode: 'none' | 'included' | 'excluded' (default 'none')
--     vat_rate: number                           (default 7)
--   Category / Product:
--     vat_exempt BOOLEAN                          (overrides company — ยกเว้น VAT)
--
-- Sale-time stored breakdown:
--   sales.subtotal_ex_vat — net (base) amount
--   sales.vat_amount      — VAT portion
--   sales.total_amount    — gross total (unchanged, now = subtotal_ex_vat + vat_amount)
--
-- Historical rows get vat_amount=0 / subtotal_ex_vat=total_amount so reports
-- keep working.
--
-- Safe to run multiple times.
-- ============================================================

BEGIN;

-- ── Category / Product VAT exemption ─────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN categories.vat_exempt IS
  'When true, sales of products in this category contribute no VAT (applies to every product unless the product has its own vat_exempt override).';
COMMENT ON COLUMN products.vat_exempt IS
  'Per-product override; TRUE forces the item to be VAT-exempt regardless of category.';

-- ── Sale breakdown columns ───────────────────────────────────
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS vat_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_ex_vat  NUMERIC(12, 2);

-- Backfill historical rows: treat them as pre-VAT (total_amount is both gross
-- and net). Safe because vat_amount defaults to 0.
UPDATE sales
SET    subtotal_ex_vat = total_amount
WHERE  subtotal_ex_vat IS NULL;

ALTER TABLE sales
  ALTER COLUMN subtotal_ex_vat SET NOT NULL,
  ALTER COLUMN subtotal_ex_vat SET DEFAULT 0;

COMMENT ON COLUMN sales.vat_amount IS
  'VAT portion of this sale, computed at checkout from the company''s vat_mode/vat_rate and per-item vat_exempt flags.';
COMMENT ON COLUMN sales.subtotal_ex_vat IS
  'Net (pre-VAT) total. For mode=none or fully exempt baskets this equals total_amount.';

COMMIT;
