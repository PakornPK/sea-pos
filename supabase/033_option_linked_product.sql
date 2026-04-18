-- Link options to a trackable product so selling the option decrements that product's stock.
-- quantity_per_use is always 1 for now; the column exists for future scaling.

ALTER TABLE options
  ADD COLUMN IF NOT EXISTS linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_per_use  int  NOT NULL DEFAULT 1;

-- Snapshot the link at sale time so void works even if the option is later edited/unlinked.
ALTER TABLE sale_item_options
  ADD COLUMN IF NOT EXISTS linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL;

-- Index for void lookups
CREATE INDEX IF NOT EXISTS sale_item_options_linked_product_id_idx
  ON sale_item_options (linked_product_id)
  WHERE linked_product_id IS NOT NULL;

-- ── Fix existing products + update trigger ────────────────────────────────────
-- Products with option groups are menu-style items; their stock is tracked at
-- the ingredient level (linked_product_id on each option), not on the parent.
-- Set track_stock = false for any product that already has option groups.
UPDATE products
SET track_stock = false
WHERE has_options = true
  AND track_stock = true;

-- Update the trigger so adding the first option group to a product automatically
-- switches it to untracked. (Users who genuinely need tracked + options can
-- re-enable track_stock manually in the edit page.)
CREATE OR REPLACE FUNCTION sync_product_has_options()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE products
    SET has_options = EXISTS (
      SELECT 1 FROM option_groups WHERE product_id = OLD.product_id
    )
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    -- First option group added: mark has_options and switch to untracked
    UPDATE products
    SET has_options  = true,
        track_stock  = false
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END;
$$;
