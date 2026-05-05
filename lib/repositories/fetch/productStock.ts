import type { ProductStockRepository } from '@/lib/repositories/contracts'
import { chain, qty } from '@/lib/money'
import { restGet, restPost, restPatch, restRpc } from '@/lib/api/rest'

export const fetchProductStockRepo: ProductStockRepository = {
  async get(productId: string, branchId: string): Promise<number | null> {
    const rows = await restGet<Array<{ quantity: number }>>('product_stock', {
      select:     'quantity',
      product_id: `eq.${productId}`,
      branch_id:  `eq.${branchId}`,
      limit:      '1',
    })
    return rows[0]?.quantity ?? null
  },

  async set(productId: string, branchId: string, quantity: number): Promise<string | null> {
    try {
      // PATCH upsert — backend handles upsert via PATCH on (product_id, branch_id)
      await restPatch('product_stock', {
        product_id: `eq.${productId}`,
        branch_id:  `eq.${branchId}`,
      }, { quantity })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async seed(productId: string, branchId: string): Promise<string | null> {
    try {
      // Get branch company_id first
      const branches = await restGet<Array<{ company_id: string }>>('branches', {
        select: 'company_id', id: `eq.${branchId}`, limit: '1',
      })
      const companyId = branches[0]?.company_id
      if (!companyId) return 'ไม่พบสาขา'

      await restPost('product_stock', {
        product_id: productId,
        branch_id:  branchId,
        company_id: companyId,
        quantity:   0,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async adjust(input): Promise<string | null> {
    try {
      const rows = await restGet<Array<{ quantity: number; company_id: string }>>('product_stock', {
        select:     'quantity,company_id',
        product_id: `eq.${input.productId}`,
        branch_id:  `eq.${input.branchId}`,
        limit:      '1',
      })
      const current = rows[0]
      const currentQty = current?.quantity ?? 0
      const newQty = qty(chain(currentQty).plus(input.delta))
      if (newQty < 0) return 'สต๊อกไม่เพียงพอ'

      let companyId = current?.company_id
      if (!companyId) {
        const branches = await restGet<Array<{ company_id: string }>>('branches', {
          select: 'company_id', id: `eq.${input.branchId}`, limit: '1',
        })
        companyId = branches[0]?.company_id
        if (!companyId) return 'ไม่พบสาขา'

        await restPost('product_stock', {
          product_id: input.productId,
          branch_id:  input.branchId,
          company_id: companyId,
          quantity:   newQty,
        })
      } else {
        await restPatch('product_stock', {
          product_id: `eq.${input.productId}`,
          branch_id:  `eq.${input.branchId}`,
        }, { quantity: newQty })
      }

      await restPost('stock_logs', {
        product_id: input.productId,
        branch_id:  input.branchId,
        company_id: companyId,
        change:     input.delta,
        reason:     input.reason,
        user_id:    input.userId,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async decrement(input): Promise<string | null> {
    try {
      await restRpc('decrement_stock', {
        p_product_id:     input.productId,
        p_branch_id:      input.branchId,
        p_quantity:       input.quantity,
        p_sale_id:        input.saleId,
        p_user_id:        input.userId,
        p_allow_negative: input.allowNegative ?? true,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async listForProduct(productId: string) {
    const data = await restGet<Array<{
      branch_id: string; quantity: number
      branch: { name?: string } | Array<{ name?: string }> | null
    }>>('product_stock', {
      select:     'branch_id,quantity,branch:branches(name)',
      product_id: `eq.${productId}`,
    })
    return data.map((r) => {
      const b = Array.isArray(r.branch) ? r.branch[0] : r.branch
      return {
        branch_id:   r.branch_id,
        branch_name: b?.name ?? '—',
        quantity:    Number(r.quantity),
      }
    })
  },

  async lowStock(branchId: string, limit = 10) {
    const data = await restGet<Array<{
      quantity: number
      product: { id?: string; name?: string; sku?: string | null; min_stock?: number } | Array<{ id?: string; name?: string; sku?: string | null; min_stock?: number }> | null
    }>>('product_stock', {
      select:    'quantity,product:products(id,name,sku,min_stock)',
      branch_id: `eq.${branchId}`,
      order:     'quantity.asc',
      limit:     '200',
    })
    return data
      .map((r) => {
        const p = Array.isArray(r.product) ? r.product[0] : r.product
        return {
          id:        p?.id    ?? '',
          name:      p?.name  ?? '—',
          sku:       p?.sku   ?? null,
          stock:     Number(r.quantity),
          min_stock: Number(p?.min_stock ?? 0),
        }
      })
      .filter((r) => r.stock <= r.min_stock)
      .slice(0, limit)
  },
}
