import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/database'
import type {
  PurchaseOrderRepository, POListRow, POLineInput, POItemWithProduct,
} from '@/lib/repositories/contracts'
import type { PageParams, Paginated } from '@/lib/pagination'
import { restGet, restGetPaginated, restPost, restPatch, restPatchById, restDelete, restRpc } from '@/lib/api/rest'

const PO_SELECT = 'id,po_no,status,total_amount,ordered_at,received_at,created_at,supplier:suppliers(name),branch:branches(code,name)'

export const fetchPurchaseOrderRepo: PurchaseOrderRepository = {
  async listRecent(limit = 200, opts: { branchId?: string | null } = {}): Promise<POListRow[]> {
    const params: Record<string, string | string[]> = {
      select: PO_SELECT,
      order:  'po_no.desc',
      limit:  String(limit),
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`
    return restGet<POListRow[]>('purchase_orders', params)
  },

  async listRecentPaginated(
    p: PageParams,
    opts: { status?: PurchaseOrderStatus; branchId?: string | null } = {},
  ): Promise<Paginated<POListRow>> {
    const params: Record<string, string | string[]> = {
      select: PO_SELECT,
      order:  'po_no.desc',
    }
    if (opts.status)   params.status    = `eq.${opts.status}`
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`
    return restGetPaginated<POListRow>('purchase_orders', p, params)
  },

  async getById(id: string): Promise<PurchaseOrder | null> {
    const rows = await restGet<PurchaseOrder[]>('purchase_orders', { id: `eq.${id}`, limit: '1' })
    return rows[0] ?? null
  },

  async getStatus(id: string): Promise<PurchaseOrderStatus | null> {
    const rows = await restGet<Array<{ status: string }>>('purchase_orders', {
      select: 'status', id: `eq.${id}`, limit: '1',
    })
    return (rows[0]?.status as PurchaseOrderStatus | undefined) ?? null
  },

  async listItemsWithProduct(poId: string): Promise<POItemWithProduct[]> {
    const rows = await restGet<Array<Record<string, unknown>>>('purchase_orders', {
      select: 'id,items:purchase_order_items(id,product_id,quantity_ordered,quantity_received,unit_cost,product:products(name,sku,unit,po_unit,po_conversion))',
      id:     `eq.${poId}`,
      limit:  '1',
    }).catch(() => [] as Array<Record<string, unknown>>)
    const row = rows[0]
    if (!row) return []
    const items = (row.items ?? row.purchase_order_items) as POItemWithProduct[] | null
    return Array.isArray(items) ? items : []
  },

  async create(input): Promise<{ id: string } | { error: string }> {
    try {
      const res = await restPost<{ id: string } | Array<{ id: string }>>('purchase_orders', {
        supplier_id:     input.supplier_id,
        branch_id:       input.branch_id,
        total_amount:    input.total_amount,
        subtotal_ex_vat: input.subtotal_ex_vat,
        vat_amount:      input.vat_amount,
        notes:           input.notes,
        items:           input.items,
      })
      const row = Array.isArray(res) ? res[0] : res as { id: string }
      if (!row?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async createHeader(input): Promise<{ id: string } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('purchase_orders', {
        supplier_id:     input.supplier_id,
        user_id:         input.user_id,
        branch_id:       input.branch_id,
        total_amount:    input.total_amount,
        subtotal_ex_vat: input.subtotal_ex_vat,
        vat_amount:      input.vat_amount,
        notes:           input.notes,
        status:          'draft',
      })
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      if (!row?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async replaceItems(poId: string, items: POLineInput[]): Promise<string | null> {
    try {
      await restDelete('purchase_order_items', { po_id: `eq.${poId}` })
      if (items.length > 0) {
        await restPost('purchase_order_items', items.map((i) => ({ po_id: poId, ...i })))
      }
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateHeader(id, input): Promise<string | null> {
    try {
      await restPatchById('purchase_orders', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async confirm(id: string, confirmedByUserId: string): Promise<string | null> {
    try {
      await restPatch('purchase_orders', { id: `eq.${id}`, status: 'eq.draft' }, {
        status:               'ordered',
        ordered_at:           new Date().toISOString(),
        confirmed_by_user_id: confirmedByUserId,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async cancel(id: string): Promise<string | null> {
    try {
      await restPatchById('purchase_orders', id, { status: 'cancelled' })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async receiveItem(input): Promise<string | null> {
    try {
      await restRpc('receive_po_item', {
        p_item_id:   input.itemId,
        p_qty:       input.qty,
        p_stock_qty: input.stockQty,
        p_user_id:   input.userId,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },
}
