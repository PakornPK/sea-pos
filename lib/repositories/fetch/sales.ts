import type { Sale, SaleItem } from '@/types/database'
import type {
  SaleRepository, SaleListRow, SaleSummaryForStats,
  SaleDetail, SaleItemWithProduct,
} from '@/lib/repositories/contracts'
import type { PageParams, Paginated } from '@/lib/pagination'
import { restGet, restGetPaginated, restPost, restPatch } from '@/lib/api/rest'

export const fetchSaleRepo: SaleRepository = {
  async listRecent(limit = 200, opts: { branchId?: string | null } = {}): Promise<SaleListRow[]> {
    const params: Record<string, string | string[]> = {
      select: 'id,receipt_no,created_at,total_amount,payment_method,status,member:members(name),branch:branches(code,name)',
      order:  'receipt_no.desc',
      limit:  String(limit),
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`
    const rows = await restGet<Array<SaleListRow & { member: { name: string } | Array<{ name: string }> | null }>>('sales', params)
    return rows.map((r) => {
      const m = Array.isArray(r.member) ? r.member[0] : r.member
      return { ...r, member_name: m?.name ?? null }
    })
  },

  async listRecentPaginated(p: PageParams, opts: { branchId?: string | null } = {}): Promise<Paginated<SaleListRow>> {
    const params: Record<string, string | string[]> = {
      select: 'id,receipt_no,created_at,total_amount,payment_method,status,member:members(name),branch:branches(code,name)',
      order:  'receipt_no.desc',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`
    const result = await restGetPaginated<SaleListRow & { member: { name: string } | Array<{ name: string }> | null }>('sales', p, params)
    return {
      ...result,
      rows: result.rows.map((r) => {
        const m = Array.isArray(r.member) ? r.member[0] : r.member
        return { ...r, member_name: m?.name ?? null }
      }),
    }
  },

  async listCompletedForStats(): Promise<SaleSummaryForStats[]> {
    return restGet<SaleSummaryForStats[]>('sales', {
      select: 'total_amount,created_at,status',
      status: 'eq.completed',
    })
  },

  async getById(id: string): Promise<SaleDetail | null> {
    const rows = await restGet<Array<SaleDetail & { member: { name: string } | Array<{ name: string }> | null }>>('sales', {
      select: '*,member:members(name)',
      id:     `eq.${id}`,
      limit:  '1',
    })
    const r = rows[0]
    if (!r) return null
    const m = Array.isArray(r.member) ? r.member[0] : r.member
    return { ...r, member_name: m?.name ?? null }
  },

  async getStatus(id: string): Promise<string | null> {
    const rows = await restGet<Array<{ status: string }>>('sales', {
      select: 'status',
      id:     `eq.${id}`,
      limit:  '1',
    })
    return rows[0]?.status ?? null
  },

  async create(input): Promise<{ id: string; itemIds: string[] } | { error: string }> {
    try {
      const res = await restPost<{ id: string; items?: Array<{ id: string }> } | Array<{ id: string; items?: Array<{ id: string }> }>>('sales', {
        user_id:              input.user_id,
        member_id:            input.member_id            ?? null,
        branch_id:            input.branch_id,
        total_amount:         input.total_amount,
        subtotal_ex_vat:      input.subtotal_ex_vat,
        vat_amount:           input.vat_amount,
        member_discount_baht: input.member_discount_baht ?? 0,
        redeem_points_used:   input.redeem_points_used   ?? 0,
        payment_method:       input.payment_method,
        status:               'completed' as Sale['status'],
        items:                input.items,
      })
      const sale = Array.isArray(res) ? res[0] : res as { id: string; items?: Array<{ id: string }> }
      if (!sale?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: sale.id, itemIds: (sale.items ?? []).map((i) => i.id) }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async createHeader(input): Promise<{ id: string } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('sales', {
        user_id:              input.user_id,
        member_id:            input.member_id            ?? null,
        branch_id:            input.branch_id,
        total_amount:         input.total_amount,
        subtotal_ex_vat:      input.subtotal_ex_vat,
        vat_amount:           input.vat_amount,
        member_discount_baht: input.member_discount_baht ?? 0,
        redeem_points_used:   input.redeem_points_used   ?? 0,
        payment_method:       input.payment_method,
        status:               'completed' as Sale['status'],
      })
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      if (!row?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async insertItems(saleId, items): Promise<{ ids: string[] } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('sale_items',
        items.map((i) => ({ sale_id: saleId, ...i })),
      )
      const arr = Array.isArray(rows) ? rows : [rows as { id: string }]
      return { ids: arr.map((r) => r.id) }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async listItems(saleId: string) {
    return restGet<Pick<SaleItem, 'product_id' | 'quantity'>[]>('sale_items', {
      select:  'product_id,quantity',
      sale_id: `eq.${saleId}`,
    })
  },

  async listItemsWithProduct(saleId: string): Promise<SaleItemWithProduct[]> {
    return restGet<SaleItemWithProduct[]>('sale_items', {
      select:  '*,product:products(name,sku,unit),sale_item_options(group_name,option_name,price_delta)',
      sale_id: `eq.${saleId}`,
      order:   'id.asc',
    })
  },

  async markVoided(id: string): Promise<boolean | { error: string }> {
    try {
      await restPatch('sales', {
        id:     `eq.${id}`,
        status: 'eq.completed',
      }, { status: 'voided' })
      return true
    } catch (e) {
      return { error: String(e) }
    }
  },
}
