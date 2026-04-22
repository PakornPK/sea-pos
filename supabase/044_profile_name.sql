-- Add first_name / last_name to profiles.
-- full_name is kept as a derived column synced by trigger — all existing code
-- that reads full_name continues to work without changes.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

-- Backfill from existing full_name (first word → first_name, rest → last_name).
UPDATE profiles
SET
  first_name = TRIM(SPLIT_PART(full_name, ' ', 1)),
  last_name  = NULLIF(TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)), '')
WHERE full_name IS NOT NULL
  AND full_name <> ''
  AND first_name IS NULL;

-- Keep full_name in sync whenever first_name or last_name changes.
CREATE OR REPLACE FUNCTION sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_name := NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_full_name ON profiles;
CREATE TRIGGER trg_sync_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_full_name();
