-- ─── Migration 027: Subscription lifecycle functions ────────────────────────
-- Provides tick_subscription_statuses() and run_subscription_tick() to be
-- called by an external cron job (backend scheduler, not pg_cron).
-- Safe to re-run (uses CREATE OR REPLACE / IF NOT EXISTS).

-- ─── 1. Core function: tick_subscription_statuses() ─────────────────────────
-- Call this monthly (e.g. on the 1st of each month) from your backend cron.
-- Logic:
--   a. For every non-cancelled subscription where current_period_end < today:
--      - Increment overdue_months
--      - Set status = 'past_due'  (overdue_months 1–2)
--      - Set status = 'suspended' (overdue_months >= 3)
--   b. Sync companies.status:
--      - Suspended subscription → companies.status = 'suspended'
--      - Active subscription + company was suspended → companies.status = 'active'

CREATE OR REPLACE FUNCTION tick_subscription_statuses()
RETURNS TABLE(
  processed       int,
  newly_past_due  int,
  newly_suspended int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed   int  := 0;
  v_past_due    int  := 0;
  v_suspended   int  := 0;
  v_today       date := current_date;
BEGIN

  -- Step 1: increment overdue counter for subscriptions past their period
  UPDATE subscriptions
  SET
    overdue_months = overdue_months + 1,
    updated_at     = now()
  WHERE
    status NOT IN ('cancelled', 'trialing')
    AND current_period_end::date < v_today
    -- Guard: only tick if period ended within last 31 days
    -- (prevents runaway increments if caller was paused for months)
    AND current_period_end::date >= (v_today - interval '31 days');

  GET DIAGNOSTICS v_processed = ROW_COUNT;

  -- Step 2: flip to past_due (1–2 overdue months)
  UPDATE subscriptions
  SET
    status     = 'past_due',
    updated_at = now()
  WHERE
    status NOT IN ('cancelled', 'suspended', 'past_due')
    AND overdue_months BETWEEN 1 AND 2;

  GET DIAGNOSTICS v_past_due = ROW_COUNT;

  -- Step 3: flip to suspended (3+ overdue months)
  UPDATE subscriptions
  SET
    status     = 'suspended',
    updated_at = now()
  WHERE
    status <> 'cancelled'
    AND overdue_months >= 3;

  GET DIAGNOSTICS v_suspended = ROW_COUNT;

  -- Step 4: sync companies.status → suspended
  UPDATE companies c
  SET status = 'suspended'
  FROM subscriptions s
  WHERE
    s.company_id = c.id
    AND s.status  = 'suspended'
    AND c.status <> 'suspended';

  -- Step 5: re-activate companies whose subscription is back to active
  UPDATE companies c
  SET status = 'active'
  FROM subscriptions s
  WHERE
    s.company_id = c.id
    AND s.status  = 'active'
    AND c.status  = 'suspended';

  RETURN QUERY SELECT v_processed, v_past_due, v_suspended;
END;
$$;

GRANT EXECUTE ON FUNCTION tick_subscription_statuses() TO service_role;


-- ─── 2. Public alias (called from backend or admin UI) ───────────────────────
--   SELECT * FROM run_subscription_tick();

CREATE OR REPLACE FUNCTION run_subscription_tick()
RETURNS TABLE(processed int, newly_past_due int, newly_suspended int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM tick_subscription_statuses();
$$;

GRANT EXECUTE ON FUNCTION run_subscription_tick() TO service_role;


-- ─── 3. Indexes for the tick queries ─────────────────────────────────────────
-- tick WHERE clause: status + current_period_end → partial composite index
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions (current_period_end);

-- company_id lookup used in every billing query
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id
  ON subscriptions (company_id);


-- ─── 4. updated_at trigger on subscriptions ──────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
