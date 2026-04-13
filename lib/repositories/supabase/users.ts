import type { UserRole } from '@/types/database'
import type { UserRepository, UserListRow } from '@/lib/repositories/contracts'
import { getAdminDb } from './db'

/**
 * User operations require the admin API (auth.admin.* + unrestricted
 * profiles access) — this adapter uses the service-role client internally.
 */
export const supabaseUserRepo: UserRepository = {
  async countByCompany(companyId: string): Promise<number> {
    const { count } = await getAdminDb()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
    return count ?? 0
  },

  async listAll(): Promise<UserListRow[]> {
    const admin = getAdminDb()
    const [{ data: authData }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
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

  async listByCompany(companyId: string): Promise<UserListRow[]> {
    const admin = getAdminDb()
    // 1. Get the profile IDs for this company (service role — no RLS filter
    //    applies, but we explicitly filter by company_id).
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, role, full_name')
      .eq('company_id', companyId)

    const profileList = (profiles ?? []) as Array<{
      id: string
      role: string | null
      full_name: string | null
    }>
    const idSet = new Set(profileList.map((p) => p.id))
    if (idSet.size === 0) return []

    // 2. Fetch auth.users and join by id (only keep rows in idSet).
    //    listUsers doesn't support filtering by id[], so we page through
    //    and filter client-side. perPage=1000 is fine up to 1000 users
    //    per auth project; we'll revisit when that ceiling matters.
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })

    const rows: UserListRow[] = []
    for (const u of authData?.users ?? []) {
      if (!idSet.has(u.id)) continue
      const p = profileList.find((x) => x.id === u.id)
      rows.push({
        id: u.id,
        email: u.email ?? '',
        created_at: u.created_at,
        role: ((p?.role as UserRole) ?? 'cashier'),
        full_name: p?.full_name ?? null,
      })
    }
    return rows.sort((a, b) => a.email.localeCompare(b.email))
  },

  async getCompanyId(id: string): Promise<string | null> {
    const { data } = await getAdminDb()
      .from('profiles')
      .select('company_id')
      .eq('id', id)
      .maybeSingle()
    return (data?.company_id as string | null) ?? null
  },

  async create(input) {
    const admin = getAdminDb()
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      // company_id tells handle_new_user to attach to this tenant instead
      // of spawning a fresh company for the invited user.
      user_metadata: {
        role: input.role,
        full_name: input.full_name,
        company_id: input.companyId,
      },
    })
    if (error) return { error: error.message }

    // Safety net: upsert the profile with the exact role + company, in case
    // the trigger raced or the metadata key was ignored.
    await admin.from('profiles').upsert({
      id: data.user.id,
      role: input.role,
      full_name: input.full_name,
      company_id: input.companyId,
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
