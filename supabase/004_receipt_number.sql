-- ============================================================
-- SEA-POS: Sequential receipt numbers
-- Run in Supabase SQL Editor
-- ============================================================

-- Create a dedicated sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Add receipt_no column (auto-filled by sequence on every new sale)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS receipt_no INTEGER UNIQUE DEFAULT nextval('receipt_number_seq');

-- Back-fill any existing sales that have NULL (safe to run multiple times)
UPDATE sales
SET receipt_no = nextval('receipt_number_seq')
WHERE receipt_no IS NULL;
