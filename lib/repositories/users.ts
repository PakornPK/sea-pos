import type { DB } from './types'
import type { UserRole } from '@/types/database'

/**
 * The user repo wraps both the admin API (auth.admin.*) and the profiles
 * table. Callers must pass a service-role client (createAdminClient) since
 * only it can call auth.admin.* and read all profiles.
 */
export const userRepo = {
  async listAll(db: DB): Promise<
    Array<{ id: string; email: string; created_at: string; role: UserRole; full_name: string | null }>
  > {
    const [{ data: authData }, { data: profiles }] = await Promise.all([
      db.auth.admin.listUsers({ perPage: 200 }),
      db.from('profiles').select('id, role, full_name'),
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

  async create(
    db: DB,
    input: { email: string; password: string; role: UserRole; full_name: string | null }
  ): Promise<{ id: string } | { error: string }> {
    const { data, error } = await db.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { role: input.role, full_name: input.full_name },
    })
    if (error) return { error: error.message }

    // Trigger handle_new_user inserts profile, but ensure role/name are correct
    await db.from('profiles').upsert({
      id: data.user.id,
      role: input.role,
      full_name: input.full_name,
    })
    return { id: data.user.id }
  },

  async updateProfile(
    db: DB,
    id: string,
    input: { role: UserRole; full_name: string | null }
  ): Promise<string | null> {
    const { error } = await db.from('profiles').update(input).eq('id', id)
    return error?.message ?? null
  },

  async updatePassword(db: DB, id: string, password: string): Promise<string | null> {
    const { error } = await db.auth.admin.updateUserById(id, { password })
    return error?.message ?? null
  },

  async delete(db: DB, id: string): Promise<string | null> {
    const { error } = await db.auth.admin.deleteUser(id)
    return error?.message ?? null
  },

  /**
   * Invalidate all refresh tokens for this user across every device.
   * The user's current access token (≤10 min TTL) still works until it
   * expires — that's the inherent tradeoff of stateless JWT auth.
   * Scope 'global' = all sessions; 'others' = keep the caller's own.
   */
  async forceSignOut(
    db: DB,
    id: string,
    scope: 'global' | 'others' = 'global'
  ): Promise<string | null> {
    const { error } = await db.auth.admin.signOut(id, scope)
    return error?.message ?? null
  },
}
