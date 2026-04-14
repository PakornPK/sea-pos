-- ============================================================
-- SEA-POS Release 2: Multi-branch (014)
--
-- Adds a second tenancy scope: branches under companies. Stock moves
-- from a scalar `products.stock` column to a per-branch pivot table.
-- Every operational table (sales, purchase_orders, stock_logs) gains
-- a `branch_id`. Users are mapped many-to-many to branches.
--
-- Data migration:
--   - Every existing company gets a default branch 'สาขาหลัก' / code 'B01'
--   - products.stock → product_stock(product_id, branch_id, quantity)
--   - Historical sales/POs/stock_logs → default branch
--   - Existing users → default branch (is_default = true)
--
-- Safe to run multiple times.
-- ============================================================

-- ─── 1. branches ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
              DEFAULT get_current_company_id(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,           -- receipt prefix, e.g. 'B01'
  address     TEXT,
  phone       TEXT,
  tax_id      TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (company_id, code)
);
COMMENT ON TABLE branches IS 'Physical store locations under a company.';

-- Exactly one default per company
CREATE UNIQUE INDEX IF NOT EXISTS branches_one_default_per_company
  ON branches (company_id) WHERE is_default;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ─── 2. per-branch stock pivot ───────────────────────────────
CREATE TABLE IF NOT EXISTS product_stock (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (product_id, branch_id)
);
CREATE INDEX IF NOT EXISTS product_stock_branch_idx  ON product_stock (branch_id);
CREATE INDEX IF NOT EXISTS product_stock_company_idx ON product_stock (company_id);

ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;

-- ─── 3. user ↔ branch mapping ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_branches (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, branch_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS user_branches_one_default_per_user
  ON user_branches (user_id) WHERE is_default;

ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;

-- ─── 4. Helpers used by RLS ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_current_branch_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT branch_id FROM public.user_branches WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION get_current_branch_ids() TO authenticated;

CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION is_company_admin() TO authenticated;

-- ─── 5. Add branch_id columns to operational tables ──────────
ALTER TABLE sales            ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE purchase_orders  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE stock_logs       ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE stock_logs       ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)
  DEFAULT get_current_company_id();  -- older rows may lack it; harmless if present

-- ─── 6. One-time data migration ──────────────────────────────
DO $$
DECLARE
  v_company RECORD;
  v_branch_id UUID;
BEGIN
  -- A. default branch per company
  FOR v_company IN SELECT id FROM companies LOOP
    INSERT INTO branches (company_id, name, code, is_default)
    VALUES (v_company.id, 'สาขาหลัก', 'B01', true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;

  -- B. products.stock → product_stock (only if products.stock still exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock'
  ) THEN
    INSERT INTO product_stock (product_id, branch_id, company_id, quantity)
    SELECT p.id, b.id, p.company_id, p.stock
    FROM   products p
    JOIN   branches b ON b.company_id = p.company_id AND b.is_default
    ON CONFLICT (product_id, branch_id) DO NOTHING;
  END IF;

  -- C. backfill branch_id on historical rows
  UPDATE sales
  SET    branch_id = b.id
  FROM   branches b
  WHERE  sales.branch_id IS NULL
    AND  b.company_id = sales.company_id
    AND  b.is_default;

  UPDATE purchase_orders
  SET    branch_id = b.id
  FROM   branches b
  WHERE  purchase_orders.branch_id IS NULL
    AND  b.company_id = purchase_orders.company_id
    AND  b.is_default;

  UPDATE stock_logs
  SET    branch_id = b.id
  FROM   branches b
  WHERE  stock_logs.branch_id IS NULL
    AND  b.company_id = stock_logs.company_id
    AND  b.is_default;

  -- D. assign every user to their company's default branch (is_default=true)
  INSERT INTO user_branches (user_id, branch_id, company_id, is_default)
  SELECT p.id, b.id, p.company_id, true
  FROM   profiles p
  JOIN   branches b ON b.company_id = p.company_id AND b.is_default
  WHERE  p.company_id IS NOT NULL
  ON CONFLICT (user_id, branch_id) DO NOTHING;
END $$;

-- ─── 7. Tighten constraints now that data is populated ───────
ALTER TABLE sales           ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE stock_logs      ALTER COLUMN branch_id SET NOT NULL;

-- Per-branch receipt number uniqueness (was company-wide)
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_receipt_no_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_receipt_no_branch_unique'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_receipt_no_branch_unique UNIQUE (branch_id, receipt_no);
  END IF;
END $$;

-- Drop the old scalar stock column (source of truth is now product_stock)
ALTER TABLE products DROP COLUMN IF EXISTS stock;

-- ─── 8. Stock transfers between branches ─────────────────────
CREATE TABLE IF NOT EXISTS stock_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
                  DEFAULT get_current_company_id(),
  from_branch_id  UUID NOT NULL REFERENCES branches(id),
  to_branch_id    UUID NOT NULL REFERENCES branches(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'in_transit', 'received', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  received_at     TIMESTAMPTZ,
  CHECK (from_branch_id <> to_branch_id)
);
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id        UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id),
  quantity_sent      INTEGER NOT NULL CHECK (quantity_sent > 0),
  quantity_received  INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- ─── 9. RLS policies — branch-aware ──────────────────────────
-- Pattern:
--   Read/Write allowed if:
--     company_id = get_current_company_id()
--   AND (
--     is_company_admin()           -- owners see every branch
--     OR is_platform_admin()
--     OR branch_id IN (SELECT get_current_branch_ids())
--   )

-- Helper to reapply policies idempotently
DO $$
BEGIN
  -- branches
  DROP POLICY IF EXISTS "branches_select" ON branches;
  CREATE POLICY "branches_select" ON branches FOR SELECT TO authenticated
    USING (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin()
           OR id IN (SELECT get_current_branch_ids()))
    );

  DROP POLICY IF EXISTS "branches_write" ON branches;
  CREATE POLICY "branches_write" ON branches FOR ALL TO authenticated
    USING (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin())
    )
    WITH CHECK (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin())
    );

  -- user_branches (admin only to mutate; anyone to read own row)
  DROP POLICY IF EXISTS "user_branches_select" ON user_branches;
  CREATE POLICY "user_branches_select" ON user_branches FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR (company_id = get_current_company_id()
          AND (is_company_admin() OR is_platform_admin()))
    );

  DROP POLICY IF EXISTS "user_branches_write" ON user_branches;
  CREATE POLICY "user_branches_write" ON user_branches FOR ALL TO authenticated
    USING (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin())
    )
    WITH CHECK (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin())
    );

  -- product_stock
  DROP POLICY IF EXISTS "product_stock_select" ON product_stock;
  CREATE POLICY "product_stock_select" ON product_stock FOR SELECT TO authenticated
    USING (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin()
           OR branch_id IN (SELECT get_current_branch_ids()))
    );

  DROP POLICY IF EXISTS "product_stock_write" ON product_stock;
  CREATE POLICY "product_stock_write" ON product_stock FOR ALL TO authenticated
    USING (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin()
           OR branch_id IN (SELECT get_current_branch_ids()))
    )
    WITH CHECK (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin()
           OR branch_id IN (SELECT get_current_branch_ids()))
    );

  -- stock_transfers / stock_transfer_items: must involve one of user's branches
  DROP POLICY IF EXISTS "stock_transfers_select" ON stock_transfers;
  CREATE POLICY "stock_transfers_select" ON stock_transfers FOR SELECT TO authenticated
    USING (
      company_id = get_current_company_id()
      AND (is_company_admin() OR is_platform_admin()
           OR from_branch_id IN (SELECT get_current_branch_ids())
           OR to_branch_id   IN (SELECT get_current_branch_ids()))
    );

  DROP POLICY IF EXISTS "stock_transfers_write" ON stock_transfers;
  CREATE POLICY "stock_transfers_write" ON stock_transfers FOR ALL TO authenticated
    USING (
      company_id = get_current_company_id()
      AND get_user_role() IN ('admin', 'manager')
      AND (is_company_admin() OR is_platform_admin()
           OR from_branch_id IN (SELECT get_current_branch_ids())
           OR to_branch_id   IN (SELECT get_current_branch_ids()))
    )
    WITH CHECK (
      company_id = get_current_company_id()
      AND get_user_role() IN ('admin', 'manager')
    );

  DROP POLICY IF EXISTS "stock_transfer_items_rw" ON stock_transfer_items;
  CREATE POLICY "stock_transfer_items_rw" ON stock_transfer_items FOR ALL TO authenticated
    USING (
      transfer_id IN (
        SELECT id FROM stock_transfers
        WHERE company_id = get_current_company_id()
          AND (is_company_admin() OR is_platform_admin()
               OR from_branch_id IN (SELECT get_current_branch_ids())
               OR to_branch_id   IN (SELECT get_current_branch_ids()))
      )
    )
    WITH CHECK (
      transfer_id IN (
        SELECT id FROM stock_transfers
        WHERE company_id = get_current_company_id()
      )
    );
END $$;

-- ─── 10. Update decrement_stock RPC to be branch-aware ───────
-- Drop the old 4-arg signature before replacing with the 5-arg one so
-- `COMMENT ON FUNCTION decrement_stock` below is unambiguous.
DROP FUNCTION IF EXISTS decrement_stock(UUID, INTEGER, UUID, UUID);
DROP FUNCTION IF EXISTS decrement_stock(UUID, UUID, INTEGER, UUID, UUID);

CREATE FUNCTION decrement_stock(
  p_product_id  UUID,
  p_branch_id   UUID,
  p_quantity    INTEGER,
  p_sale_id     UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  SELECT quantity
  INTO   v_stock
  FROM   public.product_stock
  WHERE  product_id = p_product_id AND branch_id = p_branch_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Product % has no stock row at branch %', p_product_id, p_branch_id;
  END IF;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product % at branch %: available %, requested %',
      p_product_id, p_branch_id, v_stock, p_quantity;
  END IF;

  UPDATE public.product_stock
  SET    quantity = quantity - p_quantity,
         updated_at = NOW()
  WHERE  product_id = p_product_id AND branch_id = p_branch_id;

  INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
  SELECT p_product_id,
         p_branch_id,
         ps.company_id,
         -p_quantity,
         'ขาย #' || left(p_sale_id::text, 8),
         p_user_id
  FROM   public.product_stock ps
  WHERE  ps.product_id = p_product_id AND ps.branch_id = p_branch_id;
END;
$$;

-- ─── 11. receive_po_item RPC — branch-aware stock increment ──
DROP FUNCTION IF EXISTS receive_po_item(UUID, INTEGER, UUID);

CREATE FUNCTION receive_po_item(
  p_item_id  UUID,
  p_qty      INTEGER,
  p_user_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item       RECORD;
  v_po_branch  UUID;
  v_company    UUID;
BEGIN
  SELECT poi.*, po.branch_id AS po_branch_id, po.company_id AS po_company_id
  INTO   v_item
  FROM   public.purchase_order_items poi
  JOIN   public.purchase_orders po ON po.id = poi.po_id
  WHERE  poi.id = p_item_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'PO item % not found', p_item_id;
  END IF;

  IF v_item.quantity_received + p_qty > v_item.quantity_ordered THEN
    RAISE EXCEPTION 'Receive exceeds ordered quantity on PO item %', p_item_id;
  END IF;

  v_po_branch := v_item.po_branch_id;
  v_company   := v_item.po_company_id;

  UPDATE public.purchase_order_items
  SET    quantity_received = quantity_received + p_qty
  WHERE  id = p_item_id;

  INSERT INTO public.product_stock (product_id, branch_id, company_id, quantity)
  VALUES (v_item.product_id, v_po_branch, v_company, p_qty)
  ON CONFLICT (product_id, branch_id)
  DO UPDATE SET
    quantity   = public.product_stock.quantity + p_qty,
    updated_at = NOW();

  INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
  VALUES (v_item.product_id, v_po_branch, v_company, p_qty, 'รับของจาก PO', p_user_id);

  -- Flip PO to 'received' if every item is fully received
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE po_id = v_item.po_id AND quantity_received < quantity_ordered
  ) THEN
    UPDATE public.purchase_orders
    SET    status      = 'received',
           received_at = NOW()
    WHERE  id = v_item.po_id AND status = 'ordered';
  END IF;
END;
$$;

COMMENT ON FUNCTION decrement_stock(UUID, UUID, INTEGER, UUID, UUID)
  IS 'Branch-aware atomic stock decrement for sales.';
COMMENT ON FUNCTION receive_po_item(UUID, INTEGER, UUID)
  IS 'Branch-aware atomic PO receive: pivot increment + status transition.';
