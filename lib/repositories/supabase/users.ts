import type { UserRole } from '@/types/database'
import type { UserRepository, UserListRow } from '@/lib/repositories/contracts'
import { getAdminDb } from './db'

/**
 * User operations require the admin API (auth.admin.* + unrestricted
 * profiles access) — this adapter uses the service-role client internally.
 */
export const supabaseUserRepo: UserRepository = {
  async listAll(): Promise<UserListRow[]> {
    const admin = getAdminDb()
    const [{ data: authData }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 200 }),
      admin.from('profiles').select('id, role, full_name'),
    ])

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; role?: string; full_name?: string | null }) =>
        [p.id, p]
      )
    )

    return (authData?.users ?? []).map((u) => {
      const p = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        created_at: u.created_at,
        role: ((p?.role as UserRole) ?? 'cashier'),
        full_name: (p?.full_name as string | null) ?? null,
      }
    }).sort((a, b) => a.email.localeCompare(b.email))
  },

  async create(input) {
    const admin = getAdminDb()
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { role: input.role, full_name: input.full_name },
    })
    if (error) return { error: error.message }

    await admin.from('profiles').upsert({
      id: data.user.id,
      role: input.role,
      full_name: input.full_name,
    })
    return { id: data.user.id }
  },

  async updateProfile(id: string, input) {
    const { error } = await getAdminDb().from('profiles').update(input).eq('id', id)
    return error?.message ?? null
  },

  async updatePassword(id: string, password: string) {
    const { error } = await getAdminDb().auth.admin.updateUserById(id, { password })
    return error?.message ?? null
  },

  async delete(id: string) {
    const { error } = await getAdminDb().auth.admin.deleteUser(id)
    return error?.message ?? null
  },

  async forceSignOut(id: string, scope: 'global' | 'others' = 'global') {
    const { error } = await getAdminDb().auth.admin.signOut(id, scope)
    return error?.message ?? null
  },
}
