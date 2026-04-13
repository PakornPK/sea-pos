-- ============================================================
-- SEA-POS: Purchasing module (006)
-- - Human-readable PO numbers (PO-00001)
-- - SECURITY DEFINER function: receive_po_item
--   (purchasing role can increment products.stock via this RPC)
-- Safe to run multiple times.
-- ============================================================

-- ── PO number sequence + column ───────────────────────────────
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS po_no INTEGER UNIQUE DEFAULT nextval('po_number_seq');

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill any NULL po_no values (pre-existing rows)
UPDATE purchase_orders SET po_no = nextval('po_number_seq') WHERE po_no IS NULL;

-- ── Receive one PO line item (atomic) ─────────────────────────
-- Increments products.stock + writes stock_logs + updates
-- purchase_order_items.quantity_received + flips PO status to
-- 'received' when all lines are fully received.
CREATE OR REPLACE FUNCTION receive_po_item(
  p_item_id UUID,
  p_qty     INTEGER,
  p_user_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_product_id   UUID;
  v_po_id        UUID;
  v_po_no        INTEGER;
  v_ordered      INTEGER;
  v_received     INTEGER;
  v_outstanding  INTEGER;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'Receive quantity must be positive';
  END IF;

  SELECT product_id, po_id, quantity_ordered, quantity_received
    INTO v_product_id, v_po_id, v_ordered, v_received
  FROM public.purchase_order_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'PO item not found';
  END IF;

  v_outstanding := v_ordered - v_received;
  IF p_qty > v_outstanding THEN
    RAISE EXCEPTION 'Cannot receive % — only % remaining on this line', p_qty, v_outstanding;
  END IF;

  -- Bump stock
  UPDATE public.products
     SET stock = stock + p_qty
   WHERE id = v_product_id;

  -- PO line progress
  UPDATE public.purchase_order_items
     SET quantity_received = quantity_received + p_qty
   WHERE id = p_item_id;

  -- Stock log entry
  SELECT po_no INTO v_po_no FROM public.purchase_orders WHERE id = v_po_id;

  INSERT INTO public.stock_logs (product_id, change, reason, user_id)
  VALUES (
    v_product_id,
    p_qty,
    'รับของจาก PO-' || LPAD(COALESCE(v_po_no, 0)::TEXT, 5, '0'),
    p_user_id
  );

  -- Flip PO status to 'received' once every line is complete
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_order_items
     WHERE po_id = v_po_id
       AND quantity_received < quantity_ordered
  ) THEN
    UPDATE public.purchase_orders
       SET status = 'received', received_at = NOW()
     WHERE id = v_po_id
       AND status <> 'received';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION receive_po_item(UUID, INTEGER, UUID) TO authenticated;

-- ── RLS: allow purchasing role to DELETE draft items when editing ─
-- Existing policies only cover select/insert/update. Add delete for drafts.
DROP POLICY IF EXISTS "purchase_order_items_delete" ON purchase_order_items;
CREATE POLICY "purchase_order_items_delete" ON purchase_order_items FOR DELETE
  TO authenticated USING (get_user_role() IN ('admin', 'manager', 'purchasing'));
