-- ============================================================
-- SEA-POS: Database functions
-- Run in Supabase SQL Editor AFTER 001_schema.sql
-- ============================================================

-- ─── Schema patches (idempotent) ─────────────────────────────
-- Add columns that may be missing if the table existed before this migration
ALTER TABLE stock_logs
  ADD COLUMN IF NOT EXISTS reason  TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ─── decrement_stock ─────────────────────────────────────────
-- Atomically decrements product stock and writes a stock_log.
-- SECURITY DEFINER: runs as the function owner (bypasses RLS)
-- so cashiers can call it even though they can't UPDATE products directly.
-- Uses FOR UPDATE row lock to prevent race conditions on concurrent sales.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id  UUID,
  p_quantity    INTEGER,
  p_sale_id     UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  -- Lock the row for the duration of this transaction
  SELECT stock
  INTO   v_stock
  FROM   public.products
  WHERE  id = p_product_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %: available %, requested %',
      p_product_id, v_stock, p_quantity;
  END IF;

  UPDATE public.products
  SET    stock = stock - p_quantity
  WHERE  id = p_product_id;

  INSERT INTO public.stock_logs (product_id, change, reason, user_id)
  VALUES (p_product_id, -p_quantity, 'ขาย #' || left(p_sale_id::text, 8), p_user_id);
END;
$$;
