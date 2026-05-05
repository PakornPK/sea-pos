import type {
  StockTransferRepository,
  StockTransferListRow,
  StockTransferDetail,
  StockTransferItemWithProduct,
  StockTransferLineInput,
  ReceiveOverride,
} from '@/lib/repositories/contracts'
import type { StockTransfer, StockTransferStatus } from '@/types/database'
import { restGet, restPost, restDelete, restRpc } from '@/lib/api/rest'

function flattenBranch(b: unknown): { id: string; code: string; name: string } {
  const o = Array.isArray(b) ? b[0] : b
  const x = (o ?? {}) as { id?: string; code?: string; name?: string }
  return { id: x.id ?? '', code: x.code ?? '—', name: x.name ?? '—' }
}

export const fetchStockTransferRepo: StockTransferRepository = {
  async list(opts: { branchId?: string | null; status?: StockTransferStatus } = {}) {
    const params: Record<string, string | string[]> = {
      select: 'id,status,notes,created_at,received_at,from_branch:branches!stock_transfers_from_branch_id_fkey(id,code,name),to_branch:branches!stock_transfers_to_branch_id_fkey(id,code,name),items:stock_transfer_items(quantity_sent)',
      order:  'created_at.desc',
    }
    if (opts.status)   params.status = `eq.${opts.status}`
    if (opts.branchId) params['or']  = `(from_branch_id.eq.${opts.branchId},to_branch_id.eq.${opts.branchId})`

    const data = await restGet<Array<{
      id: string; status: string; notes: string | null; created_at: string; received_at: string | null
      from_branch: unknown; to_branch: unknown
      items: Array<{ quantity_sent: number }> | null
    }>>('stock_transfers', params)

    return data.map((r) => {
      const items = r.items ?? []
      return {
        id:             r.id,
        status:         r.status as StockTransferStatus,
        notes:          r.notes,
        created_at:     r.created_at,
        received_at:    r.received_at,
        from_branch:    flattenBranch(r.from_branch),
        to_branch:      flattenBranch(r.to_branch),
        item_count:     items.length,
        total_quantity: items.reduce((s, it) => s + Number(it.quantity_sent), 0),
      } satisfies StockTransferListRow
    })
  },

  async getById(id: string): Promise<StockTransferDetail | null> {
    const rows = await restGet<Array<{
      id: string; status: string; notes: string | null; created_at: string; received_at: string | null
      from_branch_id: string; to_branch_id: string
      from_branch: unknown; to_branch: unknown
      items: Array<{
        id: string; product_id: string; quantity_sent: number; quantity_received: number
        receive_note: string | null
        product: { name?: string; sku?: string | null } | Array<{ name?: string; sku?: string | null }> | null
      }> | null
    }>>('stock_transfers', {
      select: '*,from_branch:branches!stock_transfers_from_branch_id_fkey(id,code,name),to_branch:branches!stock_transfers_to_branch_id_fkey(id,code,name),items:stock_transfer_items(id,product_id,quantity_sent,quantity_received,receive_note,product:products(name,sku))',
      id:     `eq.${id}`,
      limit:  '1',
    })
    const data = rows[0]
    if (!data) return null

    const items: StockTransferItemWithProduct[] = (data.items ?? []).map((it) => {
      const p = Array.isArray(it.product) ? it.product[0] : it.product
      return {
        id:                it.id,
        product_id:        it.product_id,
        quantity_sent:     Number(it.quantity_sent),
        quantity_received: Number(it.quantity_received),
        receive_note:      it.receive_note ?? null,
        product: { name: p?.name ?? '—', sku: p?.sku ?? null },
      }
    })

    return {
      ...(data as unknown as StockTransfer),
      from_branch: flattenBranch(data.from_branch),
      to_branch:   flattenBranch(data.to_branch),
      items,
    }
  },

  async create(input): Promise<{ id: string } | { error: string }> {
    if (input.from_branch_id === input.to_branch_id) {
      return { error: 'สาขาต้นทางและปลายทางต้องเป็นคนละสาขา' }
    }
    if (input.items.length === 0) {
      return { error: 'กรุณาเพิ่มรายการสินค้า' }
    }
    if (!input.user_id) {
      return { error: `user_id is required (got: ${JSON.stringify(input.user_id)})` }
    }

    try {
      const res = await restPost<{ id: string } | Array<{ id: string }>>('stock_transfers', {
        from_branch_id: input.from_branch_id,
        to_branch_id:   input.to_branch_id,
        notes:          input.notes,
        user_id:        input.user_id,
        items:          input.items.map((it: StockTransferLineInput) => ({
          product_id:    it.product_id,
          quantity_sent: it.quantity_sent,
        })),
      })
      const row = Array.isArray(res) ? res[0] : res as { id: string }
      if (!row?.id) return { error: 'สร้างรายการโอนไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async send(transferId: string, userId: string): Promise<string | null> {
    try {
      await restRpc('send_stock_transfer', { p_transfer_id: transferId, p_user_id: userId })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async receive(transferId, userId, overrides?: ReceiveOverride[]): Promise<string | null> {
    try {
      const items = overrides?.map((o) => ({
        id:                o.itemId,
        quantity_received: o.quantityReceived,
        receive_note:      o.receiveNote ?? null,
      })) ?? null
      await restRpc('receive_stock_transfer', {
        p_transfer_id: transferId,
        p_user_id:     userId,
        p_items:       items,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async cancel(transferId: string, userId: string): Promise<string | null> {
    try {
      await restRpc('cancel_stock_transfer', { p_transfer_id: transferId, p_user_id: userId })
      return null
    } catch (e) {
      return String(e)
    }
  },
}
