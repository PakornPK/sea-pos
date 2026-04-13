import type { DB } from './types'
import type { Customer } from '@/types/database'

export type CustomerInput = {
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

export const customerRepo = {
  async list(db: DB): Promise<Customer[]> {
    const { data } = await db.from('customers').select('*').order('name')
    return (data ?? []) as Customer[]
  },

  async listForPicker(db: DB): Promise<Array<{ id: string; name: string; phone: string | null }>> {
    const { data } = await db
      .from('customers').select('id, name, phone').order('name')
    return data ?? []
  },

  async getById(db: DB, id: string): Promise<Customer | null> {
    const { data } = await db
      .from('customers').select('*').eq('id', id).single()
    return (data as Customer | null) ?? null
  },

  async create(db: DB, input: CustomerInput): Promise<string | null> {
    const { error } = await db.from('customers').insert(input)
    return error?.message ?? null
  },

  async createReturning(
    db: DB,
    input: Pick<CustomerInput, 'name' | 'phone'>
  ): Promise<{ id: string; name: string; phone: string | null } | { error: string }> {
    const { data, error } = await db
      .from('customers')
      .insert({ name: input.name, phone: input.phone })
      .select('id, name, phone')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return data
  },

  async update(db: DB, id: string, input: CustomerInput): Promise<string | null> {
    const { error } = await db.from('customers').update(input).eq('id', id)
    return error?.message ?? null
  },

  async delete(db: DB, id: string): Promise<string | null> {
    const { error } = await db.from('customers').delete().eq('id', id)
    return error?.message ?? null
  },

  async hasSales(db: DB, id: string): Promise<boolean> {
    const { count } = await db
      .from('sales').select('id', { count: 'exact', head: true })
      .eq('customer_id', id)
    return (count ?? 0) > 0
  },
}
