-- ============================================================
-- SEA-POS Release 2: Stock transfer RPCs (015)
--
-- Migration 014 added the stock_transfers / stock_transfer_items tables.
-- This migration adds the transactional procedures that move stock
-- between branches atomically:
--
--   send_stock_transfer(transfer_id, user_id)
--     - Called when a transfer is created. Decrements each item's
--       quantity from the source branch's product_stock, logs a stock_logs
--       row at the source, marks transfer 'in_transit'.
--     - Fails if any item has insufficient source stock; the whole
--       transaction rolls back so the source is never half-debited.
--
--   receive_stock_transfer(transfer_id, user_id)
--     - Validates 'in_transit' status. Increments each item's quantity
--       at the destination branch, sets quantity_received = quantity_sent,
--       logs stock_logs at the destination, marks 'received' + received_at.
--
--   cancel_stock_transfer(transfer_id, user_id)
--     - Valid on 'draft' or 'in_transit'. If 'in_transit', restores
--       source stock for every item and logs reversals. Marks 'cancelled'.
--
-- All three are SECURITY DEFINER so any authorized role can call them
-- without needing direct UPDATE privileges on product_stock.
--
-- Safe to run multiple times.
-- ============================================================

DROP FUNCTION IF EXISTS send_stock_transfer(UUID, UUID);
DROP FUNCTION IF EXISTS receive_stock_transfer(UUID, UUID);
DROP FUNCTION IF EXISTS cancel_stock_transfer(UUID, UUID);

-- ─── send_stock_transfer ─────────────────────────────────────
CREATE FUNCTION send_stock_transfer(
  p_transfer_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_transfer RECORD;
  v_item     RECORD;
  v_current  INTEGER;
BEGIN
  SELECT * INTO v_transfer
  FROM public.stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id;
  END IF;
  IF v_transfer.status <> 'draft' AND v_transfer.status <> 'in_transit' THEN
    RAISE EXCEPTION 'Transfer % is % — cannot send', p_transfer_id, v_transfer.status;
  END IF;

  -- Validate + lock every source pivot row first (all-or-nothing).
  FOR v_item IN
    SELECT id, product_id, quantity_sent
    FROM   public.stock_transfer_items
    WHERE  transfer_id = p_transfer_id
  LOOP
    SELECT quantity INTO v_current
    FROM   public.product_stock
    WHERE  product_id = v_item.product_id AND branch_id = v_transfer.from_branch_id
    FOR UPDATE;

    IF v_current IS NULL OR v_current < v_item.quantity_sent THEN
      RAISE EXCEPTION 'Insufficient stock at source branch for product %: available %, requested %',
        v_item.product_id, COALESCE(v_current, 0), v_item.quantity_sent;
    END IF;
  END LOOP;

  -- All locked + validated — apply the decrements.
  FOR v_item IN
    SELECT id, product_id, quantity_sent
    FROM   public.stock_transfer_items
    WHERE  transfer_id = p_transfer_id
  LOOP
    UPDATE public.product_stock
    SET    quantity   = quantity - v_item.quantity_sent,
           updated_at = NOW()
    WHERE  product_id = v_item.product_id AND branch_id = v_transfer.from_branch_id;

    INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
    VALUES (
      v_item.product_id,
      v_transfer.from_branch_id,
      v_transfer.company_id,
      -v_item.quantity_sent,
      'โอนออก (โอน #' || left(p_transfer_id::text, 8) || ')',
      p_user_id
    );
  END LOOP;

  UPDATE public.stock_transfers
  SET    status = 'in_transit'
  WHERE  id = p_transfer_id;
END;
$$;

COMMENT ON FUNCTION send_stock_transfer(UUID, UUID)
  IS 'Atomically debit source branch stock and move transfer to in_transit.';

-- ─── receive_stock_transfer ──────────────────────────────────
CREATE FUNCTION receive_stock_transfer(
  p_transfer_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_transfer RECORD;
  v_item     RECORD;
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
    SELECT id, product_id, quantity_sent, quantity_received
    FROM   public.stock_transfer_items
    WHERE  transfer_id = p_transfer_id
  LOOP
    -- Upsert the destination row and credit it with quantity_sent.
    INSERT INTO public.product_stock (product_id, branch_id, company_id, quantity)
    VALUES (v_item.product_id, v_transfer.to_branch_id, v_transfer.company_id, v_item.quantity_sent)
    ON CONFLICT (product_id, branch_id)
    DO UPDATE SET
      quantity   = public.product_stock.quantity + v_item.quantity_sent,
      updated_at = NOW();

    UPDATE public.stock_transfer_items
    SET    quantity_received = v_item.quantity_sent
    WHERE  id = v_item.id;

    INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
    VALUES (
      v_item.product_id,
      v_transfer.to_branch_id,
      v_transfer.company_id,
      v_item.quantity_sent,
      'รับโอน (โอน #' || left(p_transfer_id::text, 8) || ')',
      p_user_id
    );
  END LOOP;

  UPDATE public.stock_transfers
  SET    status      = 'received',
         received_at = NOW()
  WHERE  id = p_transfer_id;
END;
$$;

COMMENT ON FUNCTION receive_stock_transfer(UUID, UUID)
  IS 'Atomically credit destination branch stock and mark transfer received.';

-- ─── cancel_stock_transfer ───────────────────────────────────
CREATE FUNCTION cancel_stock_transfer(
  p_transfer_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_transfer RECORD;
  v_item     RECORD;
BEGIN
  SELECT * INTO v_transfer
  FROM public.stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id;
  END IF;
  IF v_transfer.status = 'received' THEN
    RAISE EXCEPTION 'Transfer % is already received — cannot cancel', p_transfer_id;
  END IF;
  IF v_transfer.status = 'cancelled' THEN
    -- Idempotent: already cancelled.
    RETURN;
  END IF;

  -- If already sent (in_transit), restore source stock before cancelling.
  IF v_transfer.status = 'in_transit' THEN
    FOR v_item IN
      SELECT product_id, quantity_sent
      FROM   public.stock_transfer_items
      WHERE  transfer_id = p_transfer_id
    LOOP
      UPDATE public.product_stock
      SET    quantity   = quantity + v_item.quantity_sent,
             updated_at = NOW()
      WHERE  product_id = v_item.product_id AND branch_id = v_transfer.from_branch_id;

      INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
      VALUES (
        v_item.product_id,
        v_transfer.from_branch_id,
        v_transfer.company_id,
        v_item.quantity_sent,
        'ยกเลิกโอน (โอน #' || left(p_transfer_id::text, 8) || ')',
        p_user_id
      );
    END LOOP;
  END IF;

  UPDATE public.stock_transfers
  SET    status = 'cancelled'
  WHERE  id = p_transfer_id;
END;
$$;

COMMENT ON FUNCTION cancel_stock_transfer(UUID, UUID)
  IS 'Cancel a transfer, restoring source stock if already in transit.';
