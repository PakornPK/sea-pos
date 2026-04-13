import type { DB } from './types'
import type { Sale, SaleItem } from '@/types/database'

export type SaleSummaryForStats = {
  customer_id: string | null
  total_amount: number
  created_at: string
  status: string
}

export type SaleListRow = {
  id: string
  receipt_no: number
  created_at: string
  total_amount: number
  payment_method: string
  status: string
  customer: { name: string } | { name: string }[] | null
}

export const saleRepo = {
  async listRecent(db: DB, limit = 200): Promise<SaleListRow[]> {
    const { data } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name)')
      .order('receipt_no', { ascending: false })
      .limit(limit)
    return (data ?? []) as SaleListRow[]
  },

  async listForCustomer(db: DB, customerId: string) {
    const { data } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status')
      .eq('customer_id', customerId)
      .order('receipt_no', { ascending: false })
    return data ?? []
  },

  /** Minimal fields used for aggregating per-customer purchase stats. */
  async listCompletedForStats(db: DB): Promise<SaleSummaryForStats[]> {
    const { data } = await db
      .from('sales')
      .select('customer_id, total_amount, created_at, status')
      .eq('status', 'completed')
    return (data ?? []) as SaleSummaryForStats[]
  },

  async getById(db: DB, id: string) {
    const { data } = await db
      .from('sales')
      .select('*, customer:customers(name, phone)')
      .eq('id', id)
      .single()
    return data
  },

  async getStatus(db: DB, id: string): Promise<string | null> {
    const { data } = await db
      .from('sales').select('status').eq('id', id).single()
    return data?.status ?? null
  },

  async createHeader(
    db: DB,
    input: {
      user_id: string
      customer_id: string | null
      total_amount: number
      payment_method: Sale['payment_method']
    }
  ): Promise<{ id: string } | { error: string }> {
    const { data, error } = await db
      .from('sales')
      .insert({ ...input, status: 'completed' })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async insertItems(
    db: DB,
    saleId: string,
    items: Array<{ product_id: string; quantity: number; unit_price: number; subtotal: number }>
  ): Promise<string | null> {
    const { error } = await db
      .from('sale_items')
      .insert(items.map((i) => ({ sale_id: saleId, ...i })))
    return error?.message ?? null
  },

  async listItems(db: DB, saleId: string): Promise<Pick<SaleItem, 'product_id' | 'quantity'>[]> {
    const { data } = await db
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', saleId)
    return (data ?? []) as Pick<SaleItem, 'product_id' | 'quantity'>[]
  },

  async listItemsWithProduct(db: DB, saleId: string) {
    const { data } = await db
      .from('sale_items')
      .select('*, product:products(name, sku)')
      .eq('sale_id', saleId)
      .order('id')
    return data ?? []
  },

  /**
   * Atomic void: only transitions a currently-completed sale. Returns true
   * if a row was actually updated (false means already voided or not found).
   */
  async markVoided(db: DB, id: string): Promise<boolean | { error: string }> {
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
