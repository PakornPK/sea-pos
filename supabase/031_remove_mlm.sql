-- ─── Migration 031: Remove MLM ───────────────────────────────────────────────
-- Drops the closure table, MLM config columns, referral FK, and commission log type.

-- 1. Drop closure table triggers + function
DROP TRIGGER  IF EXISTS trg_members_insert_tree ON members;
DROP FUNCTION IF EXISTS trg_insert_member_tree();

-- 2. Drop the closure table entirely
DROP TABLE IF EXISTS member_tree;

-- 3. Remove MLM columns from membership_settings
ALTER TABLE membership_settings
  DROP COLUMN IF EXISTS mlm_enabled,
  DROP COLUMN IF EXISTS mlm_levels;

-- 4. Remove referral FK from members
ALTER TABLE members
  DROP COLUMN IF EXISTS referred_by_member_id;

-- 5. Remove source_member_id (used only for commission logs) from points log
ALTER TABLE member_points_log
  DROP COLUMN IF EXISTS source_member_id;

-- 6. Update the type CHECK constraint to remove 'commission'
ALTER TABLE member_points_log
  DROP CONSTRAINT IF EXISTS member_points_log_type_check;
ALTER TABLE member_points_log
  ADD  CONSTRAINT member_points_log_type_check
  CHECK (type IN ('earn', 'redeem', 'expire', 'adjust'));
