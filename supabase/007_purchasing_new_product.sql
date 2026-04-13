-- ============================================================
-- SEA-POS: Allow purchasing role to create products (007)
-- Purchasing staff often catalog brand-new SKUs while placing
-- the first PO that introduces them.
-- Safe to run multiple times.
-- ============================================================

DROP POLICY IF EXISTS "products_insert" ON products;

CREATE POLICY "products_insert" ON products FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'purchasing'));
