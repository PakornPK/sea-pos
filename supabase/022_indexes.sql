-- ============================================================
-- SEA-POS: Performance indexes (022)
--
-- Adds missing indexes on high-frequency query paths.
-- All use IF NOT EXISTS — safe to re-run.
-- ============================================================

-- user_branches: queried on EVERY request in loadUser() to resolve
-- the current user's branch list and default branch.
CREATE INDEX IF NOT EXISTS idx_user_branches_user_id
  ON user_branches (user_id);

-- product_stock: composite covering the POS in-stock query
-- (.eq branch_id, .gt quantity) and inventory JOIN.
CREATE INDEX IF NOT EXISTS idx_product_stock_product_branch
  ON product_stock (product_id, branch_id);

-- sale_items: JOIN in every receipt / sale-detail page.
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
  ON sale_items (sale_id);

-- sale_items: reverse lookup for product sales history / reports.
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
  ON sale_items (product_id);

-- sales: branch-scoped list queries and reports filter.
CREATE INDEX IF NOT EXISTS idx_sales_branch_id
  ON sales (branch_id);

-- sales: time-range ORDER BY used in every report query.
CREATE INDEX IF NOT EXISTS idx_sales_created_at
  ON sales (created_at DESC);

-- purchase_orders: branch filter on the purchasing page.
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id
  ON purchase_orders (branch_id);

-- purchase_order_items: JOIN in PO detail and receive flow.
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id
  ON purchase_order_items (po_id);

-- stock_logs: branch history list (ordered by time).
CREATE INDEX IF NOT EXISTS idx_stock_logs_branch_created
  ON stock_logs (branch_id, created_at DESC);

-- stock_logs: per-product history lookup.
CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id
  ON stock_logs (product_id);

-- products: category filter used by inventory page and POS search.
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products (category_id);
