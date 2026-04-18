-- ============================================================
-- Product Options / Modifiers
-- e.g., coffee bean, sugar level, temperature
-- ============================================================

-- ── Option groups (e.g., "เมล็ดกาแฟ", "ความหวาน", "อุณหภูมิ") ──
CREATE TABLE IF NOT EXISTS option_groups (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  product_id   uuid        NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  name         text        NOT NULL,
  required     boolean     NOT NULL DEFAULT true,
  multi_select boolean     NOT NULL DEFAULT false,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Options within a group (e.g., "Arabica", "ไม่หวาน", "ร้อน") ──
CREATE TABLE IF NOT EXISTS options (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid        NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  price_delta  numeric(12,2) NOT NULL DEFAULT 0,
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Snapshot of selected options per sale item ──────────────
CREATE TABLE IF NOT EXISTS sale_item_options (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id  uuid        NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  option_id     uuid        REFERENCES options(id) ON DELETE SET NULL,
  group_name    text        NOT NULL,
  option_name   text        NOT NULL,
  price_delta   numeric(12,2) NOT NULL DEFAULT 0
);

-- ── has_options flag on products (kept in sync by trigger) ──
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_options boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION sync_product_has_options()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE products
    SET has_options = EXISTS (
      SELECT 1 FROM option_groups WHERE product_id = OLD.product_id
    )
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    UPDATE products SET has_options = true WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_has_options ON option_groups;
CREATE TRIGGER trg_sync_product_has_options
  AFTER INSERT OR DELETE ON option_groups
  FOR EACH ROW EXECUTE FUNCTION sync_product_has_options();

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS option_groups_product_id_idx ON option_groups (product_id);
CREATE INDEX IF NOT EXISTS options_group_id_idx         ON options (group_id);
CREATE INDEX IF NOT EXISTS sale_item_options_item_id_idx ON sale_item_options (sale_item_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE option_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE options            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item_options  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members: option_groups"
  ON option_groups FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "company members: options"
  ON options FOR ALL
  USING (group_id IN (
    SELECT id FROM option_groups
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ))
  WITH CHECK (group_id IN (
    SELECT id FROM option_groups
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "company members: sale_item_options"
  ON sale_item_options FOR ALL
  USING (sale_item_id IN (
    SELECT si.id FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN branches b ON b.id = s.branch_id
    WHERE b.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));
