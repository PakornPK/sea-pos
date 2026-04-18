-- Replace decrement_stock with a variant that accepts an allow_negative flag.
-- When allow_negative = true the stock-insufficient guard is skipped so stock
-- can go below 0.  The company-level default is allow_negative = true (food
-- service reality).  Pass false to enforce strict non-negative stock.

DROP FUNCTION IF EXISTS decrement_stock(UUID, UUID, INTEGER, UUID, UUID);
DROP FUNCTION IF EXISTS decrement_stock(UUID, UUID, INTEGER, UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id     UUID,
  p_branch_id      UUID,
  p_quantity       INTEGER,
  p_sale_id        UUID,
  p_user_id        UUID,
  p_allow_negative BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  SELECT quantity
  INTO   v_stock
  FROM   public.product_stock
  WHERE  product_id = p_product_id AND branch_id = p_branch_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Product % has no stock row at branch %', p_product_id, p_branch_id;
  END IF;

  IF NOT p_allow_negative AND v_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product % at branch %: available %, requested %',
      p_product_id, p_branch_id, v_stock, p_quantity;
  END IF;

  UPDATE public.product_stock
  SET    quantity   = quantity - p_quantity,
         updated_at = NOW()
  WHERE  product_id = p_product_id AND branch_id = p_branch_id;

  INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
  SELECT p_product_id,
         p_branch_id,
         ps.company_id,
         -p_quantity,
         'ขาย #' || left(p_sale_id::text, 8),
         p_user_id
  FROM   public.product_stock ps
  WHERE  ps.product_id = p_product_id AND ps.branch_id = p_branch_id;
END;
$$;

COMMENT ON FUNCTION decrement_stock(UUID, UUID, INTEGER, UUID, UUID, BOOLEAN)
  IS 'Branch-aware atomic stock decrement for sales. p_allow_negative controls whether stock can go below 0.';
