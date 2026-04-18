-- Drop the CHECK (quantity >= 0) constraint from product_stock so that
-- negative stock is permitted at the DB level.  The application layer
-- controls whether negative stock is allowed via the company setting
-- `allow_negative_stock` (default: true).  See 036_decrement_stock_allow_negative.sql.
ALTER TABLE product_stock
  DROP CONSTRAINT IF EXISTS product_stock_quantity_check;
