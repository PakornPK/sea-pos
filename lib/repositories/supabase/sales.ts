import type { Sale, SaleItem } from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type {
  SaleRepository, SaleListRow, SaleSummaryForStats,
  SaleDetail, SaleItemWithProduct,
} from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseSaleRepo: SaleRepository = {
  async listRecent(limit = 200): Promise<SaleListRow[]> {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name)')
      .order('receipt_no', { ascending: false })
      .limit(limit)
    return (data ?? []) as SaleListRow[]
  },

  async listRecentPaginated(p: PageParams): Promise<Paginated<SaleListRow>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    const { data, count } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name)',
        { count: 'exact' })
      .order('receipt_no', { ascending: false })
      .range(from, to)
    return packPaginated((data ?? []) as SaleListRow[], count ?? 0, p)
  },

  async listForCustomer(customerId: string) {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status')
      .eq('customer_id', customerId)
      .order('receipt_no', { ascending: false })
    return data ?? []
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
      .insert({ ...input, status: 'completed' as Sale['status'] })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async insertItems(saleId, items): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('sale_items')
      .insert(items.map((i) => ({ sale_id: saleId, ...i })))
    return error?.message ?? null
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
      .select('*, product:products(name, sku)')
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
