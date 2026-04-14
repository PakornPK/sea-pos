-- ============================================================
-- SEA-POS: Product barcodes (020)
--
-- Adds a dedicated `barcode` column on products, separate from `sku`. SKU is
-- our internal identifier ("WAT-600"); barcode is what the scanner reads off
-- the packaging (usually EAN-13 / UPC-A / Code-128). They're independent:
-- the same SKU might map to several barcodes (repack), and a barcode is a
-- global identifier assigned by GS1.
--
-- Scan lookup order in the POS: barcode match first, SKU fallback.
--
-- Safe to run multiple times.
-- ============================================================

BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode TEXT;

COMMENT ON COLUMN products.barcode IS
  'Scannable barcode (EAN-13 / UPC-A / Code-128). Independent of sku.';

-- Prevent duplicate barcodes within a tenant. Partial unique index so
-- products without a barcode (NULL) are free to collide.
CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_company_unique
  ON products (company_id, barcode)
  WHERE barcode IS NOT NULL;

COMMIT;
