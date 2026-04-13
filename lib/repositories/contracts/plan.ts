import type { Plan } from '@/types/database'

export type PlanInput = {
  name: string
  description: string | null
  max_products: number | null
  max_users: number | null
  max_branches: number | null
  monthly_price_baht: number | null
  sort_order: number
  is_active: boolean
}

export interface PlanRepository {
  /** Active plans only, ordered for display. */
  listActive(): Promise<Plan[]>
  /** All plans including inactive — for platform admin management. */
  listAll(): Promise<Plan[]>
  getByCode(code: string): Promise<Plan | null>
  update(code: string, input: PlanInput): Promise<string | null>
}
