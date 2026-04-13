-- ============================================================
-- SEA-POS: Self-serve signup polish (010)
--
-- `handle_new_user` now honors an optional `company_name` in metadata
-- when creating a fresh company for self-serve signups. If absent, it
-- falls back to "<full_name>'s Store" as before.
-- Safe to run multiple times.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_company_id   UUID;
  v_role         TEXT;
  v_full_name    TEXT;
  v_company_name TEXT;
  v_incoming_co  UUID;
BEGIN
  v_full_name    := COALESCE(NEW.raw_user_meta_data->>'full_name',  split_part(NEW.email, '@', 1));
  v_role         := COALESCE(NEW.raw_user_meta_data->>'role', 'cashier');
  v_company_name := NULLIF(NEW.raw_user_meta_data->>'company_name', '');
  v_incoming_co  := NULLIF(NEW.raw_user_meta_data->>'company_id',   '')::UUID;

  IF v_incoming_co IS NOT NULL THEN
    -- Invitation flow — reuse existing company, keep passed role
    v_company_id := v_incoming_co;
  ELSE
    -- Self-serve signup — create a fresh company for this user
    INSERT INTO public.companies (name, owner_id, plan)
    VALUES (
      COALESCE(v_company_name, v_full_name || '''s Store'),
      NEW.id,
      'free'
    )
    RETURNING id INTO v_company_id;
    v_role := 'admin';  -- signup = owner = admin
  END IF;

  INSERT INTO public.profiles (id, role, full_name, company_id)
  VALUES (NEW.id, v_role, v_full_name, v_company_id)
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        role       = EXCLUDED.role,
        full_name  = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;
