import type { Company, CompanyPlan, CompanyStatus } from '@/types/database'
import type { CompanyRepository, CompanyListRow } from '@/lib/repositories/contracts'
import { restGet, restPost, restPatchById, restDeleteById, restAdminAuthGet, restAdminAuthPost, restAdminAuthDelete } from '@/lib/api/rest'

export const fetchCompanyRepo: CompanyRepository = {
  async getCurrent(): Promise<Company | null> {
    const rows = await restGet<Company[]>('companies', { limit: '1' })
    return rows[0] ?? null
  },

  async getById(id: string): Promise<Company | null> {
    const rows = await restGet<Company[]>('companies', { id: `eq.${id}`, limit: '1' })
    return rows[0] ?? null
  },

  getByIdCached(id: string): Promise<Company | null> {
    return restGet<Company[]>('companies', { id: `eq.${id}`, limit: '1' })
      .then((rows) => rows[0] ?? null)
  },

  async updateSettings(id: string, settings: Record<string, unknown>): Promise<string | null> {
    try {
      await restPatchById('companies', id, { settings })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateName(id: string, name: string): Promise<string | null> {
    try {
      await restPatchById('companies', id, { name })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateBillingInfo(id, info): Promise<string | null> {
    try {
      await restPatchById('companies', id, info)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async listAll(): Promise<CompanyListRow[]> {
    // Platform-admin only — backend enforces via JWT role claim
    type AdminUser = { id: string; email: string; created_at: string }
    type ProfileRow = { id: string; company_id: string | null }
    const [companies, profiles, authUsers] = await Promise.all([
      restGet<Company[]>('companies', { order: 'created_at.desc' }),
      restGet<ProfileRow[]>('profiles', { select: 'id,company_id' }),
      restAdminAuthGet<{ users: AdminUser[] }>('admin/users'),
    ])

    const userMap = new Map<string, string | null>(
      (authUsers.users ?? []).map((u) => [u.id, u.email] as const),
    )
    const countByCompany = new Map<string, number>()
    for (const p of profiles) {
      if (!p.company_id) continue
      countByCompany.set(p.company_id, (countByCompany.get(p.company_id) ?? 0) + 1)
    }

    return companies.map((c) => ({
      ...c,
      owner_email: c.owner_id ? (userMap.get(c.owner_id) ?? null) : null,
      user_count:  countByCompany.get(c.id) ?? 0,
    }))
  },

  async setStatus(id: string, status: CompanyStatus): Promise<string | null> {
    try {
      await restPatchById('companies', id, { status })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async setPlan(id: string, plan: CompanyPlan): Promise<string | null> {
    try {
      await restPatchById('companies', id, { plan })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async createWithOwner(input): Promise<{ companyId: string; userId: string } | { error: string }> {
    try {
      // Create company
      const coRows = await restPost<Array<{ id: string }>>('companies', {
        name:     input.name,
        owner_id: null,
        plan:     'free',
        status:   'active',
      })
      const coRow = Array.isArray(coRows) ? coRows[0] : coRows as { id: string }
      if (!coRow?.id) return { error: 'ไม่สามารถสร้างบริษัทได้' }

      // Create auth user with company_id in metadata
      type AuthUserResult = { id: string; email: string }
      const userResult = await restAdminAuthPost<{ user: AuthUserResult }>('admin/users', {
        email:         input.ownerEmail,
        password:      input.ownerPassword,
        email_confirm: true,
        user_metadata: {
          role:       'admin',
          full_name:  input.ownerFullName,
          company_id: coRow.id,
        },
      })
      if (!userResult?.user?.id) {
        await restDeleteById('companies', coRow.id)
        return { error: 'ไม่สามารถสร้างผู้ใช้งานได้' }
      }

      await restPatchById('companies', coRow.id, {
        owner_id: userResult.user.id,
        status:   'active',
      })

      return { companyId: coRow.id, userId: userResult.user.id }
    } catch (e) {
      return { error: String(e) }
    }
  },
}
