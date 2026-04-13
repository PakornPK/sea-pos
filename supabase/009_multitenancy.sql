-- ============================================================
-- SEA-POS Release 1: Multi-tenancy foundation (009)
--
-- Every business table gains a `company_id` column. RLS enforces that
-- users can only see/modify rows belonging to their own company.
-- A DB trigger automatically creates a company when a new user signs up,
-- so the user experience remains "sign up → land in your own workspace".
--
-- Safe to run multiple times. Backfills existing data into a single
-- "Legacy" company so no rows are orphaned.
-- ============================================================

-- ─── 1. Companies table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan        TEXT NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE companies IS 'Tenants. One row per customer organization.';

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ─── 2. profiles.company_id ──────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- ─── 3. Helper: current user's company id (used in RLS) ──────
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_current_company_id() TO authenticated;

-- ─── 4. Backfill: ensure a Legacy company exists for existing rows ──
DO $$
DECLARE
  v_legacy_id UUID;
BEGIN
  SELECT id INTO v_legacy_id FROM companies WHERE slug = 'legacy' LIMIT 1;
  IF v_legacy_id IS NULL THEN
    INSERT INTO companies (name, slug, plan)
    VALUES ('Legacy', 'legacy', 'pro')
    RETURNING id INTO v_legacy_id;
  END IF;

  -- Backfill every existing profile without a company
  UPDATE profiles SET company_id = v_legacy_id WHERE company_id IS NULL;
END $$;

-- ─── 5. Add company_id to every business table ────────────────
-- Pattern: the column has a DB-side default that pulls from the current
-- user's profile, and a NOT NULL constraint once backfill is done.

-- products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE products SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE products
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE categories SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE categories
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE customers SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE customers
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE suppliers SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE suppliers
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE sales SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE sales
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE purchase_orders SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE purchase_orders
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- stock_logs
ALTER TABLE stock_logs
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE stock_logs SET company_id = (SELECT id FROM companies WHERE slug = 'legacy' LIMIT 1)
  WHERE company_id IS NULL;
ALTER TABLE stock_logs
  ALTER COLUMN company_id SET DEFAULT get_current_company_id(),
  ALTER COLUMN company_id SET NOT NULL;

-- sale_items and purchase_order_items inherit the company via their parent
-- (sale_id / po_id). No separate column needed — their RLS joins the parent.

-- ─── 6. Indexes on company_id for tenant isolation performance ──
CREATE INDEX IF NOT EXISTS idx_products_company         ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company       ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company        ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company        ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company            ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company  ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_company       ON stock_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company         ON profiles(company_id);

-- ─── 7. RLS: rewrite every policy with company_id isolation ────
-- We drop each old policy and recreate with the tenant filter composed
-- with the existing role check. The shape is:
--   USING/WITH CHECK (
--     company_id = get_current_company_id()
--     AND <existing role rule>
--   )

-- ── companies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;

CREATE POLICY "companies_select" ON companies FOR SELECT
  TO authenticated USING (id = get_current_company_id());

CREATE POLICY "companies_update" ON companies FOR UPDATE
  TO authenticated
  USING (id = get_current_company_id() AND get_user_role() = 'admin');

-- ── profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Users always see their own profile; admins see everyone in their company
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (company_id = get_current_company_id() AND get_user_role() = 'admin')
  );

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    company_id = get_current_company_id() AND get_user_role() = 'admin'
  );

-- ── products ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

CREATE POLICY "products_select" ON products FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "products_insert" ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
  );

CREATE POLICY "products_update" ON products FOR UPDATE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "products_delete" ON products FOR DELETE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() = 'admin'
  );

-- ── categories ───────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

CREATE POLICY "categories_select" ON categories FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "categories_insert" ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "categories_update" ON categories FOR UPDATE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "categories_delete" ON categories FOR DELETE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ── stock_logs ───────────────────────────────────────────────
DROP POLICY IF EXISTS "stock_logs_select" ON stock_logs;
DROP POLICY IF EXISTS "stock_logs_insert" ON stock_logs;

CREATE POLICY "stock_logs_select" ON stock_logs FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "stock_logs_insert" ON stock_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier', 'purchasing')
  );

-- ── customers ────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

CREATE POLICY "customers_select" ON customers FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "customers_insert" ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier')
  );

CREATE POLICY "customers_update" ON customers FOR UPDATE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier')
  );

CREATE POLICY "customers_delete" ON customers FOR DELETE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() = 'admin'
  );

-- ── suppliers ────────────────────────────────────────────────
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;

CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
  );

CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
  );

CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() = 'admin'
  );

-- ── sales ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;

CREATE POLICY "sales_select" ON sales FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "sales_insert" ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier')
  );

CREATE POLICY "sales_update" ON sales FOR UPDATE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ── sale_items (inherits via sales) ──────────────────────────
DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;

CREATE POLICY "sale_items_select" ON sale_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = sale_id AND s.company_id = get_current_company_id()
  ));

CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = sale_id
      AND s.company_id = get_current_company_id()
  ) AND get_user_role() IN ('admin', 'manager', 'cashier'));

-- ── purchase_orders ──────────────────────────────────────────
DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  TO authenticated USING (company_id = get_current_company_id());

CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
  );

CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
  );

-- ── purchase_order_items (inherits via purchase_orders) ──────
DROP POLICY IF EXISTS "purchase_order_items_select" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_insert" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_update" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_delete" ON purchase_order_items;

CREATE POLICY "purchase_order_items_select" ON purchase_order_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders p
    WHERE p.id = po_id AND p.company_id = get_current_company_id()
  ));

CREATE POLICY "purchase_order_items_insert" ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders p
    WHERE p.id = po_id AND p.company_id = get_current_company_id()
  ) AND get_user_role() IN ('admin', 'manager', 'purchasing'));

CREATE POLICY "purchase_order_items_update" ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders p
    WHERE p.id = po_id AND p.company_id = get_current_company_id()
  ) AND get_user_role() IN ('admin', 'manager', 'purchasing'));

CREATE POLICY "purchase_order_items_delete" ON purchase_order_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders p
    WHERE p.id = po_id AND p.company_id = get_current_company_id()
  ) AND get_user_role() IN ('admin', 'manager', 'purchasing'));

-- ─── 8. handle_new_user: create a company for self-serve signups ──
-- On signup, if the user has no company_id in their metadata, spin up
-- a fresh company and make them its admin owner. If they were invited
-- (metadata.company_id set), just attach.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_company_id  UUID;
  v_role        TEXT;
  v_full_name   TEXT;
  v_incoming_co UUID;
BEGIN
  v_full_name   := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_role        := COALESCE(NEW.raw_user_meta_data->>'role', 'cashier');
  v_incoming_co := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;

  IF v_incoming_co IS NOT NULL THEN
    -- Invitation flow — reuse existing company, keep passed role
    v_company_id := v_incoming_co;
  ELSE
    -- Self-serve signup — create a fresh company for this user
    INSERT INTO public.companies (name, owner_id, plan)
    VALUES (
      COALESCE(v_full_name, 'My Company') || '''s Store',
      NEW.id,
      'free'
    )
    RETURNING id INTO v_company_id;
    v_role := 'admin';  -- signup = owner = admin
  END IF;

  INSERT INTO public.profiles (id, role, full_name, company_id)
  VALUES (NEW.id, v_role, v_full_name, v_company_id)
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        role       = EXCLUDED.role,
        full_name  = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;

-- Trigger already exists from 001_schema.sql; the function body is redefined.
