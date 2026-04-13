import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Internal helpers shared across every Supabase adapter method.
 * These are the ONLY places outside of lib/auth.ts and proxy.ts that
 * import the supabase client factories.
 *
 * - `getDb()` — anon/auth client that respects the current user's session
 *               (cookies, RLS, etc.). For normal business queries.
 * - `getAdminDb()` — service-role client bypassing RLS, used only for
 *                    user-management operations (auth.admin.*).
 */

export function getDb() {
  return createClient()
}

export function getAdminDb() {
  return createAdminClient()
}
