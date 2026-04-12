-- ============================================================
-- SEA-POS: Seed Data
-- Run AFTER 001_schema.sql in Supabase SQL Editor
-- Creates test accounts + sample data
-- ============================================================
-- All test accounts use password: Test1234!
-- ============================================================

DO $$
DECLARE
  v_admin_id      UUID := gen_random_uuid();
  v_manager_id    UUID := gen_random_uuid();
  v_cashier_id    UUID := gen_random_uuid();
  v_purchasing_id UUID := gen_random_uuid();
BEGIN

  -- ── Admin ──────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id, 'authenticated', 'authenticated',
      'admin@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin","full_name":"ผู้ดูแลระบบ"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  -- ── Manager ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_manager_id, 'authenticated', 'authenticated',
      'manager@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"manager","full_name":"ผู้จัดการร้าน"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  -- ── Cashier ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cashier@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_cashier_id, 'authenticated', 'authenticated',
      'cashier@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"cashier","full_name":"พนักงานเก็บเงิน"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  -- ── Purchasing ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'purchasing@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_purchasing_id, 'authenticated', 'authenticated',
      'purchasing@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"purchasing","full_name":"เจ้าหน้าที่จัดซื้อ"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

END $$;

-- ─── SAMPLE PRODUCTS ─────────────────────────────────────────
INSERT INTO products (name, sku, price, cost, stock, min_stock) VALUES
  ('น้ำดื่มตราช้าง 600ml',       'WAT-600',  7.00,  4.50, 120, 20),
  ('น้ำดื่มตราช้าง 1.5L',        'WAT-1500', 12.00, 8.00,  80, 15),
  ('โค้ก 325ml',                  'COK-325',  20.00, 14.00, 60, 12),
  ('เป๊ปซี่ 325ml',               'PEP-325',  20.00, 14.00, 45, 10),
  ('ขนมปังแผ่น (แพ็ค)',           'BRD-001',  35.00, 25.00, 15,  5),
  ('นมสด Meiji 250ml',            'MLK-MEI',  18.00, 12.00, 30, 10),
  ('ไข่ไก่เบอร์ 2 (แผง 30 ฟอง)', 'EGG-002',  95.00, 80.00,  8,  3),
  ('น้ำมันพืช 1L',                'OIL-001',  55.00, 40.00, 25,  5)
ON CONFLICT DO NOTHING;

-- ─── SAMPLE CUSTOMERS ────────────────────────────────────────
INSERT INTO customers (name, phone, email) VALUES
  ('สมชาย ใจดี',       '0812345678', 'somchai@example.com'),
  ('สมหญิง รักดี',     '0898765432', NULL),
  ('บริษัท ABC จำกัด', '025551234',  'info@abc.co.th')
ON CONFLICT DO NOTHING;

-- ─── SAMPLE SUPPLIERS ────────────────────────────────────────
INSERT INTO suppliers (name, contact_name, phone, email) VALUES
  ('บริษัท สยามฟู้ด จำกัด',      'คุณวิชัย', '0812222333', 'wichai@siamfood.co.th'),
  ('ห้างส่งสินค้าอุดม',           'คุณอุดม',  '025551111',  NULL),
  ('บริษัท เครื่องดื่มไทย จำกัด', 'คุณนภา',   '0899991234', 'napa@thaidrink.co.th')
ON CONFLICT DO NOTHING;
