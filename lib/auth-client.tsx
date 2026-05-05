'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Branch, UserRole } from '@/types/database'
import { readCookie, writeCookie, deleteCookie, refreshAccessToken } from '@/lib/cookies'

export { readCookie, writeCookie, deleteCookie, refreshAccessToken }

export type AuthedUser = {
  id: string
  email: string | null
  role: UserRole
  fullName: string | null
  companyId: string | null
  isPlatformAdmin: boolean
  activeBranchId: string | null
  branchIds: string[]
}

type AuthCtx = {
  user: AuthedUser | null
  branches: Branch[]
  loading: boolean
  setActiveBranch: (id: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  branches: [],
  loading: true,
  setActiveBranch: () => {},
  signOut: async () => {},
})

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function clientSignIn(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, string>) as Record<string, string>
    return body.error_description ?? body.msg ?? body.error ?? 'เข้าสู่ระบบไม่สำเร็จ'
  }
  const data = await res.json() as { access_token: string; refresh_token: string }
  const maxAge = rememberMe ? 60 * 60 * 24 * 365 : undefined
  writeCookie('pos_token', data.access_token, maxAge)
  writeCookie('pos_refresh', data.refresh_token, maxAge)
  return null
}

export async function clientSignUp(
  email: string,
  password: string,
  fullName: string,
  companyName: string,
): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({ email, password, data: { full_name: fullName, company_name: companyName } }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, string>) as Record<string, string>
    return body.error_description ?? body.msg ?? body.error ?? 'สมัครสมาชิกไม่สำเร็จ'
  }
  return clientSignIn(email, password, true)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const setActiveBranch = useCallback((id: string) => {
    writeCookie('sea-branch', id, 60 * 60 * 24 * 30)
    setUser((prev) => prev ? { ...prev, activeBranchId: id } : prev)
  }, [])

  const signOut = useCallback(async () => {
    const token = readCookie('pos_token')
    if (token) {
      await fetch(`${API_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: API_KEY },
      }).catch(() => {})
    }
    deleteCookie('pos_token')
    deleteCookie('pos_refresh')
    deleteCookie('sea-branch')
    window.location.href = '/login/'
  }, [])

  useEffect(() => {
    async function init() {
      let token = readCookie('pos_token')
      if (!token) {
        token = await refreshAccessToken()
        if (!token) { setLoading(false); return }
      }

      let authRes = await fetch(`${API_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: API_KEY },
      })
      if (authRes.status === 401) {
        token = await refreshAccessToken()
        if (!token) { setLoading(false); return }
        authRes = await fetch(`${API_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: API_KEY },
        })
      }
      if (!authRes.ok) { setLoading(false); return }
      const authUser = await authRes.json() as { id: string; email?: string }

      const [profiles, branchRows] = await Promise.all([
        fetch(
          `${API_URL}/rest/v1/profiles?select=role,full_name,company_id,is_platform_admin&id=eq.${authUser.id}&limit=1`,
          { headers: { Authorization: `Bearer ${token}`, apikey: API_KEY, Accept: 'application/json' } },
        ).then((r) => r.ok ? r.json() : []).catch(() => []),
        fetch(
          `${API_URL}/rest/v1/user_branches?select=branch_id,is_default&user_id=eq.${authUser.id}`,
          { headers: { Authorization: `Bearer ${token}`, apikey: API_KEY, Accept: 'application/json' } },
        ).then((r) => r.ok ? r.json() : []).catch(() => []),
      ])

      const profile = (profiles as Array<{
        role: string; full_name: string; company_id: string; is_platform_admin: boolean
      }>)[0] ?? null
      const assignments = branchRows as Array<{ branch_id: string; is_default: boolean }>
      const branchIds = assignments.map((r) => r.branch_id)
      const defaultBranchId = assignments.find((r) => r.is_default)?.branch_id
      const cookieBranch = readCookie('sea-branch')
      const activeBranchId =
        (cookieBranch && branchIds.includes(cookieBranch) ? cookieBranch : null)
        ?? defaultBranchId
        ?? branchIds[0]
        ?? null

      const authedUser: AuthedUser = {
        id:             authUser.id,
        email:          authUser.email ?? null,
        role:           (profile?.role ?? 'cashier') as UserRole,
        fullName:       profile?.full_name ?? null,
        companyId:      profile?.company_id ?? null,
        isPlatformAdmin: Boolean(profile?.is_platform_admin),
        activeBranchId,
        branchIds,
      }
      setUser(authedUser)

      if (authedUser.companyId && !authedUser.isPlatformAdmin && branchIds.length > 0) {
        const ubData = await fetch(
          `${API_URL}/rest/v1/user_branches?select=branch:branches(*)&user_id=eq.${authUser.id}`,
          { headers: { Authorization: `Bearer ${token}`, apikey: API_KEY, Accept: 'application/json' } },
        ).then((r) => r.ok ? r.json() : []).catch(() => [])
        const resolved: Branch[] = (ubData as Array<{ branch: Branch | Branch[] | null }>)
          .map((r) => Array.isArray(r.branch) ? r.branch[0] : r.branch)
          .filter((b): b is Branch => !!b)
          .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name))
        setBranches(resolved)
      }

      setLoading(false)
    }
    init()
  }, [])

  return (
    <AuthContext.Provider value={{ user, branches, loading, setActiveBranch, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
