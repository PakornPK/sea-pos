import type { Plan } from '@/types/database'
import type { PlanRepository, PlanInput, PlanWithUsage } from '@/lib/repositories/contracts'
import { restGet, restPost, restPatch, restDelete } from '@/lib/api/rest'

export const fetchPlanRepo: PlanRepository = {
  async listActive(): Promise<Plan[]> {
    return restGet<Plan[]>('plans', { is_active: 'eq.true', order: 'sort_order.asc' })
  },

  async listAll(): Promise<Plan[]> {
    return restGet<Plan[]>('plans', { order: 'sort_order.asc' })
  },

  async listAllWithUsage(): Promise<PlanWithUsage[]> {
    const [plans, companies] = await Promise.all([
      restGet<Plan[]>('plans', { order: 'sort_order.asc' }),
      restGet<{ plan: string }[]>('companies', { select: 'plan' }),
    ])
    const countMap: Record<string, number> = {}
    for (const c of companies) {
      countMap[c.plan] = (countMap[c.plan] ?? 0) + 1
    }
    return plans.map((p) => ({ ...p, company_count: countMap[p.code] ?? 0 }))
  },

  async getByCode(code: string): Promise<Plan | null> {
    const rows = await restGet<Plan[]>('plans', { code: `eq.${code}`, limit: '1' }).catch(() => [])
    return rows[0] ?? null
  },

  async update(code: string, input: PlanInput): Promise<string | null> {
    try {
      await restPatch('plans', { code: `eq.${code}` }, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async create(code: string, input: PlanInput): Promise<string | null> {
    try {
      await restPost('plans', { code, ...input })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async delete(code: string): Promise<string | null> {
    try {
      await restDelete('plans', { code: `eq.${code}` })
      return null
    } catch (e) {
      return String(e)
    }
  },
}
