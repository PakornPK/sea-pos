import { createClient } from '@supabase/supabase-js'

/**
 * Server-only admin client that bypasses RLS and can use auth.admin.* APIs.
 * NEVER import this from client components. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env to enable user management.'
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
