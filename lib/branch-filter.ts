import type { AuthedUser } from '@/lib/auth'

/**
 * Resolve a list-view's effective branch filter from the URL + caller.
 *
 * Rules:
 *   - Admins may pass `?branch=all` to see every branch. Non-admins cannot —
 *     we ignore it and force their active branch.
 *   - Admins may pass `?branch=<uuid>` to pick any branch (RLS still enforces
 *     tenant). Invalid/unknown values fall back to activeBranchId.
 *   - With no param, default to the caller's activeBranchId.
 *   - Returns `null` when the effective scope is "all branches".
 */
export function resolveBranchFilter(
me: AuthedUser,
  rawParam: string | undefined,
): string | null {
  const isAdmin = me.role === 'admin' || me.isPlatformAdmin

  if (isAdmin && rawParam === 'all') return null
  if (isAdmin && rawParam && rawParam !== 'all') return rawParam

  return me.activeBranchId ?? null
}

/**
 * Build the `?branch=…` href for a list view's "ทุกสาขา" toggle.
 * Used by admin-only UI to swap between scoped and cross-branch.
 */
export function toggleBranchHref(
  basePath: string,
  currentSearchParams: Record<string, string | undefined>,
  next: 'all' | 'active',
): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(currentSearchParams)) {
    if (v !== undefined && k !== 'branch' && k !== 'page') sp.set(k, String(v))
  }
  if (next === 'all') sp.set('branch', 'all')
  const qs = sp.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
