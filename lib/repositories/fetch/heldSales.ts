import type { HeldSale, HeldSaleItem } from '@/types/database'
import type { HeldSaleRepository, HeldSaleListRow } from '@/lib/repositories/contracts'
import { restGet, restPost, restDeleteById } from '@/lib/api/rest'

export const fetchHeldSaleRepo: HeldSaleRepository = {
  async listForBranch(branchId: string): Promise<HeldSaleListRow[]> {
    const rows = await restGet<Array<{
      id: string; branch_id: string; user_id: string; member_id: string | null
      items: HeldSaleItem[]; note: string | null; created_at: string
      profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null
    }>>('held_sales', {
      select:    '*,profiles(full_name)',
      branch_id: `eq.${branchId}`,
      order:     'created_at.desc',
    })
    return rows.map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        id:        r.id,
        branch_id: r.branch_id,
        user_id:   r.user_id,
        member_id: r.member_id,
        items:     r.items ?? [],
        note:      r.note ?? null,
        created_at: r.created_at,
        user:      profile ? { full_name: profile.full_name ?? null } : null,
      } satisfies HeldSaleListRow
    })
  },

  async getById(id: string): Promise<HeldSale | null> {
    const rows = await restGet<Array<{
      id: string; branch_id: string; user_id: string; member_id: string | null
      items: HeldSaleItem[]; note: string | null; created_at: string
    }>>('held_sales', { id: `eq.${id}`, limit: '1' })
    const r = rows[0]
    if (!r) return null
    return {
      id:        r.id,
      branch_id: r.branch_id,
      user_id:   r.user_id,
      member_id: r.member_id,
      items:     r.items ?? [],
      note:      r.note ?? null,
      created_at: r.created_at,
    }
  },

  async create(input): Promise<{ id: string } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('held_sales', {
        branch_id: input.branch_id,
        member_id: input.member_id,
        items:     input.items,
        note:      input.note,
      })
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      if (!row?.id) return { error: 'พักบิลไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async delete(id: string): Promise<string | null> {
    try {
      await restDeleteById('held_sales', id)
      return null
    } catch (e) {
      return String(e)
    }
  },
}
