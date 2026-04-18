-- a) PO conversion columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS po_unit       TEXT,
  ADD COLUMN IF NOT EXISTS po_conversion NUMERIC(12,6) NOT NULL DEFAULT 1;
-- po_unit = null means same unit as stock unit
-- po_conversion = how many stock-units per 1 po-unit (e.g. 1000 for kg→g)

-- b) decrement_stock: INTEGER → NUMERIC
DROP FUNCTION IF EXISTS decrement_stock(UUID, UUID, INTEGER, UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id     UUID,
  p_branch_id      UUID,
  p_quantity       NUMERIC,
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
  v_stock NUMERIC;
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

COMMENT ON FUNCTION decrement_stock(UUID, UUID, NUMERIC, UUID, UUID, BOOLEAN)
  IS 'Branch-aware atomic stock decrement for sales. Accepts fractional quantities.';

-- c) receive_po_item: add p_stock_qty so PO tracks in PO-units but stock increments in stock-units
DROP FUNCTION IF EXISTS receive_po_item(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION receive_po_item(
  p_item_id   UUID,
  p_qty       NUMERIC,   -- in PO units (what the user entered, e.g. 1 kg)
  p_stock_qty NUMERIC,   -- in stock units (what hits product_stock, e.g. 1000 g)
  p_user_id   UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item       RECORD;
  v_po_branch  UUID;
  v_company    UUID;
BEGIN
  SELECT poi.*, po.branch_id AS po_branch_id, po.company_id AS po_company_id
  INTO   v_item
  FROM   public.purchase_order_items poi
  JOIN   public.purchase_orders po ON po.id = poi.po_id
  WHERE  poi.id = p_item_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'PO item % not found', p_item_id;
  END IF;

  IF v_item.quantity_received + p_qty > v_item.quantity_ordered THEN
    RAISE EXCEPTION 'Receive exceeds ordered quantity on PO item %', p_item_id;
  END IF;

  v_po_branch := v_item.po_branch_id;
  v_company   := v_item.po_company_id;

  UPDATE public.purchase_order_items
  SET    quantity_received = quantity_received + p_qty
  WHERE  id = p_item_id;

  INSERT INTO public.product_stock (product_id, branch_id, company_id, quantity)
  VALUES (v_item.product_id, v_po_branch, v_company, p_stock_qty)
  ON CONFLICT (product_id, branch_id)
  DO UPDATE SET
    quantity   = public.product_stock.quantity + p_stock_qty,
    updated_at = NOW();

  INSERT INTO public.stock_logs (product_id, branch_id, company_id, change, reason, user_id)
  VALUES (v_item.product_id, v_po_branch, v_company, p_stock_qty, 'รับของจาก PO', p_user_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE po_id = v_item.po_id AND quantity_received < quantity_ordered
  ) THEN
    UPDATE public.purchase_orders
    SET    status      = 'received',
           received_at = NOW()
    WHERE  id = v_item.po_id AND status = 'ordered';
  END IF;
END;
$$;

COMMENT ON FUNCTION receive_po_item(UUID, NUMERIC, NUMERIC, UUID)
  IS 'Branch-aware PO receive. p_qty tracks in PO units; p_stock_qty is what actually hits product_stock.';
