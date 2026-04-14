import type {
  Product, ProductInsert, ProductWithCategory,
  ProductWithStock, ProductWithStockAndCategory,
} from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type { ProductRepository } from '@/lib/repositories/contracts'
import { getDb } from './db'

/** Normalize the joined `product_stock` shape to a flat `stock: number`. */
function flattenStock<T extends { product_stock?: Array<{ quantity: number }> | { quantity: number } | null }>(
  row: T,
): number {
  const ps = row.product_stock
  if (!ps) return 0
  if (Array.isArray(ps)) return ps[0]?.quantity ?? 0
  return ps.quantity ?? 0
}

export const supabaseProductRepo: ProductRepository = {
  async countAll(): Promise<number> {
    const db = await getDb()
    const { count } = await db
      .from('products').select('id', { count: 'exact', head: true })
    return count ?? 0
  },

  async listAll(): Promise<Product[]> {
    const db = await getDb()
    const { data } = await db.from('products').select('*').order('name')
    return (data ?? []) as Product[]
  },

  async listWithCategory(): Promise<ProductWithCategory[]> {
    const db = await getDb()
    const { data } = await db
      .from('products')
      .select('*, category:categories(id, name)')
      .order('name')
    return (data ?? []) as ProductWithCategory[]
  },

  async listInStockForBranchPaginated(
    p: PageParams,
    opts: { branchId: string; search?: string | null },
  ): Promise<Paginated<ProductWithStock>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)

    // Inner join on product_stock filtered to the target branch + stock > 0.
    // Category joined so POS can resolve effective VAT exemption (product
    // flag OR category flag wins).
    let q = db
      .from('products')
      .select(
        '*, category:categories(vat_exempt), product_stock!inner(quantity, branch_id)',
        { count: 'exact' },
      )
      .eq('product_stock.branch_id', opts.branchId)
      .gt('product_stock.quantity', 0)
      .order('name')
      .range(from, to)

    if (opts.search?.trim()) {
      const term = opts.search.trim().replace(/[%,]/g, '')
      q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
    }

    const { data, count } = await q
    const rows: ProductWithStock[] = (data ?? []).map((r) => {
      const row = r as unknown as Product & {
        product_stock: Array<{ quantity: number }> | { quantity: number } | null
        category: { vat_exempt?: boolean } | Array<{ vat_exempt?: boolean }> | null
      }
      const cat = Array.isArray(row.category) ? row.category[0] : row.category
      const effectiveVat = Boolean(row.vat_exempt) || Boolean(cat?.vat_exempt)
      const { product_stock: _ps, category: _c, ...rest } = row
      void _ps; void _c
      return { ...rest, vat_exempt: effectiveVat, stock: flattenStock(row) }
    })
    return packPaginated(rows, count ?? 0, p)
  },

  async listWithStockForBranch(
    branchId: string,
    opts: { search?: string | null; categoryId?: string | null } = {},
  ): Promise<ProductWithStockAndCategory[]> {
    const db = await getDb()
    // LEFT join so products without a pivot row (shouldn't happen after seed,
    // but defensively) show up with stock=0.
    let q = db
      .from('products')
      .select(
        '*, category:categories(id, name), product_stock!left(quantity, branch_id)',
      )
      .order('name')

    if (opts.categoryId) q = q.eq('category_id', opts.categoryId)
    if (opts.search?.trim()) {
      const term = opts.search.trim().replace(/[%,]/g, '')
      q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
    }

    const { data } = await q
    return (data ?? []).map((r) => {
      const row = r as unknown as ProductWithCategory & {
        product_stock: Array<{ quantity: number; branch_id: string }> | null
      }
      // Filter the joined array to the branch of interest.
      const match = (row.product_stock ?? []).find((ps) => ps.branch_id === branchId)
      const { product_stock: _ps, ...rest } = row
      void _ps
      return { ...rest, stock: match?.quantity ?? 0 }
    })
  },

  async listWithStockForBranchPaginated(
    p: PageParams,
    opts: { branchId: string; categoryId?: string | null; search?: string | null },
  ): Promise<Paginated<ProductWithStockAndCategory>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    let q = db
      .from('products')
      .select(
        '*, category:categories(id, name), product_stock!left(quantity, branch_id)',
        { count: 'exact' },
      )
      .order('name')
      .range(from, to)

    if (opts.categoryId) q = q.eq('category_id', opts.categoryId)
    if (opts.search?.trim()) {
      const term = opts.search.trim().replace(/[%,]/g, '')
      q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
    }

    const { data, count } = await q
    const rows: ProductWithStockAndCategory[] = (data ?? []).map((r) => {
      const row = r as unknown as ProductWithCategory & {
        product_stock: Array<{ quantity: number; branch_id: string }> | null
      }
      const match = (row.product_stock ?? []).find((ps) => ps.branch_id === opts.branchId)
      const { product_stock: _ps, ...rest } = row
      void _ps
      return { ...rest, stock: match?.quantity ?? 0 }
    })
    return packPaginated(rows, count ?? 0, p)
  },

  async listWithStockByBranchPaginated(
    p: PageParams,
    opts: { categoryId?: string | null; search?: string | null } = {},
  ): Promise<Paginated<ProductWithStockAndCategory>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    // Join every product_stock row; branch chip data comes from branches.
    let q = db
      .from('products')
      .select(
        '*, category:categories(id, name), product_stock!left(quantity, branch_id, branch:branches(code, name))',
        { count: 'exact' },
      )
      .order('name')
      .range(from, to)

    if (opts.categoryId) q = q.eq('category_id', opts.categoryId)
    if (opts.search?.trim()) {
      const term = opts.search.trim().replace(/[%,]/g, '')
      q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
    }

    const { data, count } = await q
    const rows: ProductWithStockAndCategory[] = (data ?? []).map((r) => {
      const row = r as unknown as ProductWithCategory & {
        product_stock: Array<{
          quantity: number
          branch_id: string
          branch: { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null
        }> | null
      }
      const breakdown = (row.product_stock ?? []).map((ps) => {
        const b = Array.isArray(ps.branch) ? ps.branch[0] : ps.branch
        return {
          branch_id:   ps.branch_id,
          branch_code: b?.code ?? '—',
          branch_name: b?.name ?? '—',
          quantity:    Number(ps.quantity),
        }
      })
      const total = breakdown.reduce((s, b) => s + b.quantity, 0)

      const { product_stock: _ps, ...rest } = row
      void _ps
      return {
        ...rest,
        stock: total,
        stock_by_branch: breakdown.sort((a, b) => a.branch_code.localeCompare(b.branch_code)),
      }
    })
    return packPaginated(rows, count ?? 0, p)
  },

  async listWithCategoryPaginated(
    p: PageParams,
    opts: { categoryId?: string | null } = {},
  ): Promise<Paginated<ProductWithCategory>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    let q = db
      .from('products')
      .select('*, category:categories(id, name)', { count: 'exact' })
      .order('name')
      .range(from, to)
    if (opts.categoryId) q = q.eq('category_id', opts.categoryId)

    const { data, count } = await q
    return packPaginated((data ?? []) as ProductWithCategory[], count ?? 0, p)
  },

  async create(input: ProductInsert): Promise<{ id: string } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('products').insert(input).select('id').single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async createReturning(input: ProductInsert): Promise<Product | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('products').insert(input)
      .select('id, sku, name, price, cost, min_stock, category_id, image_url, vat_exempt, created_at')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return {
      ...data,
      price: Number(data.price),
      cost: Number(data.cost),
    } as Product
  },

  async updateImageUrl(id: string, url: string | null): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('products').update({ image_url: url }).eq('id', id)
    return error?.message ?? null
  },

  async delete(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('products').delete().eq('id', id)
    return error?.message ?? null
  },

  async nextSkuForCategory(categoryId: string): Promise<string | null> {
    const db = await getDb()
    const { data } = await db.rpc('next_sku_for_category', { p_category_id: categoryId })
    return (data as string | null) ?? null
  },

  async vatExemptMap(productIds: string[]): Promise<Record<string, boolean>> {
    if (productIds.length === 0) return {}
    const db = await getDb()
    const { data } = await db
      .from('products')
      .select('id, vat_exempt, category:categories(vat_exempt)')
      .in('id', productIds)

    const out: Record<string, boolean> = {}
    for (const r of (data ?? []) as Array<{
      id: string
      vat_exempt: boolean
      category: { vat_exempt?: boolean } | Array<{ vat_exempt?: boolean }> | null
    }>) {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category
      out[r.id] = Boolean(r.vat_exempt) || Boolean(cat?.vat_exempt)
    }
    return out
  },
}
