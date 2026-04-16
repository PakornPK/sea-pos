-- ============================================================
-- SEA-POS: Payment receipt attachment (025)
--
-- Adds receipt_path to subscription_payments so platform admins
-- can attach a bank-transfer slip / proof of payment.
-- The file lives in the private `receipts` storage bucket at
-- path: {company_id}/payments/{filename}
-- ============================================================

ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS receipt_path TEXT;

COMMENT ON COLUMN subscription_payments.receipt_path
  IS 'Storage path in the private receipts bucket. Generate a signed URL to serve it.';
