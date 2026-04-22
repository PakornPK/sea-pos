import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type {
  PurchaseOrderRepository, POListRow, POLineInput, POItemWithProduct,
} from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabasePurchaseOrderRepo: PurchaseOrderRepository = {
  async listRecent(limit = 200, opts: { branchId?: string | null } = {}): Promise<POListRow[]> {
    const db = await getDb()
    let q = db
      .from('purchase_orders')
      .select(`
        id, po_no, status, total_amount, ordered_at, received_at, created_at,
        supplier:suppliers(name),
        branch:branches(code, name)
      `)
      .order('po_no', { ascending: false })
      .limit(limit)
    if (opts.branchId) q = q.eq('branch_id', opts.branchId)
    const { data } = await q
    return (data ?? []) as POListRow[]
  },

  async listRecentPaginated(
    p: PageParams,
    opts: { status?: PurchaseOrderStatus; branchId?: string | null } = {}
  ): Promise<Paginated<POListRow>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    let q = db
      .from('purchase_orders')
      .select(`
        id, po_no, status, total_amount, ordered_at, received_at, created_at,
        supplier:suppliers(name),
        branch:branches(code, name)
      `, { count: 'exact' })
      .order('po_no', { ascending: false })
      .range(from, to)
    if (opts.status)   q = q.eq('status', opts.status)
    if (opts.branchId) q = q.eq('branch_id', opts.branchId)

    const { data, count } = await q
    return packPaginated((data ?? []) as POListRow[], count ?? 0, p)
  },

  async getById(id: string): Promise<PurchaseOrder | null> {
    const db = await getDb()
    const { data } = await db
      .from('purchase_orders').select('*').eq('id', id).single()
    return (data as PurchaseOrder | null) ?? null
  },

  async getStatus(id: string): Promise<PurchaseOrderStatus | null> {
    const db = await getDb()
    const { data } = await db
      .from('purchase_orders').select('status').eq('id', id).single()
    return (data?.status as PurchaseOrderStatus | null) ?? null
  },

  async listItemsWithProduct(poId: string): Promise<POItemWithProduct[]> {
    const db = await getDb()
    const { data } = await db
      .from('purchase_order_items')
      .select('id, product_id, quantity_ordered, quantity_received, unit_cost, product:products(name, sku, unit, po_unit, po_conversion)')
      .eq('po_id', poId)
    return (data ?? []) as POItemWithProduct[]
  },

  async createHeader(input): Promise<{ id: string } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('purchase_orders')
      .insert({
        supplier_id:     input.supplier_id,
        user_id:         input.user_id,
        branch_id:       input.branch_id,
        total_amount:    input.total_amount,
        subtotal_ex_vat: input.subtotal_ex_vat,
        vat_amount:      input.vat_amount,
        notes:           input.notes,
        status:          'draft',
      })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async replaceItems(poId: string, items: POLineInput[]): Promise<string | null> {
    const db = await getDb()
    await db.from('purchase_order_items').delete().eq('po_id', poId)
    const { error } = await db
      .from('purchase_order_items')
      .insert(items.map((i) => ({ po_id: poId, ...i })))
    return error?.message ?? null
  },

  async updateHeader(id, input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('purchase_orders').update(input).eq('id', id)
    return error?.message ?? null
  },

  async confirm(id: string, confirmedByUserId: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('purchase_orders')
      .update({
        status: 'ordered',
        ordered_at: new Date().toISOString(),
        confirmed_by_user_id: confirmedByUserId,
      })
      .eq('id', id)
      .eq('status', 'draft')
    return error?.message ?? null
  },

  async cancel(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('purchase_orders').update({ status: 'cancelled' }).eq('id', id)
    return error?.message ?? null
  },

  async receiveItem(input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.rpc('receive_po_item', {
      p_item_id:   input.itemId,
      p_qty:       input.qty,
      p_stock_qty: input.stockQty,
      p_user_id:   input.userId,
    })
    return error?.message ?? null
  },
}
