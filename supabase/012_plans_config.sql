-- ============================================================
-- SEA-POS: Plans as configuration (012)
--
-- Replaces the hardcoded plan enum (`free | pro | enterprise`) with a
-- proper config table. Platform admins can now edit limits, names, and
-- prices without code changes.
--
-- Plans seeded:
--   free          — เริ่มต้น (50 products, 3 users, 1 branch)
--   lite_pro      — โปร Lite (300 products, 10 users, 2 branches)
--   standard_pro  — โปร Standard (1,500 products, 50 users, 5 branches)
--   enterprise    — องค์กร (unlimited)
--
-- Safe to run multiple times.
-- ============================================================

-- ─── 1. plans config table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  code               TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  description        TEXT,
  max_products       INTEGER,        -- NULL = unlimited
  max_users          INTEGER,
  max_branches       INTEGER,
  monthly_price_baht NUMERIC(12,2),  -- NULL = "Contact us" (enterprise)
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE plans IS 'SaaS plan tiers — limits + pricing. Edited by platform admins.';

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ active plans (used by the company plan
-- picker UI for platform admins, and to compute their own usage limits).
DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans FOR SELECT TO authenticated USING (true);

-- Only platform admins may edit plans.
DROP POLICY IF EXISTS "plans_update" ON plans;
CREATE POLICY "plans_update" ON plans FOR UPDATE TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "plans_insert" ON plans;
CREATE POLICY "plans_insert" ON plans FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "plans_delete" ON plans;
CREATE POLICY "plans_delete" ON plans FOR DELETE TO authenticated
  USING (is_platform_admin());

-- ─── 2. Seed default plans ───────────────────────────────────
INSERT INTO plans (code, name, description, max_products, max_users, max_branches, monthly_price_baht, sort_order)
VALUES
  ('free',         'ฟรี',          'เริ่มต้นใช้งาน เหมาะสำหรับร้านเล็ก',                    50,    3,  1,    0,   1),
  ('lite_pro',     'โปร Lite',     'ขนาดเล็ก-กลาง รองรับหลายพนักงาน',                    300,  10,  2,  399,   2),
  ('standard_pro', 'โปร Standard', 'ขนาดกลาง-ใหญ่ หลายสาขา รายงานครบ',                  1500,  50,  5,  990,   3),
  ('enterprise',   'องค์กร',       'ไม่จำกัดการใช้งาน บริการเฉพาะองค์กร', NULL, NULL, NULL, NULL,   4)
ON CONFLICT (code) DO NOTHING;

-- ─── 3. Migrate companies.plan to FK ─────────────────────────
-- IMPORTANT: drop the old CHECK constraint BEFORE updating values.
-- Otherwise `UPDATE ... SET plan = 'standard_pro'` fails the old
-- `plan IN ('free','pro','enterprise')` check.
--
-- Drop by known name first; fall back to a catalog scan for any
-- remaining CHECK on companies.plan (covers custom-named constraints).
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_plan_check;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%plan%'
  LOOP
    EXECUTE format('ALTER TABLE companies DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Now it's safe to rename existing 'pro' rows to the new seeded code.
UPDATE companies SET plan = 'standard_pro' WHERE plan = 'pro';

-- Add the FK (idempotent — skip if it already exists).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_plan_fkey' AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_plan_fkey
      FOREIGN KEY (plan) REFERENCES plans(code) ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 4. Auto-touch updated_at on plan edits ──────────────────
CREATE OR REPLACE FUNCTION plans_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plans_touch_updated_at ON plans;
CREATE TRIGGER plans_touch_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION plans_touch_updated_at();
