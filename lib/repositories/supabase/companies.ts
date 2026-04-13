import type { Company } from '@/types/database'
import type { CompanyRepository } from '@/lib/repositories/contracts'
import { getDb } from './db'

/**
 * Every read here is scoped to the current user's company by RLS
 * (`companies_select: id = get_current_company_id()`), so even though
 * these queries don't pass company_id explicitly they are tenant-safe.
 */
export const supabaseCompanyRepo: CompanyRepository = {
  async getCurrent(): Promise<Company | null> {
    const db = await getDb()
    // RLS returns at most the row for the current user's company
    const { data } = await db.from('companies').select('*').limit(1).maybeSingle()
    return (data as Company | null) ?? null
  },

  async getById(id: string): Promise<Company | null> {
    const db = await getDb()
    const { data } = await db.from('companies').select('*').eq('id', id).maybeSingle()
    return (data as Company | null) ?? null
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
}
