import type { Plan } from '@/types/database'
import type { PlanRepository, PlanInput } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabasePlanRepo: PlanRepository = {
  async listActive(): Promise<Plan[]> {
    const db = await getDb()
    const { data } = await db
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return (data ?? []) as Plan[]
  },

  async listAll(): Promise<Plan[]> {
    const db = await getDb()
    const { data } = await db
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true })
    return (data ?? []) as Plan[]
  },

  async getByCode(code: string): Promise<Plan | null> {
    const db = await getDb()
    const { data } = await db
      .from('plans').select('*').eq('code', code).maybeSingle()
    return (data as Plan | null) ?? null
  },

  async update(code: string, input: PlanInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('plans').update(input).eq('code', code)
    return error?.message ?? null
  },
}
