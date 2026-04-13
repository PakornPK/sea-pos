-- ============================================================
-- SEA-POS: Platform admin + company status (011)
--
-- Adds the concept of a "platform operator" — the humans who run
-- SEA-POS itself, as opposed to the customers whose companies run
-- on top of it. They can see and manage every company.
--
-- Adds `companies.status` for the activation lifecycle:
--   pending   — just signed up, awaiting platform-admin approval
--   active    — fully usable (default for invite-only MVP1)
--   suspended — temporarily blocked (payment, ToS, etc.)
--   closed    — permanently closed (self-delete or banned)
--
-- Safe to run multiple times.
-- ============================================================

-- ─── 1. companies.status ─────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'closed'));

-- Explicit backfill for safety (existing rows already got the default)
UPDATE companies SET status = 'active' WHERE status IS NULL;

-- ─── 2. profiles.is_platform_admin ───────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- ─── 3. Helper: is current user a platform admin? ────────────
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- ─── 4. RLS update: platform admins bypass tenant filter ─────
-- For every business table, the policy becomes:
--   USING (is_platform_admin() OR company_id = get_current_company_id())
-- This keeps ordinary users strictly tenant-scoped while giving platform
-- admins full visibility for support + ops.

-- companies
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;

CREATE POLICY "companies_select" ON companies FOR SELECT
  TO authenticated
  USING (is_platform_admin() OR id = get_current_company_id());

-- Only platform admins may create new companies directly (invite-only MVP1).
-- When self-serve signup is enabled later, signups create rows via
-- handle_new_user trigger which runs SECURITY DEFINER and bypasses RLS.
CREATE POLICY "companies_insert" ON companies FOR INSERT
  TO authenticated WITH CHECK (is_platform_admin());

CREATE POLICY "companies_update" ON companies FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR (id = get_current_company_id() AND get_user_role() = 'admin')
  );

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_platform_admin()
    OR (company_id = get_current_company_id() AND get_user_role() = 'admin')
  );

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    is_platform_admin()
    OR (company_id = get_current_company_id() AND get_user_role() = 'admin')
  );

-- products / categories / customers / suppliers / sales / purchase_orders / stock_logs
-- Add platform-admin bypass to each SELECT policy. INSERT/UPDATE/DELETE
-- stay company-scoped — platform admins don't edit customer data as them;
-- they impersonate-then-edit or use the service role client.
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "sales_select" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

DROP POLICY IF EXISTS "stock_logs_select" ON stock_logs;
CREATE POLICY "stock_logs_select" ON stock_logs FOR SELECT
  TO authenticated USING (is_platform_admin() OR company_id = get_current_company_id());

-- ─── 5. Bootstrap the first platform admin ───────────────────
-- Creates platform@sea-pos.com if missing and flips its flag.
-- Password: PlatformAdmin1234! (change after first login!)
--
-- To change the email later, run in SQL editor:
--   UPDATE auth.users SET email = 'you@yourrealdomain.com'
--    WHERE email = 'platform@sea-pos.com';
--
-- To grant the role to a different existing user:
--   UPDATE profiles SET is_platform_admin = true
--    WHERE id = (SELECT id FROM auth.users WHERE email = '...');
DO $$
DECLARE
  v_platform_id UUID;
BEGIN
  SELECT id INTO v_platform_id FROM auth.users
   WHERE email = 'platform@sea-pos.com';

  IF v_platform_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', 'platform@sea-pos.com',
      crypt('PlatformAdmin1234!', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Platform Admin"}',
      NOW(), NOW(), '', '', '', ''
    )
    RETURNING id INTO v_platform_id;
  END IF;

  -- Ensure their profile exists and has the flag set.
  -- Platform admins don't belong to any customer company (company_id = NULL).
  -- That's fine because RLS short-circuits on is_platform_admin().
  INSERT INTO public.profiles (id, role, full_name, company_id, is_platform_admin)
  VALUES (v_platform_id, 'admin', 'Platform Admin', NULL, true)
  ON CONFLICT (id) DO UPDATE
    SET is_platform_admin = true,
        company_id = NULL,
        full_name = 'Platform Admin';
END $$;

-- ─── 6. Allow platform admins to bypass the NOT NULL company_id ──
-- Platform admin profiles have no company, so profiles.company_id must allow NULL.
ALTER TABLE profiles
  ALTER COLUMN company_id DROP NOT NULL;
