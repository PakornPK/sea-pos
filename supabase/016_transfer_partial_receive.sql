-- ============================================================
-- SEA-POS: Partial receive for stock transfers (016)
--
-- Lets the destination branch record per-item:
--   - actual quantity received (may be < quantity_sent)
--   - an optional note describing any discrepancy (damage, shortage)
--
-- Stock is credited at destination by quantity_received (NOT quantity_sent).
-- The shortfall (sent - received) is a tracked loss — it is NOT refunded
-- to the source branch. The audit trail lives on the transfer item rows.
--
-- Safe to run multiple times.
-- ============================================================

-- 1. Add the note column. Idempotent.
ALTER TABLE stock_transfer_items
  ADD COLUMN IF NOT EXISTS receive_note TEXT;

-- 2. Replace the receive RPC with one that accepts per-item overrides.
DROP FUNCTION IF EXISTS receive_stock_transfer(UUID, UUID);
DROP FUNCTION IF EXISTS receive_stock_transfer(UUID, UUID, JSONB);

CREATE FUNCTION receive_stock_transfer(
  p_transfer_id UUID,
  p_user_id     UUID,
  p_items       JSONB DEFAULT NULL   -- [{id, quantity_received, receive_note}, ...]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_transfer RECORD;
  v_item     RECORD;
  v_qty_recv INTEGER;
  v_note     TEXT;
  v_shortage INTEGER;
BEGIN
  SELECT * INTO v_transfer
  FROM public.stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id;
  END IF;
  IF v_transfer.status <> 'in_transit' THEN
    RAISE EXCEPTION 'Transfer % is % — only in_transit can be received', p_transfer_id, v_transfer.status;
  END IF;

  FOR v_item IN
    SELECT id, product_id, quantity_sent
    FROM   public.stock_transfer_items
    WHERE  transfer_id = p_transfer_id
  LOOP
    -- Pull the caller-supplied override for this item if present; otherwise
    -- default to full receipt (quantity_received = quantity_sent, no note).
    v_qty_recv := NULL;
    v_note     := NULL;
    IF p_items IS NOT NULL THEN
      SELECT
        COALESCE((elem->>'quantity_received')::INTEGER, v_item.quantity_sent),
        NULLIF(elem->>'receive_note', '')
      INTO v_qty_recv, v_note
      FROM   jsonb_array_elements(p_items) AS elem
      WHERE  elem->>'id' = v_item.id::TEXT
      LIMIT  1;
    END IF;
    IF v_qty_recv IS NULL THEN v_qty_recv := v_item.quantity_sent; END IF;

    IF v_qty_recv < 0 THEN
      RAISE EXCEPTION 'quantity_received cannot be negative (item %)', v_item.id;
    END IF;
    IF v_qty_recv > v_item.quantity_sent THEN
      RAISE EXCEPTION 'quantity_received (%) cannot exceed quantity_sent (%) for item %',
        v_qty_recv, v_item.quantity_sent, v_item.id;
    END IF;

    v_shortage := v_item.quantity_sent - v_qty_recv;

    -- Credit destination by actual received quantity (may be 0).
    IF v_qty_recv > 0 THEN
      INSERT INTO public.product_stock (product_id, branch_id, company_id, quantity)
      VALUES (v_item.product_id, v_transfer.to_branch_id, v_transfer.company_id, v_qty_recv)
      ON CONFLICT (product_id, branch_id)
      DO UPDATE SET
        quantity   = public.product_stock.quantity + v_qty_recv,
        updated_at = NOW();

      INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
      VALUES (
        v_item.product_id,
        v_transfer.to_branch_id,
        v_transfer.company_id,
        v_qty_recv,
        'รับโอน (โอน #' || left(p_transfer_id::text, 8) || ')'
          || CASE WHEN v_note IS NOT NULL THEN ' — ' || v_note ELSE '' END,
        p_user_id
      );
    END IF;

    -- Shortfall (v_shortage > 0) is NOT logged in stock_logs — that ledger
    -- must reconcile with product_stock, and fake "-N" rows would break
    -- reports. The discrepancy lives on stock_transfer_items.receive_note
    -- (set below) for audit purposes.

    UPDATE public.stock_transfer_items
    SET    quantity_received = v_qty_recv,
           receive_note      = v_note
    WHERE  id = v_item.id;
  END LOOP;

  UPDATE public.stock_transfers
  SET    status      = 'received',
         received_at = NOW()
  WHERE  id = p_transfer_id;
END;
$$;

COMMENT ON FUNCTION receive_stock_transfer(UUID, UUID, JSONB)
  IS 'Receive a transfer with optional per-item quantity/note overrides. '
     'Shortfalls are audit-logged at the destination; source is NOT credited back.';
