-- ============================================================
-- SEA-POS: Auto-generate SKU from category prefix (008)
-- - Categories get an optional `sku_prefix` (e.g. "DRK")
-- - Function next_sku_for_category atomically returns the next
--   SKU for that prefix: DRK-0001, DRK-0002, ...
-- Safe to run multiple times.
-- ============================================================

-- ── Add sku_prefix to categories ──────────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS sku_prefix TEXT;

-- Seed demo categories with sensible prefixes (only if NULL)
UPDATE categories SET sku_prefix = 'DRK' WHERE name = 'เครื่องดื่ม' AND sku_prefix IS NULL;
UPDATE categories SET sku_prefix = 'FOD' WHERE name = 'อาหาร'      AND sku_prefix IS NULL;
UPDATE categories SET sku_prefix = 'FRS' WHERE name = 'ของสด'      AND sku_prefix IS NULL;
UPDATE categories SET sku_prefix = 'HSH' WHERE name = 'ของใช้'     AND sku_prefix IS NULL;
UPDATE categories SET sku_prefix = 'SNK' WHERE name = 'ขนม'        AND sku_prefix IS NULL;

-- ── SECURITY DEFINER: atomic next-SKU generator ───────────────
-- Uses advisory lock keyed on the prefix so concurrent inserts
-- from different categories don't block each other.
CREATE OR REPLACE FUNCTION next_sku_for_category(p_category_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_prefix TEXT;
  v_next   INTEGER;
BEGIN
  SELECT sku_prefix INTO v_prefix
  FROM public.categories
  WHERE id = p_category_id;

  IF v_prefix IS NULL OR v_prefix = '' THEN
    RETURN NULL; -- caller decides fallback
  END IF;

  -- Lock on the prefix so concurrent allocations serialize
  PERFORM pg_advisory_xact_lock(hashtext(v_prefix));

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(sku, '^' || v_prefix || '-', ''), '')::INTEGER
  ), 0) + 1
  INTO v_next
  FROM public.products
  WHERE sku ~ ('^' || v_prefix || '-\d+$');

  RETURN v_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION next_sku_for_category(UUID) TO authenticated;
