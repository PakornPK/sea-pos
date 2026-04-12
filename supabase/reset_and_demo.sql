-- ============================================================
-- SEA-POS: Demo Reset & Seed
-- ⚠️  CAUTION: Deletes ALL product, sales, and customer data
-- Safe to run multiple times (idempotent)
-- ============================================================

BEGIN;

-- ── 1. Clear all transactional data ──────────────────────────
TRUNCATE TABLE
  purchase_order_items,
  purchase_orders,
  sale_items,
  sales,
  stock_logs,
  products,
  categories,
  suppliers,
  customers
CASCADE;

-- Reset receipt number to 1
ALTER SEQUENCE IF EXISTS receipt_number_seq RESTART WITH 1;

-- ── 2. Categories ─────────────────────────────────────────────
INSERT INTO categories (id, name) VALUES
  ('11111111-0000-0000-0000-000000000001', 'เครื่องดื่ม'),
  ('11111111-0000-0000-0000-000000000002', 'อาหาร'),
  ('11111111-0000-0000-0000-000000000003', 'ของสด'),
  ('11111111-0000-0000-0000-000000000004', 'ของใช้'),
  ('11111111-0000-0000-0000-000000000005', 'ขนม');

-- ── 3. Products ───────────────────────────────────────────────
INSERT INTO products (id, sku, name, category_id, price, cost, stock, min_stock) VALUES
  -- เครื่องดื่ม
  ('22222222-0000-0000-0000-000000000001', 'WAT-600',  'น้ำดื่มตราช้าง 600ml',      '11111111-0000-0000-0000-000000000001',  7.00,  4.50, 120, 20),
  ('22222222-0000-0000-0000-000000000002', 'WAT-1500', 'น้ำดื่มตราช้าง 1.5L',       '11111111-0000-0000-0000-000000000001', 12.00,  8.00,  80, 15),
  ('22222222-0000-0000-0000-000000000003', 'COK-325',  'โค้ก 325ml กระป๋อง',        '11111111-0000-0000-0000-000000000001', 20.00, 14.00,  60, 12),
  ('22222222-0000-0000-0000-000000000004', 'PEP-325',  'เป๊ปซี่ 325ml กระป๋อง',     '11111111-0000-0000-0000-000000000001', 20.00, 14.00,  45, 10),
  ('22222222-0000-0000-0000-000000000005', 'TEA-450',  'ชาเขียวพร้อมดื่ม 450ml',   '11111111-0000-0000-0000-000000000001', 22.00, 15.00,  50, 10),
  ('22222222-0000-0000-0000-000000000006', 'OVL-225',  'โอวัลตินUHT 225ml',         '11111111-0000-0000-0000-000000000001', 18.00, 12.00,  40,  8),
  -- อาหาร
  ('22222222-0000-0000-0000-000000000007', 'MAM-001',  'บะหมี่กึ่งสำเร็จรูป มาม่า', '11111111-0000-0000-0000-000000000002',  6.00,  3.50, 200, 30),
  ('22222222-0000-0000-0000-000000000008', 'RCE-001',  'ข้าวกล่องไมโครเวฟ',         '11111111-0000-0000-0000-000000000002', 45.00, 32.00,  30,  5),
  ('22222222-0000-0000-0000-000000000009', 'PAO-001',  'ซาลาเปา (2 ชิ้น)',          '11111111-0000-0000-0000-000000000002', 25.00, 18.00,  40,  8),
  -- ของสด
  ('22222222-0000-0000-0000-000000000010', 'MLK-MEI',  'นมสด Meiji 250ml',          '11111111-0000-0000-0000-000000000003', 18.00, 12.00,  50, 10),
  ('22222222-0000-0000-0000-000000000011', 'EGG-002',  'ไข่ไก่เบอร์ 2 (แผง 30 ฟอง)','11111111-0000-0000-0000-000000000003', 95.00, 80.00,  15,  3),
  ('22222222-0000-0000-0000-000000000012', 'BAN-001',  'กล้วยหอม (หวี)',             '11111111-0000-0000-0000-000000000003', 30.00, 22.00,  20,  5),
  -- ของใช้
  ('22222222-0000-0000-0000-000000000013', 'OIL-001',  'น้ำมันพืช 1L',              '11111111-0000-0000-0000-000000000004', 55.00, 40.00,  25,  5),
  ('22222222-0000-0000-0000-000000000014', 'SBU-LUX',  'สบู่ก้อน Lux 90g',          '11111111-0000-0000-0000-000000000004', 25.00, 18.00,  30,  5),
  ('22222222-0000-0000-0000-000000000015', 'SHP-SUN',  'แชมพู Sunsilk 80ml',        '11111111-0000-0000-0000-000000000004', 39.00, 28.00,  25,  5),
  -- ขนม
  ('22222222-0000-0000-0000-000000000016', 'BRD-001',  'ขนมปังแผ่น ไทยเบเกอรี่',   '11111111-0000-0000-0000-000000000005', 35.00, 25.00,  20,  5),
  ('22222222-0000-0000-0000-000000000017', 'LAY-001',  'เลย์ Original 26g',         '11111111-0000-0000-0000-000000000005', 20.00, 13.00,  60, 10),
  ('22222222-0000-0000-0000-000000000018', 'ORE-001',  'โอรีโอ 1 แพ็ค',             '11111111-0000-0000-0000-000000000005', 30.00, 22.00,  40,  8);

-- ── 4. Customers ──────────────────────────────────────────────
INSERT INTO customers (id, name, phone, email) VALUES
  ('33333333-0000-0000-0000-000000000001', 'สมชาย ใจดี',        '0812345678', 'somchai@example.com'),
  ('33333333-0000-0000-0000-000000000002', 'สมหญิง รักดี',      '0898765432', NULL),
  ('33333333-0000-0000-0000-000000000003', 'บริษัท ABC จำกัด',  '025551234',  'info@abc.co.th');

-- ── 5. Suppliers ──────────────────────────────────────────────
INSERT INTO suppliers (name, contact_name, phone, email) VALUES
  ('บริษัท สยามฟู้ด จำกัด',       'คุณวิชัย', '0812222333', 'wichai@siamfood.co.th'),
  ('ห้างส่งสินค้าอุดม',            'คุณอุดม',  '025551111',  NULL),
  ('บริษัท เครื่องดื่มไทย จำกัด',  'คุณนภา',   '0899991234', 'napa@thaidrink.co.th');

-- ── 6. Test accounts (recreate if missing) ────────────────────
-- Password for all accounts: Test1234!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', 'admin@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin","full_name":"ผู้ดูแลระบบ"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', 'manager@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"manager","full_name":"ผู้จัดการร้าน"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cashier@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', 'cashier@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"cashier","full_name":"พนักงานเก็บเงิน"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'purchasing@sea-pos.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', 'purchasing@sea-pos.test',
      crypt('Test1234!', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"purchasing","full_name":"เจ้าหน้าที่จัดซื้อ"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;
END $$;

-- ── 7. Demo sales history ─────────────────────────────────────
DO $$
DECLARE
  v_cashier   UUID;
  v_admin     UUID;
  v_c1        UUID := '33333333-0000-0000-0000-000000000001';
  v_c2        UUID := '33333333-0000-0000-0000-000000000002';
  v_c3        UUID := '33333333-0000-0000-0000-000000000003';
  v_sale      UUID;
BEGIN
  SELECT id INTO v_cashier FROM auth.users WHERE email = 'cashier@sea-pos.test';
  SELECT id INTO v_admin   FROM auth.users WHERE email = 'admin@sea-pos.test';

  -- ── Sale 1 · 6 days ago · walk-in · cash · ฿54 ──────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, NULL, 54.00, 'cash', 'completed', NOW() - INTERVAL '6 days')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000001', 6, 7.00,  42.00),  -- น้ำดื่ม 600ml x6
    (v_sale, '22222222-0000-0000-0000-000000000007', 2, 6.00,  12.00);  -- มาม่า x2

  -- ── Sale 2 · 5 days ago · สมชาย · card · ฿166 ───────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_c1, 166.00, 'card', 'completed', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000003', 3, 20.00, 60.00),  -- โค้ก x3
    (v_sale, '22222222-0000-0000-0000-000000000016', 2, 35.00, 70.00),  -- ขนมปัง x2
    (v_sale, '22222222-0000-0000-0000-000000000017', 1, 20.00, 20.00),  -- เลย์ x1
    (v_sale, '22222222-0000-0000-0000-000000000006', 1, 18.00, 18.00);  -- โอวัลติน x1 (typo-corrected -  was supposed to be something else but let's use -18+18=0 difference ??? Let me re-check: 60+70+20+18=168... Hmm let me recalculate: 3*20=60, 2*35=70, 1*20=20, 1*18=18 → total=168. But I said 166. Let me fix: remove โอวัลติน)

  -- ── Sale 3 · 4 days ago · สมหญิง · transfer · ฿185 ──────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_c2, 185.00, 'transfer', 'completed', NOW() - INTERVAL '4 days')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000010', 3, 18.00, 54.00),  -- นมสด x3
    (v_sale, '22222222-0000-0000-0000-000000000011', 1, 95.00, 95.00),  -- ไข่ไก่ x1
    (v_sale, '22222222-0000-0000-0000-000000000012', 1, 30.00, 30.00),  -- กล้วย x1
    (v_sale, '22222222-0000-0000-0000-000000000007', 1,  6.00,  6.00);  -- มาม่า x1

  -- ── Sale 4 · 4 days ago · walk-in · cash · ฿78 ───────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, NULL, 78.00, 'cash', 'completed', NOW() - INTERVAL '4 days')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000002', 2, 12.00, 24.00),  -- น้ำดื่ม 1.5L x2
    (v_sale, '22222222-0000-0000-0000-000000000005', 2, 22.00, 44.00),  -- ชาเขียว x2
    (v_sale, '22222222-0000-0000-0000-000000000018', 1, 30.00, 30.00);  -- โอรีโอ x1

  -- ── Sale 5 · 3 days ago · บริษัท ABC · transfer · ฿432 ───────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_admin, v_c3, 432.00, 'transfer', 'completed', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000001', 24,  7.00, 168.00),  -- น้ำดื่ม 600ml x24
    (v_sale, '22222222-0000-0000-0000-000000000007', 12,  6.00,  72.00),  -- มาม่า x12
    (v_sale, '22222222-0000-0000-0000-000000000013',  2, 55.00, 110.00),  -- น้ำมัน x2
    (v_sale, '22222222-0000-0000-0000-000000000017',  4, 20.00,  80.00);  -- เลย์ x4 (168+72+110+80=430... adjust: 168+72+110+82=432 → เลย์ x4.1?? Let me just adjust total)

  -- ── Sale 6 · 2 days ago · walk-in · cash · ฿89 ───────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, NULL, 89.00, 'cash', 'completed', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000008', 1, 45.00, 45.00),  -- ข้าวกล่อง x1
    (v_sale, '22222222-0000-0000-0000-000000000003', 1, 20.00, 20.00),  -- โค้ก x1
    (v_sale, '22222222-0000-0000-0000-000000000009', 1, 25.00, 25.00);  -- ซาลาเปา x1 (45+20+25=90≠89, adjust below)

  -- ── Sale 7 · 1 day ago · สมชาย · card · ฿121 ────────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_c1, 121.00, 'card', 'completed', NOW() - INTERVAL '1 day')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000014', 2, 25.00, 50.00),  -- สบู่ x2
    (v_sale, '22222222-0000-0000-0000-000000000015', 1, 39.00, 39.00),  -- แชมพู x1
    (v_sale, '22222222-0000-0000-0000-000000000004', 1, 20.00, 20.00),  -- เป๊ปซี่ x1
    (v_sale, '22222222-0000-0000-0000-000000000006', 1, 18.00, 18.00);  -- โอวัลติน x1 (50+39+20+18=127≠121, adjust)

  -- ── Sale 8 · today · walk-in · cash · ฿62 ───────────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, NULL, 62.00, 'cash', 'completed', NOW() - INTERVAL '3 hours')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000005', 2, 22.00, 44.00),  -- ชาเขียว x2
    (v_sale, '22222222-0000-0000-0000-000000000017', 1, 20.00, 20.00);  -- เลย์ x1 (44+20=64≠62)

  -- ── Sale 9 · today · สมหญิง · cash · VOIDED ─────────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_c2, 40.00, 'cash', 'voided', NOW() - INTERVAL '1 hour')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000001', 4, 7.00, 28.00),   -- น้ำดื่ม x4
    (v_sale, '22222222-0000-0000-0000-000000000007', 2, 6.00, 12.00);   -- มาม่า x2 (28+12=40 ✓ voided so stock not changed)

  -- ── Sale 10 · today · walk-in · transfer · ฿130 ─────────────
  INSERT INTO sales (id, user_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, NULL, 130.00, 'transfer', 'completed', NOW() - INTERVAL '30 minutes')
  RETURNING id INTO v_sale;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000011', 1, 95.00,  95.00),  -- ไข่ไก่ x1
    (v_sale, '22222222-0000-0000-0000-000000000010', 1, 18.00,  18.00),  -- นมสด x1
    (v_sale, '22222222-0000-0000-0000-000000000007', 1,  6.00,   6.00),  -- มาม่า x1
    (v_sale, '22222222-0000-0000-0000-000000000001', 1,  7.00,   7.00);  -- น้ำดื่ม x1 (95+18+6+7=126≠130)

END $$;

-- ── 8. Fix sale totals to match line items exactly ────────────
UPDATE sales s
SET total_amount = (
  SELECT COALESCE(SUM(subtotal), 0)
  FROM sale_items
  WHERE sale_id = s.id
);

-- ── 9. Deduct stock for completed sales ───────────────────────
-- (stock_logs + products.stock adjusted to reflect sales above)
DO $$
DECLARE
  r RECORD;
  v_cashier UUID;
BEGIN
  SELECT id INTO v_cashier FROM auth.users WHERE email = 'cashier@sea-pos.test';

  FOR r IN
    SELECT si.product_id, SUM(si.quantity) AS qty_sold
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.status = 'completed'
    GROUP BY si.product_id
  LOOP
    UPDATE products
    SET stock = GREATEST(0, stock - r.qty_sold)
    WHERE id = r.product_id;

    INSERT INTO stock_logs (product_id, change, reason, user_id)
    VALUES (r.product_id, -r.qty_sold, 'ยอดขาย (demo seed)', v_cashier);
  END LOOP;
END $$;

COMMIT;

-- ── Summary ───────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM categories)        AS categories,
  (SELECT COUNT(*) FROM products)          AS products,
  (SELECT COUNT(*) FROM customers)         AS customers,
  (SELECT COUNT(*) FROM suppliers)         AS suppliers,
  (SELECT COUNT(*) FROM sales)             AS sales,
  (SELECT COUNT(*) FROM sales
   WHERE status = 'completed')             AS completed_sales,
  (SELECT COUNT(*) FROM sales
   WHERE status = 'voided')                AS voided_sales,
  (SELECT SUM(total_amount) FROM sales
   WHERE status = 'completed')             AS total_revenue;
