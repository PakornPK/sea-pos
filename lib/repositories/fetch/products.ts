import type {
  Product, ProductInsert, ProductWithCategory,
  ProductWithStock, ProductWithStockAndCategory,
} from '@/types/database'
import type { ProductRepository } from '@/lib/repositories/contracts'
import type { PageParams, Paginated } from '@/lib/pagination'
import { restGet, restGetPaginated, restPost, restPatchById, restDeleteById, restRpc } from '@/lib/api/rest'
import { packPaginated } from '@/lib/pagination'

function flattenStock(ps: unknown): number {
  if (!ps) return 0
  if (Array.isArray(ps)) return ps[0]?.quantity ?? 0
  return (ps as { quantity?: number }).quantity ?? 0
}

export const fetchProductRepo: ProductRepository = {
  async countAll(): Promise<number> {
    const rows = await restGet<{ id: string }[]>('products', { select: 'id' })
    return rows.length
  },

  async listAll(): Promise<Product[]> {
    return restGet<Product[]>('products', { order: 'name.asc' })
  },

  async listWithCategory(): Promise<ProductWithCategory[]> {
    return restGet<ProductWithCategory[]>('products', {
      select: '*,category:categories(id,name)',
      order:  'name.asc',
    })
  },

  async listWithCategoryPaginated(p: PageParams, opts: { categoryId?: string | null } = {}): Promise<Paginated<ProductWithCategory>> {
    const params: Record<string, string | string[]> = {
      select: '*,category:categories(id,name)',
      order:  'name.asc',
    }
    if (opts.categoryId) params.category_id = `eq.${opts.categoryId}`
    return restGetPaginated<ProductWithCategory>('products', p, params)
  },

  async listInStockForBranchPaginated(
    p: PageParams,
    opts: { branchId: string; search?: string | null },
  ): Promise<Paginated<ProductWithStock>> {
    const search = opts.search?.trim().slice(0, 100).replace(/[%,]/g, '') ?? ''

    // Fetch tracked (has stock > 0) and untracked products in parallel
    const baseParams: Record<string, string | string[]> = {
      select: '*,category:categories(vat_exempt,category_type),product_stock:product_stock(quantity,branch_id)',
    }
    if (search) baseParams['or'] = `(name.ilike.*${search}*,sku.ilike.*${search}*)`

    const [trackedRows, untrackedRows] = await Promise.all([
      restGet<Array<Product & {
        has_options: boolean
        product_stock: Array<{ quantity: number; branch_id: string }> | null
        category: { vat_exempt?: boolean; category_type?: string } | null
      }>>('products', { ...baseParams, track_stock: 'eq.true', order: 'name.asc' }),
      restGet<Array<Product & {
        has_options: boolean
        product_stock: Array<{ quantity: number; branch_id: string }> | null
        category: { vat_exempt?: boolean; category_type?: string } | null
      }>>('products', {
        select:      '*,category:categories(vat_exempt,category_type),product_stock:product_stock(quantity,branch_id)',
        track_stock: 'eq.false',
        order:       'name.asc',
        ...(search ? { or: `(name.ilike.*${search}*,sku.ilike.*${search}*)` } : {}),
      }),
    ])

    const shapeRow = (r: typeof trackedRows[number]): ProductWithStock => {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category
      const effectiveVat = Boolean(r.vat_exempt) || Boolean(cat?.vat_exempt)
      const { product_stock: _ps, category: _c, ...rest } = r
      void _ps; void _c
      return { ...rest, vat_exempt: effectiveVat, stock: flattenStock(r.product_stock), has_options: Boolean(r.has_options) }
    }

    const isForSale = (r: typeof trackedRows[number]) => {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category
      return !cat || cat.category_type !== 'option'
    }

    const tracked = trackedRows
      .filter((r) => {
        const ps = r.product_stock ?? []
        const match = ps.find((s) => s.branch_id === opts.branchId)
        return (match?.quantity ?? 0) > 0 && isForSale(r)
      })
      .map(shapeRow)

    const untracked = untrackedRows.filter(isForSale).map(shapeRow)

    const all = [...untracked, ...tracked].sort((a, b) => a.name.localeCompare(b.name, 'th'))
    const offset = (p.page - 1) * p.pageSize
    const rows = all.slice(offset, offset + p.pageSize)
    return packPaginated(rows, all.length, p)
  },

  async findInStockByCodeForBranch(branchId: string, code: string): Promise<ProductWithStock | null> {
    const trimmed = code.trim()
    if (!trimmed) return null

    const shape = (r: Product & {
      has_options: boolean
      product_stock: unknown
      category: { vat_exempt?: boolean } | null
    }): ProductWithStock => {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category
      const effectiveVat = Boolean(r.vat_exempt) || Boolean(cat?.vat_exempt)
      const { product_stock: _ps, category: _c, ...rest } = r
      void _ps; void _c
      return { ...rest, vat_exempt: effectiveVat, stock: flattenStock(r.product_stock), has_options: Boolean(r.has_options) }
    }

    type PRow = Product & { has_options: boolean; product_stock: unknown; category: { vat_exempt?: boolean } | null }
    const innerSel = '*,category:categories(vat_exempt),product_stock:product_stock(quantity,branch_id)'
    const leftSel  = '*,category:categories(vat_exempt),product_stock:product_stock(quantity,branch_id)'

    // 1) Barcode — tracked in-stock
    {
      const rows = await restGet<PRow[]>('products', {
        select: innerSel, track_stock: 'eq.true', barcode: `eq.${trimmed}`, limit: '1',
      })
      const r = rows[0]
      if (r) {
        const ps = Array.isArray(r.product_stock) ? r.product_stock : []
        const match = ps.find((s: { branch_id: string; quantity: number }) => s.branch_id === branchId)
        if (match && match.quantity > 0) return shape(r)
      }
    }
    // 2) SKU — tracked in-stock
    {
      const rows = await restGet<PRow[]>('products', {
        select: innerSel, track_stock: 'eq.true', sku: `ilike.${trimmed}`, limit: '1',
      })
      const r = rows[0]
      if (r) {
        const ps = Array.isArray(r.product_stock) ? r.product_stock : []
        const match = ps.find((s: { branch_id: string; quantity: number }) => s.branch_id === branchId)
        if (match && match.quantity > 0) return shape(r)
      }
    }
    // 3) Barcode — untracked
    {
      const rows = await restGet<PRow[]>('products', {
        select: leftSel, track_stock: 'eq.false', barcode: `eq.${trimmed}`, limit: '1',
      })
      if (rows[0]) return shape(rows[0])
    }
    // 4) SKU — untracked
    {
      const rows = await restGet<PRow[]>('products', {
        select: leftSel, track_stock: 'eq.false', sku: `ilike.${trimmed}`, limit: '1',
      })
      if (rows[0]) return shape(rows[0])
    }
    return null
  },

  async listWithStockForBranch(
    branchId: string,
    opts: { search?: string | null; categoryId?: string | null } = {},
  ): Promise<ProductWithStockAndCategory[]> {
    const params: Record<string, string | string[]> = {
      select: '*,category:categories(id,name),product_stock:product_stock(quantity,branch_id)',
      order:  'name.asc',
    }
    if (opts.categoryId) params.category_id = `eq.${opts.categoryId}`
    if (opts.search?.trim()) {
      const term = opts.search.trim().slice(0, 100).replace(/[%,]/g, '')
      params['or'] = `(name.ilike.*${term}*,sku.ilike.*${term}*)`
    }

    const data = await restGet<Array<Product & {
      has_options: boolean
      category: { id: string; name: string } | Array<{ id: string; name: string }> | null
      product_stock: Array<{ quantity: number; branch_id: string }> | null
    }>>('products', params)

    return data.map((r) => {
      const match = (r.product_stock ?? []).find((ps) => ps.branch_id === branchId)
      const { product_stock: _ps, category: rawCat, ...rest } = r
      void _ps
      const category = Array.isArray(rawCat) ? rawCat[0] ?? null : rawCat
      return { ...rest, category, stock: match?.quantity ?? 0, has_options: Boolean(r.has_options) }
    })
  },

  async listWithStockForBranchPaginated(
    p: PageParams,
    opts: { branchId: string; categoryId?: string | null; search?: string | null },
  ): Promise<Paginated<ProductWithStockAndCategory>> {
    const params: Record<string, string | string[]> = {
      select: '*,category:categories(id,name),product_stock:product_stock(quantity,branch_id)',
      order:  'name.asc',
    }
    if (opts.categoryId) params.category_id = `eq.${opts.categoryId}`
    if (opts.search?.trim()) {
      const term = opts.search.trim().slice(0, 100).replace(/[%,]/g, '')
      params['or'] = `(name.ilike.*${term}*,sku.ilike.*${term}*)`
    }

    const paginated = await restGetPaginated<Product & {
      has_options: boolean
      category: { id: string; name: string } | Array<{ id: string; name: string }> | null
      product_stock: Array<{ quantity: number; branch_id: string }> | null
    }>('products', p, params)

    const rows: ProductWithStockAndCategory[] = paginated.rows.map((r) => {
      const match = (r.product_stock ?? []).find((ps) => ps.branch_id === opts.branchId)
      const { product_stock: _ps, category: rawCat, ...rest } = r
      void _ps
      const category = Array.isArray(rawCat) ? rawCat[0] ?? null : rawCat
      return { ...rest, category, stock: match?.quantity ?? 0, has_options: Boolean(r.has_options) }
    })
    return { ...paginated, rows }
  },

  async listWithStockByBranchPaginated(
    p: PageParams,
    opts: { categoryId?: string | null; search?: string | null } = {},
  ): Promise<Paginated<ProductWithStockAndCategory>> {
    const params: Record<string, string | string[]> = {
      select: '*,category:categories(id,name),product_stock:product_stock(quantity,branch_id,branch:branches(code,name))',
      order:  'name.asc',
    }
    if (opts.categoryId) params.category_id = `eq.${opts.categoryId}`
    if (opts.search?.trim()) {
      const term = opts.search.trim().slice(0, 100).replace(/[%,]/g, '')
      params['or'] = `(name.ilike.*${term}*,sku.ilike.*${term}*)`
    }

    const paginated = await restGetPaginated<Product & {
      has_options: boolean
      category: { id: string; name: string } | null
      product_stock: Array<{
        quantity: number; branch_id: string
        branch: { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null
      }> | null
    }>('products', p, params)

    const rows: ProductWithStockAndCategory[] = paginated.rows.map((r) => {
      const breakdown = (r.product_stock ?? []).map((ps) => {
        const b = Array.isArray(ps.branch) ? ps.branch[0] : ps.branch
        return {
          branch_id:   ps.branch_id,
          branch_code: b?.code ?? '—',
          branch_name: b?.name ?? '—',
          quantity:    Number(ps.quantity),
        }
      })
      const total = breakdown.reduce((s, b) => s + b.quantity, 0)
      const { product_stock: _ps, ...rest } = r
      void _ps
      return {
        ...rest,
        stock: total,
        has_options: Boolean(r.has_options),
        stock_by_branch: breakdown.sort((a, b) => a.branch_code.localeCompare(b.branch_code)),
      }
    })
    return { ...paginated, rows }
  },

  async getById(id: string): Promise<Product | null> {
    const rows = await restGet<Product[]>('products', { id: `eq.${id}`, limit: '1' })
    return rows[0] ?? null
  },

  async create(input: ProductInsert): Promise<{ id: string } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('products', input)
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      if (!row?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async createReturning(input: ProductInsert): Promise<Product | { error: string }> {
    try {
      const rows = await restPost<Product[]>('products', input)
      const row = Array.isArray(rows) ? rows[0] : rows as Product
      if (!row) return { error: 'บันทึกไม่สำเร็จ' }
      return { ...row, price: Number(row.price), cost: Number(row.cost) } as Product
    } catch (e) {
      return { error: String(e) }
    }
  },

  async update(id: string, input: Partial<ProductInsert>): Promise<string | null> {
    try {
      await restPatchById('products', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateImageUrl(id: string, url: string | null): Promise<string | null> {
    try {
      await restPatchById('products', id, { image_url: url })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async delete(id: string): Promise<string | null> {
    try {
      await restDeleteById('products', id)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async nextSkuForCategory(categoryId: string): Promise<string | null> {
    try {
      const result = await restRpc<string | null>('next_sku_for_category', {
        p_category_id: categoryId,
      })
      return result ?? null
    } catch {
      return null
    }
  },

  async vatExemptMap(productIds: string[]): Promise<Record<string, boolean>> {
    if (!productIds.length) return {}
    const data = await restGet<Array<{
      id: string; vat_exempt: boolean
      category: { vat_exempt?: boolean } | Array<{ vat_exempt?: boolean }> | null
    }>>('products', {
      select:  'id,vat_exempt,category:categories(vat_exempt)',
      id:      `in.(${productIds.join(',')})`,
    })
    const out: Record<string, boolean> = {}
    for (const r of data) {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category
      out[r.id] = Boolean(r.vat_exempt) || Boolean(cat?.vat_exempt)
    }
    return out
  },

  async trackStockMap(productIds: string[]): Promise<Record<string, boolean>> {
    if (!productIds.length) return {}
    const data = await restGet<Array<{ id: string; track_stock: boolean }>>('products', {
      select: 'id,track_stock',
      id:     `in.(${productIds.join(',')})`,
    })
    const out: Record<string, boolean> = {}
    for (const r of data) {
      out[r.id] = r.track_stock !== false
    }
    return out
  },

  async costMap(productIds: string[]): Promise<Record<string, number>> {
    if (!productIds.length) return {}
    const data = await restGet<Array<{ id: string; cost: number | null }>>('products', {
      select: 'id,cost',
      id:     `in.(${productIds.join(',')})`,
    })
    const map: Record<string, number> = {}
    for (const r of data) {
      map[r.id] = Number(r.cost ?? 0)
    }
    return map
  },
}
