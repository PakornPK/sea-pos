-- ============================================================
-- SEA-POS: Held sales / พักบิล (021)
--
-- A cashier-side feature for parking an in-progress sale and serving the
-- next customer without blocking the lane. Held bills are NOT sales — stock
-- has not moved, no receipt number has been issued. On resume the cashier
-- loads the cart back into the POS and completes checkout through the
-- regular createSale path.
--
-- Kept in a separate table (not a `status='held'` on `sales`) so the sales
-- ledger, stock_logs, VAT reports, and receipt numbering stay clean.
--
-- Safe to run multiple times.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS held_sales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
              DEFAULT get_current_company_id(),
  branch_id   UUID NOT NULL REFERENCES branches(id)  ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),   -- cashier who held it
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  items       JSONB NOT NULL,
    -- [{ productId, name, price, quantity, vatExempt }]
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS held_sales_branch_idx   ON held_sales (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS held_sales_company_idx  ON held_sales (company_id);

ALTER TABLE held_sales ENABLE ROW LEVEL SECURITY;

-- Branch-aware RLS — a cashier sees/edits only holds at branches they're
-- assigned to. Company admins + platform admins see everything.
DROP POLICY IF EXISTS "held_sales_select" ON held_sales;
CREATE POLICY "held_sales_select" ON held_sales FOR SELECT TO authenticated
  USING (
    is_platform_admin()
    OR (
      company_id = get_current_company_id()
      AND (
        is_company_admin()
        OR branch_id IN (SELECT get_current_branch_ids())
      )
    )
  );

DROP POLICY IF EXISTS "held_sales_insert" ON held_sales;
CREATE POLICY "held_sales_insert" ON held_sales FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

DROP POLICY IF EXISTS "held_sales_delete" ON held_sales;
CREATE POLICY "held_sales_delete" ON held_sales FOR DELETE TO authenticated
  USING (
    company_id = get_current_company_id()
    AND get_user_role() IN ('admin', 'manager', 'cashier')
    AND (
      is_company_admin()
      OR branch_id IN (SELECT get_current_branch_ids())
    )
  );

-- We intentionally skip UPDATE. Resuming a held bill deletes the row; any
-- edits happen in the live cart. Update policy therefore stays absent,
-- which means no one can UPDATE — by design.

COMMIT;
