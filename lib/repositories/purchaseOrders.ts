import type { DB } from './types'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/database'

export type POLineInput = {
  product_id: string
  quantity_ordered: number
  unit_cost: number
}

export type POListRow = {
  id: string
  po_no: number
  status: PurchaseOrderStatus
  total_amount: number
  ordered_at: string | null
  received_at: string | null
  created_at: string
  supplier: { name: string } | { name: string }[] | null
}

export const purchaseOrderRepo = {
  async listRecent(db: DB, limit = 200): Promise<POListRow[]> {
    const { data } = await db
      .from('purchase_orders')
      .select(`
        id, po_no, status, total_amount, ordered_at, received_at, created_at,
        supplier:suppliers(name)
      `)
      .order('po_no', { ascending: false })
      .limit(limit)
    return (data ?? []) as POListRow[]
  },

  async getById(db: DB, id: string): Promise<PurchaseOrder | null> {
    const { data } = await db
      .from('purchase_orders').select('*').eq('id', id).single()
    return (data as PurchaseOrder | null) ?? null
  },

  async getStatus(db: DB, id: string): Promise<PurchaseOrderStatus | null> {
    const { data } = await db
      .from('purchase_orders').select('status').eq('id', id).single()
    return (data?.status as PurchaseOrderStatus | null) ?? null
  },

  async listItemsWithProduct(db: DB, poId: string) {
    const { data } = await db
      .from('purchase_order_items')
      .select('id, product_id, quantity_ordered, quantity_received, unit_cost, product:products(name, sku)')
      .eq('po_id', poId)
    return data ?? []
  },

  async createHeader(
    db: DB,
    input: {
      supplier_id: string
      user_id: string
      total_amount: number
      notes: string | null
    }
  ): Promise<{ id: string } | { error: string }> {
    const { data, error } = await db
      .from('purchase_orders')
      .insert({ ...input, status: 'draft' })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async replaceItems(db: DB, poId: string, items: POLineInput[]): Promise<string | null> {
    await db.from('purchase_order_items').delete().eq('po_id', poId)
    const { error } = await db
      .from('purchase_order_items')
      .insert(items.map((i) => ({ po_id: poId, ...i })))
    return error?.message ?? null
  },

  async updateHeader(
    db: DB,
    id: string,
    input: { supplier_id: string; notes: string | null; total_amount: number }
  ): Promise<string | null> {
    const { error } = await db
      .from('purchase_orders').update(input).eq('id', id)
    return error?.message ?? null
  },

  /** Transition draft → ordered (sets ordered_at). Returns any error message. */
  async confirm(db: DB, id: string): Promise<string | null> {
    const { error } = await db
      .from('purchase_orders')
      .update({ status: 'ordered', ordered_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'draft')
    return error?.message ?? null
  },

  async cancel(db: DB, id: string): Promise<string | null> {
    const { error } = await db
      .from('purchase_orders').update({ status: 'cancelled' }).eq('id', id)
    return error?.message ?? null
  },

  /** RPC: atomic partial receive that also bumps product stock and writes stock_logs. */
  async receiveItem(
    db: DB,
    input: { itemId: string; qty: number; userId: string }
  ): Promise<string | null> {
    const { error } = await db.rpc('receive_po_item', {
      p_item_id: input.itemId,
      p_qty:     input.qty,
      p_user_id: input.userId,
    })
    return error?.message ?? null
  },
}
