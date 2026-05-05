import type { Supplier } from '@/types/database'
import type { SupplierRepository, SupplierInput } from '@/lib/repositories/contracts'
import type { PageParams, Paginated } from '@/lib/pagination'
import { restGet, restGetPaginated, restPost, restPatchById, restDeleteById } from '@/lib/api/rest'

export const fetchSupplierRepo: SupplierRepository = {
  async list(): Promise<Supplier[]> {
    return restGet<Supplier[]>('suppliers', { order: 'name.asc' })
  },

  async listPaginated(p: PageParams): Promise<Paginated<Supplier>> {
    return restGetPaginated<Supplier>('suppliers', p, { order: 'name.asc' })
  },

  async getById(id: string): Promise<Supplier | null> {
    const rows = await restGet<Supplier[]>('suppliers', { id: `eq.${id}`, limit: '1' })
    return rows[0] ?? null
  },

  async create(input: SupplierInput): Promise<string | null> {
    try {
      await restPost('suppliers', input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async update(id: string, input: SupplierInput): Promise<string | null> {
    try {
      await restPatchById('suppliers', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async delete(id: string): Promise<string | null> {
    try {
      await restDeleteById('suppliers', id)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async hasOrders(id: string): Promise<boolean> {
    const rows = await restGet<{ id: string }[]>('purchase_orders', {
      supplier_id: `eq.${id}`,
      select:      'id',
      limit:       '1',
    })
    return rows.length > 0
  },
}
