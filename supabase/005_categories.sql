-- ============================================================
-- SEA-POS: Product categories
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Link products to a category (nullable — existing products stay uncategorised)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Also add price/cost if not yet present (idempotent)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "categories_insert" ON categories FOR INSERT
  TO authenticated WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "categories_update" ON categories FOR UPDATE
  TO authenticated USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "categories_delete" ON categories FOR DELETE
  TO authenticated USING (get_user_role() IN ('admin', 'manager'));

-- ─── Seed default categories ──────────────────────────────────
INSERT INTO categories (name) VALUES
  ('เครื่องดื่ม'),
  ('อาหาร'),
  ('ของสด'),
  ('ของใช้'),
  ('ขนม')
ON CONFLICT DO NOTHING;
