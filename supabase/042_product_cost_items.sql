-- ============================================================
-- 042_product_cost_items.sql
-- Bill-of-materials (BOM) cost structure per product.
-- Each row = one cost component (cup, water, beans, etc.)
-- products.cost is updated to the BOM total by the application
-- layer whenever items change.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_cost_items (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid          NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  product_id        uuid          NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  name              text          NOT NULL,
  quantity          numeric(12,3) NOT NULL DEFAULT 1,
  unit_cost         numeric(12,2) NOT NULL DEFAULT 0,
  linked_product_id uuid          REFERENCES products(id) ON DELETE SET NULL,
  sort_order        integer       NOT NULL DEFAULT 0,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE product_cost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage cost items"
  ON product_cost_items FOR ALL
  USING  (company_id = get_current_company_id())
  WITH CHECK (company_id = get_current_company_id());

CREATE INDEX IF NOT EXISTS product_cost_items_product_id_idx
  ON product_cost_items (product_id);
