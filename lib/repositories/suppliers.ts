import type { DB } from './types'
import type { Supplier } from '@/types/database'

export type SupplierInput = {
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
}

export const supplierRepo = {
  async list(db: DB): Promise<Supplier[]> {
    const { data } = await db.from('suppliers').select('*').order('name')
    return (data ?? []) as Supplier[]
  },

  async create(db: DB, input: SupplierInput): Promise<string | null> {
    const { error } = await db.from('suppliers').insert(input)
    return error?.message ?? null
  },

  async update(db: DB, id: string, input: SupplierInput): Promise<string | null> {
    const { error } = await db.from('suppliers').update(input).eq('id', id)
    return error?.message ?? null
  },

  async delete(db: DB, id: string): Promise<string | null> {
    const { error } = await db.from('suppliers').delete().eq('id', id)
    return error?.message ?? null
  },

  async hasOrders(db: DB, id: string): Promise<boolean> {
    const { count } = await db
      .from('purchase_orders').select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
    return (count ?? 0) > 0
  },
}
