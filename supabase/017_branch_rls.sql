-- ============================================================
-- SEA-POS: Branch-aware RLS (017)
--
-- Tightens RLS on sales / purchase_orders / stock_logs and their child
-- tables. Before this migration, any authenticated user in a company could
-- SELECT / mutate rows from every branch of that company. After: a user can
-- only touch rows at a branch they're assigned to, UNLESS they are:
--   - a company admin (is_company_admin())
--   - a platform admin (is_platform_admin())
-- who keep full cross-branch access.
--
-- UI continues to filter by `activeBranchId` — this is a defense-in-depth
-- layer so a compromised or hand-rolled client can't bypass the filter.
--
-- Safe to run multiple times.
-- ============================================================

BEGIN;

-- ── sales ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sales_select" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT
  TO authenticated USING (
    is_platform_admin()
    OR (
      company_id = get_current_company_id()
      AND (
        is_company_admin()
        OR branch_id IN (SELECT get_current_branch_ids())
      )
    )
  );

DROP POLICY IF EXISTS "sales_insert" ON sales;
CREATE POLICY "sales_insert" ON sales FOR INSERT
  TO authenticated WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

DROP POLICY IF EXISTS "sales_update" ON sales;
CREATE POLICY "sales_update" ON sales FOR UPDATE
  TO authenticated USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

-- ── sale_items (inherits via sales) ──────────────────────────
DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT
  TO authenticated USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
        AND s.company_id = get_current_company_id()
        AND (
          is_company_admin()
          OR s.branch_id IN (SELECT get_current_branch_ids())
        )
    )
  );

DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT
  TO authenticated WITH CHECK (
    get_user_role() IN ('admin', 'manager', 'cashier')
    AND EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
        AND s.company_id = get_current_company_id()
        AND (
          is_company_admin()
          OR s.branch_id IN (SELECT get_current_branch_ids())
        )
    )
  );

-- ── purchase_orders ──────────────────────────────────────────
DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  TO authenticated USING (
    is_platform_admin()
    OR (
      company_id = get_current_company_id()
      AND (
        is_company_admin()
        OR branch_id IN (SELECT get_current_branch_ids())
      )
    )
  );

DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT
  TO authenticated WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;
CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE
  TO authenticated USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'purchasing')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

-- ── purchase_order_items (inherits via purchase_orders) ──────
DROP POLICY IF EXISTS "purchase_order_items_select" ON purchase_order_items;
CREATE POLICY "purchase_order_items_select" ON purchase_order_items FOR SELECT
  TO authenticated USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM purchase_orders p
      WHERE p.id = po_id
        AND p.company_id = get_current_company_id()
        AND (
          is_company_admin()
          OR p.branch_id IN (SELECT get_current_branch_ids())
        )
    )
  );

DROP POLICY IF EXISTS "purchase_order_items_insert" ON purchase_order_items;
CREATE POLICY "purchase_order_items_insert" ON purchase_order_items FOR INSERT
  TO authenticated WITH CHECK (
    get_user_role() IN ('admin', 'manager', 'purchasing')
    AND EXISTS (
      SELECT 1 FROM purchase_orders p
      WHERE p.id = po_id
        AND p.company_id = get_current_company_id()
        AND (
          is_company_admin()
          OR p.branch_id IN (SELECT get_current_branch_ids())
        )
    )
  );

DROP POLICY IF EXISTS "purchase_order_items_update" ON purchase_order_items;
CREATE POLICY "purchase_order_items_update" ON purchase_order_items FOR UPDATE
  TO authenticated USING (
    get_user_role() IN ('admin', 'manager', 'purchasing')
    AND EXISTS (
      SELECT 1 FROM purchase_orders p
      WHERE p.id = po_id
        AND p.company_id = get_current_company_id()
        AND (
          is_company_admin()
          OR p.branch_id IN (SELECT get_current_branch_ids())
        )
    )
  );

DROP POLICY IF EXISTS "purchase_order_items_delete" ON purchase_order_items;
CREATE POLICY "purchase_order_items_delete" ON purchase_order_items FOR DELETE
  TO authenticated USING (
    get_user_role() IN ('admin', 'manager', 'purchasing')
    AND EXISTS (
      SELECT 1 FROM purchase_orders p
      WHERE p.id = po_id
        AND p.company_id = get_current_company_id()
        AND (
          is_company_admin()
          OR p.branch_id IN (SELECT get_current_branch_ids())
        )
    )
  );

-- ── stock_logs ───────────────────────────────────────────────
-- NOTE: stock_logs is a ledger. Admins MUST see all branches for reports;
-- non-admins only see their branches. INSERTs usually happen inside
-- SECURITY DEFINER RPCs (decrement_stock, receive_po_item, transfer RPCs),
-- which bypass RLS — but we still constrain the direct INSERT policy for
-- hand-rolled writes like adjustStock.
DROP POLICY IF EXISTS "stock_logs_select" ON stock_logs;
CREATE POLICY "stock_logs_select" ON stock_logs FOR SELECT
  TO authenticated USING (
    is_platform_admin()
    OR (
      company_id = get_current_company_id()
      AND (
        is_company_admin()
        OR branch_id IN (SELECT get_current_branch_ids())
      )
    )
  );

DROP POLICY IF EXISTS "stock_logs_insert" ON stock_logs;
CREATE POLICY "stock_logs_insert" ON stock_logs FOR INSERT
  TO authenticated WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier', 'purchasing')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

COMMIT;
