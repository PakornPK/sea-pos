-- 043_category_type_cost.sql
-- Add 'cost' category type for BOM ingredients (consumables like cups, beans, etc.)
--   'cost'  → products used as BOM ingredients only; not shown in POS grid or option linker

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_category_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_category_type_check
  CHECK (category_type IN ('sale', 'option', 'both', 'cost'));
