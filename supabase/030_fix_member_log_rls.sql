-- ─── Migration 030: Fix member_points_log RLS ────────────────────────────────
-- Migration 028 created only a SELECT policy on member_points_log.
-- INSERT was silently blocked — no log entries were written after sales.
-- Add INSERT policy so the server action can write to the ledger.

DROP POLICY IF EXISTS "member_points_log_insert" ON member_points_log;
CREATE POLICY "member_points_log_insert" ON member_points_log
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_company_id() OR is_platform_admin());

-- Also allow service_role full access (used by future cron / admin tools).
-- (service_role bypasses RLS by default — this is here for documentation only.)
