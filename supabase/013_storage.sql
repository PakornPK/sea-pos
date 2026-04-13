-- ============================================================
-- SEA-POS: Object storage buckets + RLS (013)
--
-- Creates five buckets for different file use cases. The path prefix
-- on every object is the owning company_id, so RLS policies can split
-- access by tenant using `storage.foldername(name)[1]`.
--
-- Bucket layout:
--   products        (public) product images for catalog rendering
--   company-assets  (public) logos / receipt letterhead
--   receipts        (private) scanned/signed receipt attachments
--   imports         (private) CSV / XLSX uploads being processed
--   exports         (private) scheduled backups, large downloads
--
-- All object paths follow:  {company_id}/{subpath}/{filename}
-- Platform admins bypass tenancy via is_platform_admin().
--
-- Safe to run multiple times.
-- ============================================================

-- ─── 1. Create buckets ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('products',       'products',       true,  5 * 1024 * 1024,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('company-assets', 'company-assets', true,  2 * 1024 * 1024,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('receipts',       'receipts',       false, 5 * 1024 * 1024,
   ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('imports',        'imports',        false, 10 * 1024 * 1024,
   ARRAY['text/csv', 'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('exports',        'exports',        false, 50 * 1024 * 1024,
   NULL)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. RLS: tenant-scoped path policies ─────────────────────
-- Pattern: SPLIT_PART(name, '/', 1) = current company_id.
-- storage.foldername(name)[1] returns the first path segment as text.

-- Helper — DRY check used by every write policy below.
-- Returns true if the object's first path segment matches the caller's company
-- OR the caller is a platform admin.
CREATE OR REPLACE FUNCTION storage_tenant_matches(obj_path TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT public.is_platform_admin()
      OR (storage.foldername(obj_path))[1] = public.get_current_company_id()::TEXT;
$$;

GRANT EXECUTE ON FUNCTION storage_tenant_matches(TEXT) TO authenticated;

-- ── products (public bucket) ────────────────────────────────
-- Reads are open (CDN-served); writes are tenant-scoped.
DROP POLICY IF EXISTS "products_read"   ON storage.objects;
DROP POLICY IF EXISTS "products_write"  ON storage.objects;
DROP POLICY IF EXISTS "products_update" ON storage.objects;
DROP POLICY IF EXISTS "products_delete" ON storage.objects;

CREATE POLICY "products_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "products_write" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND storage_tenant_matches(name)
  );

CREATE POLICY "products_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products' AND storage_tenant_matches(name)
  );

CREATE POLICY "products_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products' AND storage_tenant_matches(name)
  );

-- ── company-assets (public bucket) ──────────────────────────
DROP POLICY IF EXISTS "company_assets_read"   ON storage.objects;
DROP POLICY IF EXISTS "company_assets_write"  ON storage.objects;
DROP POLICY IF EXISTS "company_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_delete" ON storage.objects;

CREATE POLICY "company_assets_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_write" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets' AND storage_tenant_matches(name)
  );

CREATE POLICY "company_assets_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-assets' AND storage_tenant_matches(name)
  );

CREATE POLICY "company_assets_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-assets' AND storage_tenant_matches(name)
  );

-- ── receipts (private bucket) — tenant-scoped even on READ ──
DROP POLICY IF EXISTS "receipts_read"   ON storage.objects;
DROP POLICY IF EXISTS "receipts_write"  ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

CREATE POLICY "receipts_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts' AND storage_tenant_matches(name));

CREATE POLICY "receipts_write" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND storage_tenant_matches(name));

CREATE POLICY "receipts_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts' AND storage_tenant_matches(name));

CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND storage_tenant_matches(name));

-- ── imports (private, same pattern as receipts) ─────────────
DROP POLICY IF EXISTS "imports_read"   ON storage.objects;
DROP POLICY IF EXISTS "imports_write"  ON storage.objects;
DROP POLICY IF EXISTS "imports_update" ON storage.objects;
DROP POLICY IF EXISTS "imports_delete" ON storage.objects;

CREATE POLICY "imports_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'imports' AND storage_tenant_matches(name));

CREATE POLICY "imports_write" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'imports' AND storage_tenant_matches(name));

CREATE POLICY "imports_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'imports' AND storage_tenant_matches(name));

CREATE POLICY "imports_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'imports' AND storage_tenant_matches(name));

-- ── exports (private, platform-admin + own-tenant) ──────────
DROP POLICY IF EXISTS "exports_read"   ON storage.objects;
DROP POLICY IF EXISTS "exports_write"  ON storage.objects;
DROP POLICY IF EXISTS "exports_update" ON storage.objects;
DROP POLICY IF EXISTS "exports_delete" ON storage.objects;

CREATE POLICY "exports_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'exports' AND storage_tenant_matches(name));

CREATE POLICY "exports_write" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exports' AND storage_tenant_matches(name));

CREATE POLICY "exports_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'exports' AND storage_tenant_matches(name));

CREATE POLICY "exports_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'exports' AND storage_tenant_matches(name));
