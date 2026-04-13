import type { Supplier } from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type { SupplierRepository, SupplierInput } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseSupplierRepo: SupplierRepository = {
  async list(): Promise<Supplier[]> {
    const db = await getDb()
    const { data } = await db.from('suppliers').select('*').order('name')
    return (data ?? []) as Supplier[]
  },

  async listPaginated(p: PageParams): Promise<Paginated<Supplier>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    const { data, count } = await db
      .from('suppliers')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)
    return packPaginated((data ?? []) as Supplier[], count ?? 0, p)
  },

  async create(input: SupplierInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('suppliers').insert(input)
    return error?.message ?? null
  },

  async update(id: string, input: SupplierInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('suppliers').update(input).eq('id', id)
    return error?.message ?? null
  },

  async delete(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('suppliers').delete().eq('id', id)
    return error?.message ?? null
  },

  async hasOrders(id: string): Promise<boolean> {
    const db = await getDb()
    const { count } = await db
      .from('purchase_orders').select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
    return (count ?? 0) > 0
  },
}
