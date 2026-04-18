-- Category type: controls where products in this category appear.
--   'sale'   → POS product grid only (default)
--   'option' → option/modifier linker only (ingredients, materials, consumables)
--   'both'   → appears in both POS grid and option linker

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'sale'
  CONSTRAINT categories_category_type_check
    CHECK (category_type IN ('sale', 'option', 'both'));
