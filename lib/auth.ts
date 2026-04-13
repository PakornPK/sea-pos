import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type AuthedUser = {
  id: string
  email: string | null
  role: UserRole
  fullName: string | null
}

/**
 * ─── Security model ─────────────────────────────────────────────────────────
 * Authentication is performed by proxy.ts on every request. It validates the
 * Supabase session (via supabase.auth.getUser()) and, on success, injects
 * the trusted x-sea-user-id header onto the server-side request.
 *
 * This function reads that header and loads the role from the profiles table.
 *
 * WHY THIS IS SAFE:
 *   1. proxy.ts strips any incoming x-sea-* headers BEFORE validation, so
 *      clients cannot forge identity.
 *   2. The header lives on the internal request-to-handler path; browsers
 *      never see or send it.
 *   3. Middleware runs on every route (see config.matcher in proxy.ts), so
 *      there is no bypass path to a page/action without validation.
 *   4. We still hit the database for the role on every request — role changes
 *      take effect within one page load, no stale JWT role claim.
 *
 * WHY THIS IS FAST:
 *   - React's cache() memoizes this function within a single request render,
 *     so if a page layout + page handler + multiple Server Actions all call
 *     requirePage/requirePageRole/requireActionRole, only ONE profiles query
 *     runs per request.
 *   - No redundant supabase.auth.getUser() call from page code (proxy already
 *     did it once — a second call would be a wasted network round-trip).
 * ────────────────────────────────────────────────────────────────────────────
 */
const loadUser = cache(async (): Promise<AuthedUser | null> => {
  const hdrs = await headers()
  const userId = hdrs.get('x-sea-user-id')
  if (!userId) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', userId).single()

  return {
    id: userId,
    email: hdrs.get('x-sea-user-email'),
    role: (profile?.role ?? 'cashier') as UserRole,
    fullName: (profile?.full_name as string | null) ?? null,
  }
})

/**
 * For protected pages that require a specific set of roles.
 * Redirects to /login if unauthenticated, to / if role not allowed.
 */
export async function requirePageRole(allowed: UserRole[]) {
  const me = await loadUser()
  if (!me) redirect('/login')
  if (!allowed.includes(me.role)) redirect('/')
  const supabase = await createClient()
  return { supabase, me }
}

/**
 * For protected pages where any authenticated role is fine (e.g., the
 * dashboard layout which is common to every role).
 */
export async function requirePage() {
  const me = await loadUser()
  if (!me) redirect('/login')
  const supabase = await createClient()
  return { supabase, me }
}

/**
 * For Server Actions that require a specific set of roles.
 * Throws a user-visible Error on failure (Actions surface errors via state).
 */
export async function requireActionRole(allowed: UserRole[]) {
  const me = await loadUser()
  if (!me) throw new Error('กรุณาเข้าสู่ระบบใหม่')
  if (!allowed.includes(me.role)) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
  const supabase = await createClient()
  return { supabase, me }
}

/**
 * For Server Actions that branch on role internally instead of hard-gating.
 * Throws only if the user is unauthenticated.
 */
export async function getActionUser() {
  const me = await loadUser()
  if (!me) throw new Error('กรุณาเข้าสู่ระบบใหม่')
  const supabase = await createClient()
  return { supabase, me }
}
