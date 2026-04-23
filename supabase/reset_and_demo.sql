-- ============================================================
-- SEA-POS: Demo Reset & Seed (multi-branch)
-- ⚠️  CAUTION: Deletes ALL product, sales, and customer data
-- Safe to run multiple times (idempotent)
--
-- Assumes migrations up to 045 have been applied.
-- ============================================================

BEGIN;

-- ── 1. Clear all transactional data ──────────────────────────
TRUNCATE TABLE
  sale_item_options,
  stock_transfer_items,
  stock_transfers,
  purchase_order_items,
  purchase_orders,
  sale_items,
  sales,
  held_sales,
  stock_logs,
  product_stock,
  user_branches,
  options,
  option_groups,
  product_cost_items,
  branches,
  products,
  categories,
  suppliers,
  customers,
  member_points_log,
  members
CASCADE;

-- Reset sequences
ALTER SEQUENCE IF EXISTS receipt_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_orders_po_number_seq RESTART WITH 1;

-- ── 1b. Demo company (multi-tenancy root) ────────────────────
DELETE FROM companies WHERE slug = 'sea-pos-demo';
INSERT INTO companies (id, name, slug, plan, settings)
VALUES (
  '99999999-0000-0000-0000-000000000001',
  'SEA-POS Demo Store',
  'sea-pos-demo',
  'standard_pro',
  jsonb_build_object(
    'vat_mode', 'excluded',
    'vat_rate', 7,
    'allow_negative_stock', true
  )
);

-- ── 1c. Override company_id default for the seeding transaction ──
ALTER TABLE categories           ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE products             ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE customers            ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE suppliers            ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE sales                ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE purchase_orders      ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE stock_logs           ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE branches             ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE product_stock        ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE user_branches        ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE stock_transfers      ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE option_groups        ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';
ALTER TABLE product_cost_items   ALTER COLUMN company_id SET DEFAULT '99999999-0000-0000-0000-000000000001';

-- ── 1d. Branches ─────────────────────────────────────────────
INSERT INTO branches (id, code, name, address, phone, is_default) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'B01', 'สาขาหลัก', '123 ถ.สุขุมวิท กรุงเทพฯ', '02-111-1111', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'B02', 'สาขาสยาม', '456 ถ.พระราม 1 กรุงเทพฯ', '02-222-2222', false);

-- ── 2. Categories ─────────────────────────────────────────────
INSERT INTO categories (id, name, company_id) VALUES
  ('11111111-0000-0000-0000-000000000001', 'เครื่องดื่ม',  '99999999-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'อาหาร',        '99999999-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000003', 'ของสด',        '99999999-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000004', 'ของใช้',       '99999999-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000005', 'ขนม',          '99999999-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000006', 'วัตถุดิบ',     '99999999-0000-0000-0000-000000000001');

UPDATE categories SET sku_prefix = 'DRK' WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE categories SET sku_prefix = 'FOD' WHERE id = '11111111-0000-0000-0000-000000000002';
UPDATE categories SET sku_prefix = 'FRS' WHERE id = '11111111-0000-0000-0000-000000000003';
UPDATE categories SET sku_prefix = 'HSH' WHERE id = '11111111-0000-0000-0000-000000000004';
UPDATE categories SET sku_prefix = 'SNK' WHERE id = '11111111-0000-0000-0000-000000000005';
UPDATE categories SET sku_prefix = 'ING' WHERE id = '11111111-0000-0000-0000-000000000006';

-- ── 3. Products ───────────────────────────────────────────────
-- unit     = stock/display unit
-- po_unit  = purchase unit (null = same as stock unit)
-- po_conversion = how many stock units per 1 PO unit (1 = same)
INSERT INTO products (id, sku, name, category_id, price, cost, min_stock, unit, po_unit, po_conversion) VALUES
  -- เครื่องดื่ม (ขาย → ชิ้น, ซื้อ → ชิ้น)
  ('22222222-0000-0000-0000-000000000001', 'WAT-600',  'น้ำดื่มตราช้าง 600ml',      '11111111-0000-0000-0000-000000000001',  7.00,  4.50, 20, 'ขวด',  NULL,  1),
  ('22222222-0000-0000-0000-000000000002', 'WAT-1500', 'น้ำดื่มตราช้าง 1.5L',       '11111111-0000-0000-0000-000000000001', 12.00,  8.00, 15, 'ขวด',  NULL,  1),
  ('22222222-0000-0000-0000-000000000003', 'COK-325',  'โค้ก 325ml กระป๋อง',        '11111111-0000-0000-0000-000000000001', 20.00, 14.00, 12, 'กระป๋อง', NULL, 1),
  ('22222222-0000-0000-0000-000000000004', 'PEP-325',  'เป๊ปซี่ 325ml กระป๋อง',     '11111111-0000-0000-0000-000000000001', 20.00, 14.00, 10, 'กระป๋อง', NULL, 1),
  ('22222222-0000-0000-0000-000000000005', 'TEA-450',  'ชาเขียวพร้อมดื่ม 450ml',   '11111111-0000-0000-0000-000000000001', 22.00, 15.00, 10, 'ขวด',  NULL,  1),
  ('22222222-0000-0000-0000-000000000006', 'OVL-225',  'โอวัลตินUHT 225ml',         '11111111-0000-0000-0000-000000000001', 18.00, 12.00,  8, 'กล่อง', NULL, 1),
  -- อาหาร
  ('22222222-0000-0000-0000-000000000007', 'MAM-001',  'บะหมี่กึ่งสำเร็จรูป มาม่า', '11111111-0000-0000-0000-000000000002',  6.00,  3.50, 30, 'ซอง',  'ลัง', 30),
  ('22222222-0000-0000-0000-000000000008', 'RCE-001',  'ข้าวกล่องไมโครเวฟ',         '11111111-0000-0000-0000-000000000002', 45.00, 32.00,  5, 'กล่อง', NULL, 1),
  ('22222222-0000-0000-0000-000000000009', 'PAO-001',  'ซาลาเปา (2 ชิ้น)',          '11111111-0000-0000-0000-000000000002', 25.00, 18.00,  8, 'ชิ้น',  NULL, 1),
  -- ของสด
  ('22222222-0000-0000-0000-000000000010', 'MLK-MEI',  'นมสด Meiji 250ml',          '11111111-0000-0000-0000-000000000003', 18.00, 12.00, 10, 'กล่อง', NULL, 1),
  ('22222222-0000-0000-0000-000000000011', 'EGG-002',  'ไข่ไก่เบอร์ 2 (แผง 30 ฟอง)','11111111-0000-0000-0000-000000000003', 95.00, 80.00,  3, 'แผง',  NULL, 1),
  ('22222222-0000-0000-0000-000000000012', 'BAN-001',  'กล้วยหอม (หวี)',             '11111111-0000-0000-0000-000000000003', 30.00, 22.00,  5, 'หวี',  NULL, 1),
  -- ของใช้
  ('22222222-0000-0000-0000-000000000013', 'OIL-001',  'น้ำมันพืช 1L',              '11111111-0000-0000-0000-000000000004', 55.00, 40.00,  5, 'ขวด',  NULL, 1),
  ('22222222-0000-0000-0000-000000000014', 'SBU-LUX',  'สบู่ก้อน Lux 90g',          '11111111-0000-0000-0000-000000000004', 25.00, 18.00,  5, 'ก้อน',  NULL, 1),
  ('22222222-0000-0000-0000-000000000015', 'SHP-SUN',  'แชมพู Sunsilk 80ml',        '11111111-0000-0000-0000-000000000004', 39.00, 28.00,  5, 'ขวด',  NULL, 1),
  -- ขนม
  ('22222222-0000-0000-0000-000000000016', 'BRD-001',  'ขนมปังแผ่น ไทยเบเกอรี่',   '11111111-0000-0000-0000-000000000005', 35.00, 25.00,  5, 'ห่อ',   NULL, 1),
  ('22222222-0000-0000-0000-000000000017', 'LAY-001',  'เลย์ Original 26g',         '11111111-0000-0000-0000-000000000005', 20.00, 13.00, 10, 'ซอง',  'ลัง', 48),
  ('22222222-0000-0000-0000-000000000018', 'ORE-001',  'โอรีโอ 1 แพ็ค',             '11111111-0000-0000-0000-000000000005', 30.00, 22.00,  8, 'แพ็ค', NULL, 1),
  -- วัตถุดิบ (demo PO conversion: ซื้อ กก., ตัดสต๊อก กรัม)
  ('22222222-0000-0000-0000-000000000019', 'ING-COF',  'กาแฟอาราบิก้าคั่วบด',       '11111111-0000-0000-0000-000000000006',  0.00, 0.80, 500, 'กรัม', 'กก.', 1000),
  ('22222222-0000-0000-0000-000000000020', 'ING-MLK',  'นมสดสำหรับทำเครื่องดื่ม',  '11111111-0000-0000-0000-000000000006',  0.00, 0.04, 2000, 'มล.', 'ลิตร', 1000);

UPDATE products SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- Fake EAN-13 barcodes (demo only)
UPDATE products SET barcode = '8851001100016' WHERE id = '22222222-0000-0000-0000-000000000001';
UPDATE products SET barcode = '8851001100023' WHERE id = '22222222-0000-0000-0000-000000000002';
UPDATE products SET barcode = '8851002100013' WHERE id = '22222222-0000-0000-0000-000000000003';
UPDATE products SET barcode = '8851002100020' WHERE id = '22222222-0000-0000-0000-000000000004';
UPDATE products SET barcode = '8851003100010' WHERE id = '22222222-0000-0000-0000-000000000005';
UPDATE products SET barcode = '8851003100027' WHERE id = '22222222-0000-0000-0000-000000000006';
UPDATE products SET barcode = '8851004100017' WHERE id = '22222222-0000-0000-0000-000000000007';
UPDATE products SET barcode = '8851004100024' WHERE id = '22222222-0000-0000-0000-000000000008';
UPDATE products SET barcode = '8851004100031' WHERE id = '22222222-0000-0000-0000-000000000009';
UPDATE products SET barcode = '8851005100014' WHERE id = '22222222-0000-0000-0000-000000000010';
UPDATE products SET barcode = '8851005100021' WHERE id = '22222222-0000-0000-0000-000000000011';
UPDATE products SET barcode = '8851005100038' WHERE id = '22222222-0000-0000-0000-000000000012';
UPDATE products SET barcode = '8851006100011' WHERE id = '22222222-0000-0000-0000-000000000013';
UPDATE products SET barcode = '8851006100028' WHERE id = '22222222-0000-0000-0000-000000000014';
UPDATE products SET barcode = '8851006100035' WHERE id = '22222222-0000-0000-0000-000000000015';
UPDATE products SET barcode = '8851007100018' WHERE id = '22222222-0000-0000-0000-000000000016';
UPDATE products SET barcode = '8851007100025' WHERE id = '22222222-0000-0000-0000-000000000017';
UPDATE products SET barcode = '8851007100032' WHERE id = '22222222-0000-0000-0000-000000000018';

-- ── 3b. Seed per-branch stock ─────────────────────────────────
INSERT INTO product_stock (product_id, branch_id, quantity) VALUES
  ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 120),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',  80),
  ('22222222-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',  60),
  ('22222222-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',  45),
  ('22222222-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',  50),
  ('22222222-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001',  40),
  ('22222222-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 200),
  ('22222222-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001',  30),
  ('22222222-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001',  40),
  ('22222222-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001',  50),
  ('22222222-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001',  15),
  ('22222222-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001',  20),
  ('22222222-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001',  25),
  ('22222222-0000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-000000000001',  30),
  ('22222222-0000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-000000000001',  25),
  ('22222222-0000-0000-0000-000000000016', 'aaaaaaaa-0000-0000-0000-000000000001',  20),
  ('22222222-0000-0000-0000-000000000017', 'aaaaaaaa-0000-0000-0000-000000000001',  60),
  ('22222222-0000-0000-0000-000000000018', 'aaaaaaaa-0000-0000-0000-000000000001',  40),
  -- วัตถุดิบ (in grams / ml)
  ('22222222-0000-0000-0000-000000000019', 'aaaaaaaa-0000-0000-0000-000000000001', 2000),  -- 2 kg กาแฟ
  ('22222222-0000-0000-0000-000000000020', 'aaaaaaaa-0000-0000-0000-000000000001', 5000),  -- 5 L นม
  -- Branch B02: smaller volume
  ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002',  60),
  ('22222222-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002',  30),
  ('22222222-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000002', 100),
  ('22222222-0000-0000-0000-000000000017', 'aaaaaaaa-0000-0000-0000-000000000002',  30);

-- ── 3c. Option groups & options (demo: เครื่องดื่ม size + sweetness) ──
-- option group for น้ำดื่มตราช้าง 600ml: ขนาด (no linked stock)
INSERT INTO option_groups (id, product_id, name, required, multi_select) VALUES
  ('cccccccc-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'ขนาด',      true,  false),
  ('cccccccc-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 'ความหวาน',  false, false),
  -- option group for มาม่า: ไข่ + ผักเพิ่ม
  ('cccccccc-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000007', 'เพิ่มเติม', false, true);

INSERT INTO options (id, group_id, name, price_delta, linked_product_id, quantity_per_use) VALUES
  -- ขนาดโค้ก
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'กระป๋องเล็ก (325ml)', 0.00,  NULL, 1),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'ขวดใหญ่ (600ml)',    10.00, NULL, 1),
  -- ความหวานโค้ก
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', 'หวานปกติ',  0.00, NULL, 1),
  ('dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002', 'หวานน้อย',  0.00, NULL, 1),
  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000002', 'ไม่หวาน',   0.00, NULL, 1),
  -- เพิ่มเติมมาม่า (ไข่ตัดสต๊อกจากสินค้าหลัก)
  ('dddddddd-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000003', 'เพิ่มไข่',  5.00, '22222222-0000-0000-0000-000000000011', 0.033),
  ('dddddddd-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000003', 'เพิ่มผัก',  3.00, NULL, 1),
  ('dddddddd-0000-0000-0000-000000000008', 'cccccccc-0000-0000-0000-000000000003', 'เพิ่มหมู',  8.00, NULL, 1);

-- ── 3d. Product cost items (BOM demo) ────────────────────────
-- มาม่า: ซอง + ผัก (fixed costs, no linked product)
INSERT INTO product_cost_items (product_id, name, quantity, unit_cost, sort_order) VALUES
  ('22222222-0000-0000-0000-000000000007', 'ซอง + เครื่องปรุง', 1,   3.50, 0),
  ('22222222-0000-0000-0000-000000000007', 'แก๊ส/ไฟ',           1,   0.50, 1);

-- ข้าวกล่องไมโครเวฟ
INSERT INTO product_cost_items (product_id, name, quantity, unit_cost, sort_order) VALUES
  ('22222222-0000-0000-0000-000000000008', 'ข้าวกล่อง',          1,  28.00, 0),
  ('22222222-0000-0000-0000-000000000008', 'ค่าไฟไมโครเวฟ',      1,   1.00, 1);

-- วัตถุดิบคาเฟ่: กาแฟ 18g + น้ำ 200ml (linked to ingredient products)
INSERT INTO product_cost_items (product_id, name, quantity, unit_cost, linked_product_id, sort_order) VALUES
  ('22222222-0000-0000-0000-000000000001', 'ถ้วย + ฝา',          1,   2.00, NULL, 0),
  ('22222222-0000-0000-0000-000000000001', 'กาแฟ',              18,   0.80,
     '22222222-0000-0000-0000-000000000019', 1),
  ('22222222-0000-0000-0000-000000000001', 'นม',               150,   0.04,
     '22222222-0000-0000-0000-000000000020', 2);

-- Sync products.cost to match BOM total
UPDATE products SET cost = 4.00  WHERE id = '22222222-0000-0000-0000-000000000007';  -- 3.50+0.50
UPDATE products SET cost = 29.00 WHERE id = '22222222-0000-0000-0000-000000000008';  -- 28+1
UPDATE products SET cost = 22.40 WHERE id = '22222222-0000-0000-0000-000000000001';  -- 2+14.4+6

-- ── 4. Customers ──────────────────────────────────────────────
INSERT INTO customers (id, name, phone, email) VALUES
  ('33333333-0000-0000-0000-000000000001', 'สมชาย ใจดี',        '0812345678', 'somchai@example.com'),
  ('33333333-0000-0000-0000-000000000002', 'สมหญิง รักดี',      '0898765432', NULL),
  ('33333333-0000-0000-0000-000000000003', 'บริษัท ABC จำกัด',  '025551234',  'info@abc.co.th');
UPDATE customers SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- ── 5. Suppliers ──────────────────────────────────────────────
INSERT INTO suppliers (name, contact_name, phone, email) VALUES
  ('บริษัท สยามฟู้ด จำกัด',       'คุณวิชัย', '0812222333', 'wichai@siamfood.co.th'),
  ('ห้างส่งสินค้าอุดม',            'คุณอุดม',  '025551111',  NULL),
  ('บริษัท เครื่องดื่มไทย จำกัด',  'คุณนภา',   '0899991234', 'napa@thaidrink.co.th');
UPDATE suppliers SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

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
      '{"role":"admin","full_name":"ผู้ดูแลระบบ","company_id":"99999999-0000-0000-0000-000000000001"}',
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
      '{"role":"manager","full_name":"ผู้จัดการร้าน","company_id":"99999999-0000-0000-0000-000000000001"}',
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
      '{"role":"cashier","full_name":"พนักงานเก็บเงิน","company_id":"99999999-0000-0000-0000-000000000001"}',
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
      '{"role":"purchasing","full_name":"เจ้าหน้าที่จัดซื้อ","company_id":"99999999-0000-0000-0000-000000000001"}',
      NOW(), NOW(), '', '', '', ''
    );
  END IF;

  INSERT INTO public.profiles (id, role, first_name, last_name, full_name, company_id)
  SELECT u.id,
         CASE u.email
           WHEN 'admin@sea-pos.test'      THEN 'admin'
           WHEN 'manager@sea-pos.test'    THEN 'manager'
           WHEN 'cashier@sea-pos.test'    THEN 'cashier'
           WHEN 'purchasing@sea-pos.test' THEN 'purchasing'
         END,
         CASE u.email
           WHEN 'admin@sea-pos.test'      THEN 'ผู้ดูแล'
           WHEN 'manager@sea-pos.test'    THEN 'ผู้จัดการ'
           WHEN 'cashier@sea-pos.test'    THEN 'พนักงาน'
           WHEN 'purchasing@sea-pos.test' THEN 'เจ้าหน้าที่'
         END,
         CASE u.email
           WHEN 'admin@sea-pos.test'      THEN 'ระบบ'
           WHEN 'manager@sea-pos.test'    THEN 'ร้าน'
           WHEN 'cashier@sea-pos.test'    THEN 'เก็บเงิน'
           WHEN 'purchasing@sea-pos.test' THEN 'จัดซื้อ'
         END,
         CASE u.email
           WHEN 'admin@sea-pos.test'      THEN 'ผู้ดูแลระบบ'
           WHEN 'manager@sea-pos.test'    THEN 'ผู้จัดการร้าน'
           WHEN 'cashier@sea-pos.test'    THEN 'พนักงานเก็บเงิน'
           WHEN 'purchasing@sea-pos.test' THEN 'เจ้าหน้าที่จัดซื้อ'
         END,
         '99999999-0000-0000-0000-000000000001'
  FROM auth.users u
  WHERE u.email IN (
    'admin@sea-pos.test',
    'manager@sea-pos.test',
    'cashier@sea-pos.test',
    'purchasing@sea-pos.test'
  )
  ON CONFLICT (id) DO UPDATE
    SET role       = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        full_name  = EXCLUDED.full_name,
        company_id = EXCLUDED.company_id;
END $$;

-- ── 6b. Assign test users to branches ─────────────────────────
INSERT INTO user_branches (user_id, branch_id, is_default)
SELECT u.id, 'aaaaaaaa-0000-0000-0000-000000000001', true
FROM auth.users u
WHERE u.email IN (
  'admin@sea-pos.test',
  'manager@sea-pos.test',
  'cashier@sea-pos.test',
  'purchasing@sea-pos.test'
);

INSERT INTO user_branches (user_id, branch_id, is_default)
SELECT u.id, 'aaaaaaaa-0000-0000-0000-000000000002', false
FROM auth.users u
WHERE u.email IN ('admin@sea-pos.test', 'manager@sea-pos.test');

-- ── 7. Demo sales history (B01) ───────────────────────────────
DO $$
DECLARE
  v_cashier   UUID;
  v_admin     UUID;
  v_branch    UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_c1        UUID := '33333333-0000-0000-0000-000000000001';
  v_c2        UUID := '33333333-0000-0000-0000-000000000002';
  v_c3        UUID := '33333333-0000-0000-0000-000000000003';
  v_sale      UUID;
BEGIN
  SELECT id INTO v_cashier FROM auth.users WHERE email = 'cashier@sea-pos.test';
  SELECT id INTO v_admin   FROM auth.users WHERE email = 'admin@sea-pos.test';

  -- Sale 1 · 6 days ago · walk-in · cash
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, NULL, 54.00, 'cash', 'completed', NOW() - INTERVAL '6 days')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000001', 6, 7.00, 42.00, 4.50),
    (v_sale, '22222222-0000-0000-0000-000000000007', 2, 6.00, 12.00, 3.50);

  -- Sale 2 · 5 days ago · สมชาย · card
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, v_c1, 168.00, 'card', 'completed', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000003', 3, 20.00, 60.00, 14.00),
    (v_sale, '22222222-0000-0000-0000-000000000016', 2, 35.00, 70.00, 25.00),
    (v_sale, '22222222-0000-0000-0000-000000000017', 1, 20.00, 20.00, 13.00),
    (v_sale, '22222222-0000-0000-0000-000000000006', 1, 18.00, 18.00, 12.00);

  -- Sale 3 · 4 days ago · สมหญิง · transfer
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, v_c2, 185.00, 'transfer', 'completed', NOW() - INTERVAL '4 days')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000010', 3, 18.00, 54.00, 12.00),
    (v_sale, '22222222-0000-0000-0000-000000000011', 1, 95.00, 95.00, 80.00),
    (v_sale, '22222222-0000-0000-0000-000000000012', 1, 30.00, 30.00, 22.00),
    (v_sale, '22222222-0000-0000-0000-000000000007', 1,  6.00,  6.00,  3.50);

  -- Sale 4 · 4 days ago · walk-in · cash
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, NULL, 98.00, 'cash', 'completed', NOW() - INTERVAL '4 days')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000002', 2, 12.00, 24.00,  8.00),
    (v_sale, '22222222-0000-0000-0000-000000000005', 2, 22.00, 44.00, 15.00),
    (v_sale, '22222222-0000-0000-0000-000000000018', 1, 30.00, 30.00, 22.00);

  -- Sale 5 · 3 days ago · บริษัท ABC · transfer (large)
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_admin, v_branch, v_c3, 430.00, 'transfer', 'completed', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000001', 24,  7.00, 168.00,  4.50),
    (v_sale, '22222222-0000-0000-0000-000000000007', 12,  6.00,  72.00,  3.50),
    (v_sale, '22222222-0000-0000-0000-000000000013',  2, 55.00, 110.00, 40.00),
    (v_sale, '22222222-0000-0000-0000-000000000017',  4, 20.00,  80.00, 13.00);

  -- Sale 6 · 2 days ago · walk-in · cash
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, NULL, 90.00, 'cash', 'completed', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000008', 1, 45.00, 45.00, 32.00),
    (v_sale, '22222222-0000-0000-0000-000000000003', 1, 20.00, 20.00, 14.00),
    (v_sale, '22222222-0000-0000-0000-000000000009', 1, 25.00, 25.00, 18.00);

  -- Sale 7 · 1 day ago · สมชาย · card
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, v_c1, 127.00, 'card', 'completed', NOW() - INTERVAL '1 day')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000014', 2, 25.00, 50.00, 18.00),
    (v_sale, '22222222-0000-0000-0000-000000000015', 1, 39.00, 39.00, 28.00),
    (v_sale, '22222222-0000-0000-0000-000000000004', 1, 20.00, 20.00, 14.00),
    (v_sale, '22222222-0000-0000-0000-000000000006', 1, 18.00, 18.00, 12.00);

  -- Sale 8 · today · walk-in · cash
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, NULL, 64.00, 'cash', 'completed', NOW() - INTERVAL '3 hours')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000005', 2, 22.00, 44.00, 15.00),
    (v_sale, '22222222-0000-0000-0000-000000000017', 1, 20.00, 20.00, 13.00);

  -- Sale 9 · today · สมหญิง · cash · VOIDED
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, v_c2, 40.00, 'cash', 'voided', NOW() - INTERVAL '1 hour')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000001', 4, 7.00, 28.00, 4.50),
    (v_sale, '22222222-0000-0000-0000-000000000007', 2, 6.00, 12.00, 3.50);

  -- Sale 10 · today · walk-in · transfer
  INSERT INTO sales (id, user_id, branch_id, customer_id, total_amount, payment_method, status, created_at)
  VALUES (gen_random_uuid(), v_cashier, v_branch, NULL, 126.00, 'transfer', 'completed', NOW() - INTERVAL '30 minutes')
  RETURNING id INTO v_sale;
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_at_sale) VALUES
    (v_sale, '22222222-0000-0000-0000-000000000011', 1, 95.00, 95.00, 80.00),
    (v_sale, '22222222-0000-0000-0000-000000000010', 1, 18.00, 18.00, 12.00),
    (v_sale, '22222222-0000-0000-0000-000000000007', 1,  6.00,  6.00,  3.50),
    (v_sale, '22222222-0000-0000-0000-000000000001', 1,  7.00,  7.00,  4.50);

END $$;

UPDATE sales SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- ── 8. Fix sale totals to match line items exactly ────────────
UPDATE sales s
SET total_amount = (
  SELECT COALESCE(SUM(subtotal), 0)
  FROM sale_items
  WHERE sale_id = s.id
);

UPDATE sales
SET    subtotal_ex_vat = ROUND(total_amount / 1.07, 2),
       vat_amount      = ROUND(total_amount - total_amount / 1.07, 2)
WHERE  status = 'completed';

-- ── 9. Deduct B01 stock for completed sales + log movements ───
DO $$
DECLARE
  r         RECORD;
  v_cashier UUID;
  v_branch  UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO v_cashier FROM auth.users WHERE email = 'cashier@sea-pos.test';

  FOR r IN
    SELECT si.product_id, SUM(si.quantity) AS qty_sold
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.status = 'completed'
    GROUP BY si.product_id
  LOOP
    UPDATE product_stock
    SET    quantity = GREATEST(0, quantity - r.qty_sold)
    WHERE  product_id = r.product_id AND branch_id = v_branch;

    INSERT INTO stock_logs (product_id, branch_id, change, reason, user_id)
    VALUES (r.product_id, v_branch, -r.qty_sold, 'ยอดขาย (demo seed)', v_cashier);
  END LOOP;
END $$;

UPDATE stock_logs SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- ── 9b. Demo purchase orders ──────────────────────────────────
DO $$
DECLARE
  v_purchasing UUID;
  v_branch     UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_supplier1  UUID;
  v_supplier2  UUID;
  v_po         UUID;
  v_net        NUMERIC(12, 2);
  v_vat        NUMERIC(12, 2);
  v_total      NUMERIC(12, 2);
BEGIN
  SELECT id INTO v_purchasing FROM auth.users WHERE email = 'purchasing@sea-pos.test';
  SELECT id INTO v_supplier1 FROM suppliers WHERE name = 'บริษัท สยามฟู้ด จำกัด' LIMIT 1;
  SELECT id INTO v_supplier2 FROM suppliers WHERE name = 'บริษัท เครื่องดื่มไทย จำกัด' LIMIT 1;

  -- PO 1 — สยามฟู้ด · received 5 days ago
  v_net   := 50 * 3.50 + 20 * 18.00;
  v_vat   := ROUND(v_net * 0.07, 2);
  v_total := v_net + v_vat;
  v_po    := gen_random_uuid();

  INSERT INTO purchase_orders (
    id, supplier_id, user_id, branch_id, status,
    total_amount, subtotal_ex_vat, vat_amount, notes,
    confirmed_by_user_id,
    ordered_at, received_at, created_at
  ) VALUES (
    v_po, v_supplier1, v_purchasing, v_branch, 'received',
    v_total, v_net, v_vat, 'ล็อตมาม่า + ข้าวกล่อง (demo seed)',
    v_purchasing,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days'
  );
  INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, quantity_received, unit_cost) VALUES
    (v_po, '22222222-0000-0000-0000-000000000007', 50, 50,  3.50),
    (v_po, '22222222-0000-0000-0000-000000000008', 20, 20, 18.00);

  -- PO 2 — เครื่องดื่มไทย · received 2 days ago
  v_net   := 100 * 4.50 + 40 * 8.00;
  v_vat   := ROUND(v_net * 0.07, 2);
  v_total := v_net + v_vat;
  v_po    := gen_random_uuid();

  INSERT INTO purchase_orders (
    id, supplier_id, user_id, branch_id, status,
    total_amount, subtotal_ex_vat, vat_amount, notes,
    confirmed_by_user_id,
    ordered_at, received_at, created_at
  ) VALUES (
    v_po, v_supplier2, v_purchasing, v_branch, 'received',
    v_total, v_net, v_vat, 'ล็อตน้ำดื่ม (demo seed)',
    v_purchasing,
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days'
  );
  INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, quantity_received, unit_cost) VALUES
    (v_po, '22222222-0000-0000-0000-000000000001', 100, 100, 4.50),
    (v_po, '22222222-0000-0000-0000-000000000002',  40,  40, 8.00);

  -- PO 3 — วัตถุดิบคาเฟ่ · received 3 days ago (PO unit = กก., stock unit = กรัม)
  v_net   := 2 * 800.00 + 5 * 40.00;   -- 2 kg กาแฟ + 5 L นม
  v_vat   := ROUND(v_net * 0.07, 2);
  v_total := v_net + v_vat;
  v_po    := gen_random_uuid();

  INSERT INTO purchase_orders (
    id, supplier_id, user_id, branch_id, status,
    total_amount, subtotal_ex_vat, vat_amount, notes,
    confirmed_by_user_id,
    ordered_at, received_at, created_at
  ) VALUES (
    v_po, v_supplier1, v_purchasing, v_branch, 'received',
    v_total, v_net, v_vat, 'วัตถุดิบคาเฟ่ (demo seed)',
    v_purchasing,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days'
  );
  -- quantity_ordered/received in PO units (กก./ลิตร)
  INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, quantity_received, unit_cost) VALUES
    (v_po, '22222222-0000-0000-0000-000000000019', 2, 2, 800.00),
    (v_po, '22222222-0000-0000-0000-000000000020', 5, 5,  40.00);

END $$;

UPDATE purchase_orders SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- ── 10. Demo stock transfer B01 → B02 (received) ──────────────
DO $$
DECLARE
  v_manager  UUID;
  v_from     UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_to       UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_transfer UUID := gen_random_uuid();
  v_short    TEXT;
  v_item     RECORD;
BEGIN
  SELECT id INTO v_manager FROM auth.users WHERE email = 'manager@sea-pos.test';
  v_short := LEFT(v_transfer::TEXT, 8);

  INSERT INTO stock_transfers (id, from_branch_id, to_branch_id, user_id, status, notes, created_at, received_at)
  VALUES (
    v_transfer, v_from, v_to, v_manager,
    'received',
    'เติมสต๊อกสาขาสยาม (demo seed)',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  );

  INSERT INTO stock_transfer_items (transfer_id, product_id, quantity_sent, quantity_received) VALUES
    (v_transfer, '22222222-0000-0000-0000-000000000005', 10, 10),
    (v_transfer, '22222222-0000-0000-0000-000000000018', 10, 10),
    (v_transfer, '22222222-0000-0000-0000-000000000014',  5,  5);

  FOR v_item IN
    SELECT product_id, quantity_sent FROM stock_transfer_items
    WHERE transfer_id = v_transfer
  LOOP
    UPDATE product_stock
    SET    quantity = GREATEST(0, quantity - v_item.quantity_sent)
    WHERE  product_id = v_item.product_id AND branch_id = v_from;

    INSERT INTO stock_logs (product_id, branch_id, change, reason, user_id, created_at)
    VALUES (
      v_item.product_id, v_from, -v_item.quantity_sent,
      'โอนออก (โอน #' || v_short || ')', v_manager,
      NOW() - INTERVAL '2 days'
    );

    INSERT INTO product_stock (product_id, branch_id, quantity)
    VALUES (v_item.product_id, v_to, v_item.quantity_sent)
    ON CONFLICT (product_id, branch_id)
    DO UPDATE SET quantity = product_stock.quantity + v_item.quantity_sent,
                  updated_at = NOW();

    INSERT INTO stock_logs (product_id, branch_id, change, reason, user_id, created_at)
    VALUES (
      v_item.product_id, v_to, v_item.quantity_sent,
      'รับโอน (โอน #' || v_short || ')', v_manager,
      NOW() - INTERVAL '1 day'
    );
  END LOOP;
END $$;

UPDATE stock_logs       SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE stock_transfers  SET company_id = '99999999-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- ── 11. Restore normal company_id defaults ─────────────────────
ALTER TABLE categories           ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE products             ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE customers            ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE suppliers            ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE sales                ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE purchase_orders      ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE stock_logs           ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE branches             ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE product_stock        ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE user_branches        ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE stock_transfers      ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE option_groups        ALTER COLUMN company_id SET DEFAULT get_current_company_id();
ALTER TABLE product_cost_items   ALTER COLUMN company_id SET DEFAULT get_current_company_id();

COMMIT;

-- ── Summary ───────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM branches)          AS branches,
  (SELECT COUNT(*) FROM categories)        AS categories,
  (SELECT COUNT(*) FROM products)          AS products,
  (SELECT COUNT(*) FROM product_stock)     AS stock_rows,
  (SELECT COUNT(*) FROM customers)         AS customers,
  (SELECT COUNT(*) FROM suppliers)         AS suppliers,
  (SELECT COUNT(*) FROM option_groups)       AS option_groups,
  (SELECT COUNT(*) FROM options)             AS options,
  (SELECT COUNT(*) FROM product_cost_items)  AS cost_items,
  (SELECT COUNT(*) FROM sales)             AS sales,
  (SELECT COUNT(*) FROM sales WHERE status = 'completed') AS completed_sales,
  (SELECT COUNT(*) FROM sales WHERE status = 'voided')    AS voided_sales,
  (SELECT COUNT(*) FROM stock_transfers)   AS transfers,
  (SELECT COUNT(*) FROM stock_logs)        AS stock_logs,
  (SELECT COUNT(*) FROM purchase_orders)   AS pos,
  (SELECT SUM(total_amount) FROM sales WHERE status = 'completed') AS total_revenue,
  (SELECT SUM(vat_amount)   FROM sales WHERE status = 'completed') AS vat_output,
  (SELECT SUM(vat_amount)   FROM purchase_orders WHERE status = 'received') AS vat_input;
