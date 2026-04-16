import type { Plan } from '@/types/database'
import type { PlanRepository, PlanInput, PlanWithUsage } from '@/lib/repositories/contracts'
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

  async listAllWithUsage(): Promise<PlanWithUsage[]> {
    const db = await getDb()
    const [{ data: plans }, { data: counts }] = await Promise.all([
      db.from('plans').select('*').order('sort_order', { ascending: true }),
      db.from('companies').select('plan'),
    ])
    const countMap: Record<string, number> = {}
    for (const c of counts ?? []) {
      countMap[c.plan] = (countMap[c.plan] ?? 0) + 1
    }
    return (plans ?? []).map((p) => ({
      ...(p as Plan),
      company_count: countMap[p.code] ?? 0,
    }))
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

  async create(code: string, input: PlanInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('plans').insert({ code, ...input })
    return error?.message ?? null
  },

  async delete(code: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('plans').delete().eq('code', code)
    return error?.message ?? null
  },
}
