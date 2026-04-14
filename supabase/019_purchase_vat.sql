-- ============================================================
-- SEA-POS: Purchase VAT (019)
--
-- Mirrors migration 018 on the purchase side. Adds VAT breakdown columns
-- to `purchase_orders` so that the input VAT (ภาษีซื้อ) can be reported
-- alongside output VAT (ภาษีขาย) for a complete ภ.พ.30 view.
--
-- Semantics (same as sales):
--   total_amount     — gross (what is paid to the supplier)
--   subtotal_ex_vat  — net portion (pre-VAT base)
--   vat_amount       — VAT portion claimable as input VAT
--
-- For mode='none' or fully vat-exempt POs: vat_amount=0, subtotal_ex_vat=total_amount.
-- Historical rows are backfilled with vat_amount=0 / subtotal_ex_vat=total_amount so
-- the VAT report stays consistent without retroactively inventing tax.
--
-- Safe to run multiple times.
-- ============================================================

BEGIN;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vat_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_ex_vat NUMERIC(12, 2);

-- Backfill: treat existing POs as if no VAT was recorded.
UPDATE purchase_orders
SET    subtotal_ex_vat = total_amount
WHERE  subtotal_ex_vat IS NULL;

ALTER TABLE purchase_orders
  ALTER COLUMN subtotal_ex_vat SET NOT NULL,
  ALTER COLUMN subtotal_ex_vat SET DEFAULT 0;

COMMENT ON COLUMN purchase_orders.vat_amount IS
  'Input VAT (ภาษีซื้อ) — the VAT portion of this purchase that the company can claim back on ภ.พ.30.';
COMMENT ON COLUMN purchase_orders.subtotal_ex_vat IS
  'Net (pre-VAT) total. For mode=none or fully exempt POs this equals total_amount.';

COMMIT;
