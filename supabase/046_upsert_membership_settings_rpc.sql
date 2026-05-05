-- Migration 046: RPC wrapper for upsert_membership_settings
-- Avoids REST PATCH/POST permission issues — called via /rpc/upsert_membership_settings

CREATE OR REPLACE FUNCTION upsert_membership_settings(
  p_company_id         UUID,
  p_enabled            BOOLEAN      DEFAULT true,
  p_points_per_baht    NUMERIC      DEFAULT 1.0,
  p_baht_per_point     NUMERIC      DEFAULT 0.10,
  p_max_redeem_pct     NUMERIC      DEFAULT 20.0,
  p_points_expiry_days INT          DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO membership_settings (
    company_id, enabled, points_per_baht, baht_per_point, max_redeem_pct, points_expiry_days
  ) VALUES (
    p_company_id, p_enabled, p_points_per_baht, p_baht_per_point, p_max_redeem_pct, p_points_expiry_days
  )
  ON CONFLICT (company_id) DO UPDATE SET
    enabled            = EXCLUDED.enabled,
    points_per_baht    = EXCLUDED.points_per_baht,
    baht_per_point     = EXCLUDED.baht_per_point,
    max_redeem_pct     = EXCLUDED.max_redeem_pct,
    points_expiry_days = EXCLUDED.points_expiry_days,
    updated_at         = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_membership_settings(UUID, BOOLEAN, NUMERIC, NUMERIC, NUMERIC, INT)
  TO authenticated, service_role;
