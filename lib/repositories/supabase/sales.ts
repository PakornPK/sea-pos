import type { Sale, SaleItem } from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type {
  SaleRepository, SaleListRow, SaleSummaryForStats,
  SaleDetail, SaleItemWithProduct,
} from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseSaleRepo: SaleRepository = {
  async listRecent(limit = 200, opts: { branchId?: string | null } = {}): Promise<SaleListRow[]> {
    const db = await getDb()
    let q = db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name), branch:branches(code, name)')
      .order('receipt_no', { ascending: false })
      .limit(limit)
    if (opts.branchId) q = q.eq('branch_id', opts.branchId)
    const { data } = await q
    return (data ?? []) as SaleListRow[]
  },

  async listRecentPaginated(
    p: PageParams,
    opts: { branchId?: string | null } = {},
  ): Promise<Paginated<SaleListRow>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    let q = db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name), branch:branches(code, name)',
        { count: 'exact' })
      .order('receipt_no', { ascending: false })
      .range(from, to)
    if (opts.branchId) q = q.eq('branch_id', opts.branchId)
    const { data, count } = await q
    return packPaginated((data ?? []) as SaleListRow[], count ?? 0, p)
  },

  async listForCustomer(customerId: string) {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, branch:branches(code)')
      .eq('customer_id', customerId)
      .order('receipt_no', { ascending: false })
    return (data ?? []).map((s) => {
      const b = Array.isArray(s.branch) ? s.branch[0] : s.branch
      return {
        id: s.id,
        receipt_no: s.receipt_no,
        created_at: s.created_at,
        total_amount: Number(s.total_amount),
        payment_method: s.payment_method,
        status: s.status,
        branch_code: (b as { code?: string } | null)?.code ?? null,
      }
    })
  },

  async listCompletedForStats(): Promise<SaleSummaryForStats[]> {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('customer_id, total_amount, created_at, status')
      .eq('status', 'completed')
    return (data ?? []) as SaleSummaryForStats[]
  },

  async getById(id: string): Promise<SaleDetail | null> {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('*, customer:customers(name, phone)')
      .eq('id', id)
      .single()
    return (data as SaleDetail | null) ?? null
  },

  async getStatus(id: string): Promise<string | null> {
    const db = await getDb()
    const { data } = await db
      .from('sales').select('status').eq('id', id).single()
    return data?.status ?? null
  },

  async createHeader(input): Promise<{ id: string } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('sales')
      .insert({
        user_id:              input.user_id,
        customer_id:          input.customer_id,
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
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async insertItems(saleId, items): Promise<{ ids: string[] } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('sale_items')
      .insert(items.map((i) => ({ sale_id: saleId, ...i })))
      .select('id')
    if (error || !data) return { error: error?.message ?? 'บันทึกรายการไม่สำเร็จ' }
    return { ids: data.map((r) => r.id) }
  },

  async listItems(saleId: string) {
    const db = await getDb()
    const { data } = await db
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', saleId)
    return (data ?? []) as Pick<SaleItem, 'product_id' | 'quantity'>[]
  },

  async listItemsWithProduct(saleId: string): Promise<SaleItemWithProduct[]> {
    const db = await getDb()
    const { data } = await db
      .from('sale_items')
      .select('*, product:products(name, sku, unit), sale_item_options(group_name, option_name, price_delta)')
      .eq('sale_id', saleId)
      .order('id')
    return (data ?? []) as SaleItemWithProduct[]
  },

  async markVoided(id: string): Promise<boolean | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('sales')
      .update({ status: 'voided' })
      .eq('id', id)
      .eq('status', 'completed')
      .select('id')
    if (error) return { error: error.message }
    return (data?.length ?? 0) > 0
  },
}
