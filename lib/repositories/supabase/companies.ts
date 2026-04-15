import { unstable_cache } from 'next/cache'
import type { Company, CompanyPlan, CompanyStatus } from '@/types/database'
import type { CompanyRepository, CompanyListRow } from '@/lib/repositories/contracts'
import { getDb, getAdminDb } from './db'

export const supabaseCompanyRepo: CompanyRepository = {
  async getCurrent(): Promise<Company | null> {
    const db = await getDb()
    const { data } = await db.from('companies').select('*').limit(1).maybeSingle()
    return (data as Company | null) ?? null
  },

  async getById(id: string): Promise<Company | null> {
    const db = await getDb()
    const { data } = await db.from('companies').select('*').eq('id', id).maybeSingle()
    return (data as Company | null) ?? null
  },

  getByIdCached(id: string): Promise<Company | null> {
    return unstable_cache(
      async (): Promise<Company | null> => {
        const { data } = await getAdminDb().from('companies').select('*').eq('id', id).maybeSingle()
        return (data as Company | null) ?? null
      },
      ['company', id],
      { tags: [`company:${id}`] },
    )()
  },

  async updateSettings(id: string, settings: Record<string, unknown>): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('companies').update({ settings }).eq('id', id)
    return error?.message ?? null
  },

  async updateName(id: string, name: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('companies').update({ name }).eq('id', id)
    return error?.message ?? null
  },

  async listAll(): Promise<CompanyListRow[]> {
    const admin = getAdminDb()
    const [{ data: companies }, { data: profiles }, { data: authUsers }] = await Promise.all([
      admin.from('companies').select('*').order('created_at', { ascending: false }),
      admin.from('profiles').select('id, company_id'),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ])

    const userMap = new Map<string, string | null>(
      (authUsers?.users ?? []).map((u) => [u.id, u.email ?? null] as const)
    )
    const countByCompany = new Map<string, number>()
    for (const p of profiles ?? []) {
      if (!p.company_id) continue
      countByCompany.set(p.company_id, (countByCompany.get(p.company_id) ?? 0) + 1)
    }

    return (companies ?? []).map((c) => ({
      ...(c as Company),
      owner_email: c.owner_id ? userMap.get(c.owner_id) ?? null : null,
      user_count: countByCompany.get(c.id) ?? 0,
    }))
  },

  async setStatus(id: string, status: CompanyStatus): Promise<string | null> {
    const admin = getAdminDb()
    const { error } = await admin.from('companies').update({ status }).eq('id', id)
    return error?.message ?? null
  },

  async setPlan(id: string, plan: CompanyPlan): Promise<string | null> {
    const admin = getAdminDb()
    const { error } = await admin.from('companies').update({ plan }).eq('id', id)
    return error?.message ?? null
  },

  async createWithOwner(input) {
    const admin = getAdminDb()

    // Create the company first (owner_id assigned after user exists).
    // This lets us pass company_id in user metadata so the handle_new_user
    // trigger takes the "invitation" path — skipping its own company INSERT
    // and avoiding a duplicate orphaned company.
    const { data: co, error: coErr } = await admin
      .from('companies')
      .insert({
        name: input.name,
        owner_id: null,
        plan: 'free',
        status: 'active',
      })
      .select('id')
      .single()
    if (coErr || !co) {
      return { error: coErr?.message ?? 'ไม่สามารถสร้างบริษัทได้' }
    }

    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: input.ownerEmail,
      password: input.ownerPassword,
      email_confirm: true,
      // Passing company_id causes the trigger to attach this user to the
      // existing company instead of creating a second one.
      user_metadata: { role: 'admin', full_name: input.ownerFullName, company_id: co.id },
    })
    if (userErr || !userData) {
      await admin.from('companies').delete().eq('id', co.id)
      return { error: userErr?.message ?? 'ไม่สามารถสร้างผู้ใช้งานได้' }
    }

    // Stamp the owner and ensure status = active (trigger sets plan but not status).
    await admin
      .from('companies')
      .update({ owner_id: userData.user.id, status: 'active' })
      .eq('id', co.id)

    // Ensure the profile has the correct role/name (trigger already set company_id).
    await admin.from('profiles').upsert({
      id: userData.user.id,
      role: 'admin',
      full_name: input.ownerFullName,
      company_id: co.id,
    })

    // Create a default branch for the new company.
    const { data: branch, error: branchErr } = await admin
      .from('branches')
      .insert({
        company_id: co.id,
        name: 'สาขาหลัก',
        code: 'B01',
        is_default: true,
      })
      .select('id')
      .single()

    if (!branchErr && branch) {
      // Assign the owner to the default branch.
      await admin.from('user_branches').insert({
        user_id:    userData.user.id,
        branch_id:  branch.id,
        company_id: co.id,
        is_default: true,
      })
    }

    return { companyId: co.id, userId: userData.user.id }
  },
}
