-- Record who confirmed (approved) a purchase order.
-- This locks the authorized signature to the approver, preventing retroactive changes.

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS confirmed_by_user_id uuid REFERENCES auth.users(id);
