-- ============================================================
-- SEA-POS: Full Schema Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (role management)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'cashier'
              CHECK (role IN ('admin', 'manager', 'cashier', 'purchasing')),
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE profiles IS 'One row per auth user. Stores ERP role.';

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper function: returns current user's role (used in RLS policies)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku         TEXT,
  name        TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,   -- selling price
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0,   -- purchase cost
  stock       INTEGER NOT NULL DEFAULT 0,
  min_stock   INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add price/cost if the table already existed without them
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ============================================================
-- STOCK LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change      INTEGER NOT NULL,
  reason      TEXT,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add reason if the table already existed without it
ALTER TABLE stock_logs
  ADD COLUMN IF NOT EXISTS reason  TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  total_amount    NUMERIC(12,2) NOT NULL,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
  status          TEXT NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('completed', 'voided')),
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL,   -- snapshot price at time of sale
  subtotal    NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordered_at    TIMESTAMPTZ,
  received_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- PURCHASE ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity_ordered  INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost         NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items  ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES ────────────────────────────────────────────────
-- Users see their own profile; admin sees all
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

-- Only admin can update roles
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- ─── PRODUCTS ────────────────────────────────────────────────
-- All authenticated users can view products
CREATE POLICY "products_select" ON products FOR SELECT
  TO authenticated USING (true);

-- Admin + Manager can add/edit products
CREATE POLICY "products_insert" ON products FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "products_update" ON products FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager'));

-- Only admin can delete products
CREATE POLICY "products_delete" ON products FOR DELETE
  TO authenticated USING (get_user_role() = 'admin');

-- ─── STOCK LOGS ──────────────────────────────────────────────
CREATE POLICY "stock_logs_select" ON stock_logs FOR SELECT
  TO authenticated USING (true);

-- Admin, Manager, Cashier can log stock changes
CREATE POLICY "stock_logs_insert" ON stock_logs FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'cashier'));

-- ─── CUSTOMERS ───────────────────────────────────────────────
CREATE POLICY "customers_select" ON customers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "customers_insert" ON customers FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'cashier'));

CREATE POLICY "customers_update" ON customers FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager', 'cashier'));

CREATE POLICY "customers_delete" ON customers FOR DELETE
  TO authenticated USING (get_user_role() = 'admin');

-- ─── SUPPLIERS ───────────────────────────────────────────────
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'purchasing'));

CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager', 'purchasing'));

CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE
  TO authenticated USING (get_user_role() = 'admin');

-- ─── SALES ───────────────────────────────────────────────────
CREATE POLICY "sales_select" ON sales FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sales_insert" ON sales FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'cashier'));

-- Only admin/manager can void (update status)
CREATE POLICY "sales_update" ON sales FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager'));

-- ─── SALE ITEMS ──────────────────────────────────────────────
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'cashier'));

-- ─── PURCHASE ORDERS ─────────────────────────────────────────
CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'purchasing'));

CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager', 'purchasing'));

-- ─── PURCHASE ORDER ITEMS ────────────────────────────────────
CREATE POLICY "purchase_order_items_select" ON purchase_order_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "purchase_order_items_insert" ON purchase_order_items FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager', 'purchasing'));

CREATE POLICY "purchase_order_items_update" ON purchase_order_items FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager', 'purchasing'));
