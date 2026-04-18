import type { ProductStockRepository } from '@/lib/repositories/contracts'
import { chain, qty } from '@/lib/money'
import { getDb } from './db'

export const supabaseProductStockRepo: ProductStockRepository = {
  async get(productId: string, branchId: string): Promise<number | null> {
    const db = await getDb()
    const { data } = await db
      .from('product_stock')
      .select('quantity')
      .eq('product_id', productId)
      .eq('branch_id', branchId)
      .maybeSingle()
    return (data?.quantity as number | undefined) ?? null
  },

  async set(productId: string, branchId: string, quantity: number): Promise<string | null> {
    const db = await getDb()
    // Need company_id for an insert; read it from the branch row (one hop)
    // so we don't cache stale tenant info.
    const { data: branch } = await db
      .from('branches').select('company_id').eq('id', branchId).single()
    const companyId = (branch as { company_id?: string } | null)?.company_id
    if (!companyId) return 'ไม่พบสาขา'

    const { error } = await db
      .from('product_stock')
      .upsert({
        product_id: productId,
        branch_id:  branchId,
        company_id: companyId,
        quantity,
      })
    return error?.message ?? null
  },

  async seed(productId: string, branchId: string): Promise<string | null> {
    const db = await getDb()
    const { data: branch } = await db
      .from('branches').select('company_id').eq('id', branchId).single()
    const companyId = (branch as { company_id?: string } | null)?.company_id
    if (!companyId) return 'ไม่พบสาขา'

    // Idempotent via primary key (product_id, branch_id).
    const { error } = await db
      .from('product_stock')
      .upsert(
        { product_id: productId, branch_id: branchId, company_id: companyId, quantity: 0 },
        { onConflict: 'product_id,branch_id', ignoreDuplicates: true },
      )
    return error?.message ?? null
  },

  async adjust(input): Promise<string | null> {
    const db = await getDb()
    const { data: current } = await db
      .from('product_stock')
      .select('quantity, company_id')
      .eq('product_id', input.productId)
      .eq('branch_id',  input.branchId)
      .maybeSingle()

    const currentQty = (current?.quantity as number | undefined) ?? 0
    const companyId = (current?.company_id as string | undefined)
    const newQty = qty(chain(currentQty).plus(input.delta))
    if (newQty < 0) return 'สต๊อกไม่เพียงพอ'

    if (!companyId) {
      // Row didn't exist — seed via the branch's company.
      const { data: branch } = await db
        .from('branches').select('company_id').eq('id', input.branchId).single()
      const cid = (branch as { company_id?: string } | null)?.company_id
      if (!cid) return 'ไม่พบสาขา'

      const { error: insErr } = await db.from('product_stock').insert({
        product_id: input.productId,
        branch_id:  input.branchId,
        company_id: cid,
        quantity:   newQty,
      })
      if (insErr) return insErr.message

      const { error: logErr } = await db.from('stock_logs').insert({
        product_id: input.productId,
        branch_id:  input.branchId,
        company_id: cid,
        change:     input.delta,
        reason:     input.reason,
        user_id:    input.userId,
      })
      return logErr?.message ?? null
    }

    const { error: updErr } = await db
      .from('product_stock')
      .update({ quantity: newQty })
      .eq('product_id', input.productId)
      .eq('branch_id',  input.branchId)
    if (updErr) return updErr.message

    const { error: logErr } = await db.from('stock_logs').insert({
      product_id: input.productId,
      branch_id:  input.branchId,
      company_id: companyId,
      change:     input.delta,
      reason:     input.reason,
      user_id:    input.userId,
    })
    return logErr?.message ?? null
  },

  async decrement(input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.rpc('decrement_stock', {
      p_product_id:     input.productId,
      p_branch_id:      input.branchId,
      p_quantity:       input.quantity,
      p_sale_id:        input.saleId,
      p_user_id:        input.userId,
      p_allow_negative: input.allowNegative ?? true,
    })
    return error?.message ?? null
  },

  async listForProduct(productId: string): Promise<Array<{
    branch_id: string; branch_name: string; quantity: number
  }>> {
    const db = await getDb()
    const { data } = await db
      .from('product_stock')
      .select('branch_id, quantity, branch:branches(name)')
      .eq('product_id', productId)

    return (data ?? []).map((r) => {
      const br = Array.isArray(r.branch) ? r.branch[0] : r.branch
      return {
        branch_id:   r.branch_id,
        branch_name: (br as { name?: string } | null)?.name ?? '—',
        quantity:    Number(r.quantity),
      }
    })
  },

  async lowStock(branchId: string, limit = 10) {
    const db = await getDb()
    const { data } = await db
      .from('product_stock')
      .select('quantity, product:products(id, name, sku, min_stock)')
      .eq('branch_id', branchId)
      .order('quantity', { ascending: true })
      .limit(200)

    const rows = (data ?? []).map((r) => {
      const prod = Array.isArray(r.product) ? r.product[0] : r.product
      const p = prod as { id?: string; name?: string; sku?: string | null; min_stock?: number } | null
      return {
        id:        p?.id ?? '',
        name:      p?.name ?? '—',
        sku:       p?.sku ?? null,
        stock:     Number(r.quantity),
        min_stock: Number(p?.min_stock ?? 0),
      }
    })
    return rows.filter((r) => r.stock <= r.min_stock).slice(0, limit)
  },
}
