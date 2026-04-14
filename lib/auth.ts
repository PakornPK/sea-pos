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
  companyId: string | null
  isPlatformAdmin: boolean
  /**
   * The branch the user is currently operating in. Resolved per request:
   * read from `x-sea-branch` cookie if set and the user has access to
   * that branch; otherwise falls back to their `user_branches.is_default`.
   * Null for platform admins (no company).
   */
  activeBranchId: string | null
  /** All branches this user is assigned to. Empty for platform admins. */
  branchIds: string[]
}

/**
 * ─── Security model ─────────────────────────────────────────────────────────
 * Authentication is performed by proxy.ts on every request. It validates the
 * Supabase session (via supabase.auth.getUser()) and, on success, injects
 * the trusted x-sea-user-id header onto the server-side request.
 *
 * This function reads that header and loads the role from the profiles table.
 * It's the ONE place outside of the repository layer that reads from Supabase
 * directly — specifically the `profiles` table, to resolve the role for
 * request-scoped authorization. The rest of the app goes through repos.
 *
 * WHY THIS IS SAFE:
 *   1. proxy.ts strips any incoming x-sea-* headers BEFORE validation, so
 *      clients cannot forge identity.
 *   2. The header lives on the internal request-to-handler path; browsers
 *      never see or send it.
 *   3. Middleware runs on every route, so there is no bypass path.
 *   4. We hit the DB for the role on every request — role changes take
 *      effect within one page load, no stale JWT role claim.
 *
 * WHY THIS IS FAST:
 *   - React's cache() memoizes this function within a single request render,
 *     so repeated auth checks (layout + page + multiple Server Actions) all
 *     share one profiles query.
 *   - No redundant supabase.auth.getUser() call from page code.
 * ────────────────────────────────────────────────────────────────────────────
 */
const loadUser = cache(async (): Promise<AuthedUser | null> => {
  const hdrs = await headers()
  const userId = hdrs.get('x-sea-user-id')
  if (!userId) return null

  const supabase = await createClient()
  const [{ data: profile }, { data: branchRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, full_name, company_id, is_platform_admin')
      .eq('id', userId).single(),
    supabase
      .from('user_branches')
      .select('branch_id, is_default')
      .eq('user_id', userId),
  ])

  const branchIds = (branchRows ?? []).map((r) => r.branch_id as string)
  const defaultBranchId =
    (branchRows ?? []).find((r) => r.is_default)?.branch_id as string | undefined

  // Branch override via cookie. Validated against the user's set so a
  // stale cookie can't leak access. Read from the header the proxy
  // injects (mirrors how x-sea-user-id works) — see proxy.ts.
  const cookieBranch = hdrs.get('x-sea-branch')
  const activeBranchId =
    (cookieBranch && branchIds.includes(cookieBranch) ? cookieBranch : null)
    ?? defaultBranchId
    ?? branchIds[0]
    ?? null

  return {
    id: userId,
    email: hdrs.get('x-sea-user-email'),
    role: (profile?.role ?? 'cashier') as UserRole,
    fullName: (profile?.full_name as string | null) ?? null,
    companyId: (profile?.company_id as string | null) ?? null,
    isPlatformAdmin: Boolean(profile?.is_platform_admin),
    activeBranchId,
    branchIds,
  }
})

/**
 * For protected CUSTOMER pages that require a specific set of roles.
 * Redirects to:
 *   - /login if unauthenticated
 *   - /platform/companies if the user is a platform admin (they shouldn't
 *     see customer-facing UI; their workspace is separate)
 *   - / if role not allowed (which then routes to the user's home)
 */
export async function requirePageRole(allowed: UserRole[]): Promise<{ me: AuthedUser }> {
  const me = await loadUser()
  if (!me) redirect('/login')
  if (me.isPlatformAdmin) redirect('/platform/companies')
  if (!allowed.includes(me.role)) redirect('/')
  return { me }
}

/**
 * For protected pages where any authenticated role (customer OR platform)
 * is acceptable — currently just the dashboard layout.
 */
export async function requirePage(): Promise<{ me: AuthedUser }> {
  const me = await loadUser()
  if (!me) redirect('/login')
  return { me }
}

/**
 * For Server Actions that require a specific set of roles.
 * Throws a user-visible Error on failure.
 */
export async function requireActionRole(allowed: UserRole[]): Promise<{ me: AuthedUser }> {
  const me = await loadUser()
  if (!me) throw new Error('กรุณาเข้าสู่ระบบใหม่')
  if (!allowed.includes(me.role)) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
  return { me }
}

/**
 * For pages and actions reachable only by platform operators (SEA-POS
 * staff), not customer company users.
 */
export async function requirePlatformAdmin(): Promise<{ me: AuthedUser }> {
  const me = await loadUser()
  if (!me) redirect('/login')
  if (!me.isPlatformAdmin) redirect('/')
  return { me }
}

/**
 * For Server Actions that branch on role internally instead of hard-gating.
 * Throws only if the user is unauthenticated.
 */
export async function getActionUser(): Promise<{ me: AuthedUser }> {
  const me = await loadUser()
  if (!me) throw new Error('กรุณาเข้าสู่ระบบใหม่')
  return { me }
}
