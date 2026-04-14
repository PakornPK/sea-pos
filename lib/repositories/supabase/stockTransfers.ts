import type {
  StockTransferRepository,
  StockTransferListRow,
  StockTransferDetail,
  StockTransferItemWithProduct,
  StockTransferLineInput,
} from '@/lib/repositories/contracts'
import type { StockTransfer, StockTransferStatus } from '@/types/database'
import { getDb } from './db'

function flattenBranch(b: unknown): { id: string; code: string; name: string } {
  const o = Array.isArray(b) ? b[0] : b
  const x = (o ?? {}) as { id?: string; code?: string; name?: string }
  return { id: x.id ?? '', code: x.code ?? '—', name: x.name ?? '—' }
}

export const supabaseStockTransferRepo: StockTransferRepository = {
  async list(opts: { branchId?: string | null; status?: StockTransferStatus } = {}) {
    const db = await getDb()
    let q = db
      .from('stock_transfers')
      .select(`
        id, status, notes, created_at, received_at,
        from_branch:branches!stock_transfers_from_branch_id_fkey(id, code, name),
        to_branch:branches!stock_transfers_to_branch_id_fkey(id, code, name),
        items:stock_transfer_items(quantity_sent)
      `)
      .order('created_at', { ascending: false })

    if (opts.status) q = q.eq('status', opts.status)
    if (opts.branchId) {
      q = q.or(`from_branch_id.eq.${opts.branchId},to_branch_id.eq.${opts.branchId}`)
    }

    const { data } = await q
    return (data ?? []).map((r) => {
      const items = (r.items as Array<{ quantity_sent: number }> | null) ?? []
      return {
        id:          r.id,
        status:      r.status as StockTransferStatus,
        notes:       r.notes as string | null,
        created_at:  r.created_at as string,
        received_at: r.received_at as string | null,
        from_branch: flattenBranch(r.from_branch),
        to_branch:   flattenBranch(r.to_branch),
        item_count:  items.length,
        total_quantity: items.reduce((s, it) => s + Number(it.quantity_sent), 0),
      } satisfies StockTransferListRow
    })
  },

  async getById(id: string): Promise<StockTransferDetail | null> {
    const db = await getDb()
    const { data } = await db
      .from('stock_transfers')
      .select(`
        *,
        from_branch:branches!stock_transfers_from_branch_id_fkey(id, code, name),
        to_branch:branches!stock_transfers_to_branch_id_fkey(id, code, name),
        items:stock_transfer_items(
          id, product_id, quantity_sent, quantity_received, receive_note,
          product:products(name, sku)
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (!data) return null

    const items = ((data.items as unknown[]) ?? []).map((it) => {
      const row = it as {
        id: string
        product_id: string
        quantity_sent: number
        quantity_received: number
        receive_note: string | null
        product: { name?: string; sku?: string | null } | Array<{ name?: string; sku?: string | null }> | null
      }
      const p = Array.isArray(row.product) ? row.product[0] : row.product
      return {
        id: row.id,
        product_id: row.product_id,
        quantity_sent: Number(row.quantity_sent),
        quantity_received: Number(row.quantity_received),
        receive_note: row.receive_note ?? null,
        product: {
          name: p?.name ?? '—',
          sku:  p?.sku ?? null,
        },
      } satisfies StockTransferItemWithProduct
    })

    return {
      ...(data as unknown as StockTransfer),
      from_branch: flattenBranch(data.from_branch),
      to_branch:   flattenBranch(data.to_branch),
      items,
    }
  },

  async create(input) {
    const db = await getDb()

    if (input.from_branch_id === input.to_branch_id) {
      return { error: 'สาขาต้นทางและปลายทางต้องเป็นคนละสาขา' }
    }
    if (input.items.length === 0) {
      return { error: 'กรุณาเพิ่มรายการสินค้า' }
    }

    const { data: header, error: hdrErr } = await db
      .from('stock_transfers')
      .insert({
        from_branch_id: input.from_branch_id,
        to_branch_id:   input.to_branch_id,
        notes:          input.notes,
        user_id:        input.user_id,
      })
      .select('id')
      .single()
    if (hdrErr || !header) return { error: hdrErr?.message ?? 'สร้างรายการโอนไม่สำเร็จ' }

    const rows: Array<{ transfer_id: string; product_id: string; quantity_sent: number }> =
      input.items.map((it: StockTransferLineInput) => ({
        transfer_id:   header.id,
        product_id:    it.product_id,
        quantity_sent: it.quantity_sent,
      }))

    const { error: itemsErr } = await db
      .from('stock_transfer_items')
      .insert(rows)
    if (itemsErr) {
      // Best-effort: roll the header back so we don't leave an orphan.
      await db.from('stock_transfers').delete().eq('id', header.id)
      return { error: itemsErr.message }
    }

    return { id: header.id }
  },

  async send(transferId: string, userId: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.rpc('send_stock_transfer', {
      p_transfer_id: transferId,
      p_user_id:     userId,
    })
    return error?.message ?? null
  },

  async receive(transferId, userId, overrides) {
    const db = await getDb()
    // RPC expects items array as `[{id, quantity_received, receive_note}, …]`
    const items = overrides?.map((o) => ({
      id:                o.itemId,
      quantity_received: o.quantityReceived,
      receive_note:      o.receiveNote ?? null,
    })) ?? null

    const { error } = await db.rpc('receive_stock_transfer', {
      p_transfer_id: transferId,
      p_user_id:     userId,
      p_items:       items,
    })
    return error?.message ?? null
  },

  async cancel(transferId: string, userId: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.rpc('cancel_stock_transfer', {
      p_transfer_id: transferId,
      p_user_id:     userId,
    })
    return error?.message ?? null
  },
}
