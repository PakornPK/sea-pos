-- Change stock quantities and log changes to NUMERIC(12,3) to support fractions.
-- Also change options.quantity_per_use and PO item quantities to NUMERIC.

ALTER TABLE product_stock
  ALTER COLUMN quantity TYPE NUMERIC(12,3);

ALTER TABLE stock_logs
  ALTER COLUMN change TYPE NUMERIC(12,3);

ALTER TABLE options
  ALTER COLUMN quantity_per_use TYPE NUMERIC(12,3) USING quantity_per_use::numeric;

ALTER TABLE purchase_order_items
  ALTER COLUMN quantity_ordered  TYPE NUMERIC(10,3) USING quantity_ordered::numeric,
  ALTER COLUMN quantity_received TYPE NUMERIC(10,3) USING quantity_received::numeric;
