import type { HeldSale, HeldSaleItem } from '@/types/database'
import type { HeldSaleRepository, HeldSaleListRow } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseHeldSaleRepo: HeldSaleRepository = {
  async listForBranch(branchId: string): Promise<HeldSaleListRow[]> {
    const db = await getDb()
    const { data, error } = await db
      .from('held_sales')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[heldSales.listForBranch]', error.message)
      return []
    }

    const rows = data ?? []
    if (rows.length === 0) return []

    // Second round-trip for cashier names — Supabase can't infer the
    // `held_sales.user_id -> profiles.id` relationship because the FK points
    // at `auth.users`, not `profiles`. Separate query keeps this simple.
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    const nameMap = new Map<string, string | null>(
      (profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? null]),
    )

    return rows.map((r) => ({
      id:          r.id,
      branch_id:   r.branch_id,
      user_id:     r.user_id,
      customer_id: r.customer_id,
      items:       (r.items ?? []) as HeldSaleItem[],
      note:        r.note ?? null,
      created_at:  r.created_at,
      user: nameMap.has(r.user_id) ? { full_name: nameMap.get(r.user_id) ?? null } : null,
    } satisfies HeldSaleListRow))
  },

  async getById(id: string): Promise<HeldSale | null> {
    const db = await getDb()
    const { data } = await db
      .from('held_sales')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null
    return {
      id:          data.id,
      branch_id:   data.branch_id,
      user_id:     data.user_id,
      customer_id: data.customer_id,
      items:       (data.items ?? []) as HeldSaleItem[],
      note:        data.note ?? null,
      created_at:  data.created_at,
    }
  },

  async create(input) {
    const db = await getDb()
    const { data, error } = await db
      .from('held_sales')
      .insert({
        branch_id:   input.branch_id,
        user_id:     input.user_id,
        customer_id: input.customer_id,
        items:       input.items,
        note:        input.note,
      })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'พักบิลไม่สำเร็จ' }
    return { id: data.id }
  },

  async delete(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('held_sales').delete().eq('id', id)
    return error?.message ?? null
  },
}
