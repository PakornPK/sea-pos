import type { UserRole } from '@/types/database'
import type { UserRepository, UserListRow } from '@/lib/repositories/contracts'
import { restGet, restPost, restPatchById, restAdminAuthGet, restAdminAuthPost, restAdminAuthPut, restAdminAuthDelete } from '@/lib/api/rest'

type AdminUser = {
  id: string
  email: string
  created_at: string
}

// Backend may return { users: [...] } (GoTrue style) or [...] (array style).
function extractUsers(raw: unknown): AdminUser[] {
  if (Array.isArray(raw)) return raw as AdminUser[]
  const obj = raw as { users?: AdminUser[] }
  return obj?.users ?? []
}

type ProfileRow = {
  id: string
  role: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  company_id: string | null
}

export const fetchUserRepo: UserRepository = {
  async countByCompany(_companyId: string): Promise<number> {
    // backend filters by tenant
    const rows = await restGet<{ id: string }[]>('profiles', { select: 'id' })
    return rows.length
  },

  async listAll(): Promise<UserListRow[]> {
    const [authRaw, profiles] = await Promise.all([
      restAdminAuthGet<unknown>('admin/users'),
      restGet<ProfileRow[]>('profiles', { select: 'id,role,first_name,last_name,full_name' }),
    ])
    const authUsers = extractUsers(authRaw)
    const profileMap = new Map(profiles.map((p) => [p.id, p]))
    return authUsers.map((u) => {
      const p = profileMap.get(u.id)
      return {
        id:         u.id,
        email:      u.email ?? '',
        created_at: u.created_at,
        role:       ((p?.role as UserRole) ?? 'cashier'),
        first_name: p?.first_name ?? null,
        last_name:  p?.last_name  ?? null,
        full_name:  p?.full_name  ?? null,
      }
    }).sort((a, b) => a.email.localeCompare(b.email))
  },

  async listByCompany(_companyId: string): Promise<UserListRow[]> {
    // backend filters by company via JWT tenant context
    const [profiles, authUsers] = await Promise.all([
      restGet<ProfileRow[]>('profiles', { select: 'id,role,first_name,last_name,full_name' }),
      fetch('/api/users').then((r) => r.json() as Promise<AdminUser[]>).catch(() => [] as AdminUser[]),
    ])

    const emailMap = new Map(authUsers.map((u) => [u.id, u]))

    return profiles.map((p) => ({
      id:         p.id,
      email:      emailMap.get(p.id)?.email ?? '',
      created_at: emailMap.get(p.id)?.created_at ?? '',
      role:       ((p.role as UserRole) ?? 'cashier'),
      first_name: p.first_name,
      last_name:  p.last_name,
      full_name:  p.full_name,
    })).sort((a, b) => a.email.localeCompare(b.email))
  },

  async getCompanyId(id: string): Promise<string | null> {
    const rows = await restGet<Array<{ company_id: string | null }>>('profiles', {
      select: 'company_id',
      id:     `eq.${id}`,
      limit:  '1',
    })
    return rows[0]?.company_id ?? null
  },

  async create(input): Promise<{ id: string } | { error: string }> {
    // Step 1: create auth user — 409 here means email already taken
    type AuthUserResult = { id?: string; user?: { id?: string } }
    let result: AuthUserResult
    try {
      result = await restAdminAuthPost<AuthUserResult>('admin/users', {
        email:         input.email,
        password:      input.password,
        email_confirm: true,
        user_metadata: {
          role:       input.role,
          first_name: input.first_name,
          last_name:  input.last_name,
          full_name:  input.full_name,
          company_id: input.companyId,
        },
      })
    } catch (e) {
      const msg = String(e)
      if (msg.includes('409') || msg.includes('already registered')) {
        return { error: 'อีเมลนี้ถูกใช้งานแล้ว' }
      }
      return { error: msg }
    }

    const userId = result?.user?.id ?? result?.id
    if (!userId) return { error: 'ไม่สามารถสร้างผู้ใช้งานได้' }

    // Step 2: upsert profile — ignore 409 (trigger may have created it already)
    try {
      await restPost('profiles', {
        id:         userId,
        role:       input.role,
        first_name: input.first_name,
        last_name:  input.last_name,
        full_name:  input.full_name,
        company_id: input.companyId,
      })
    } catch { /* profile may already exist via trigger */ }

    return { id: userId }
  },

  async updateProfile(id, input): Promise<string | null> {
    try {
      await restPatchById('profiles', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updatePassword(id, password): Promise<string | null> {
    try {
      await restAdminAuthPut(`admin/users/${id}`, { password })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async delete(id): Promise<string | null> {
    try {
      await restAdminAuthDelete(`admin/users/${id}`)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async forceSignOut(id, _scope = 'global'): Promise<string | null> {
    try {
      await restAdminAuthPost(`admin/users/${id}/logout`, {})
      return null
    } catch (e) {
      return String(e)
    }
  },
}
