-- Snapshot product cost at time of sale for COGS / gross-profit calculations.
-- NULL for historical sales (before this migration); those rows are excluded
-- from profit reports. New sales always populate the column.
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS cost_at_sale NUMERIC(12,2);

-- Partial index: only on rows where cost is known, for profit queries.
CREATE INDEX IF NOT EXISTS sale_items_cost_at_sale_idx
  ON sale_items (cost_at_sale)
  WHERE cost_at_sale IS NOT NULL;
