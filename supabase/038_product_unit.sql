-- Add unit of measure to products.
-- Stored as free text (ชิ้น, กก., ลิตร, etc.) with a sensible default.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'ชิ้น';
