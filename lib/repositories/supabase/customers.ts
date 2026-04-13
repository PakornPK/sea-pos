import type { Customer } from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type { CustomerRepository, CustomerInput } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseCustomerRepo: CustomerRepository = {
  async list(): Promise<Customer[]> {
    const db = await getDb()
    const { data } = await db.from('customers').select('*').order('name')
    return (data ?? []) as Customer[]
  },

  async listForPicker() {
    const db = await getDb()
    const { data } = await db
      .from('customers').select('id, name, phone').order('name')
    return data ?? []
  },

  async listPaginated(
    p: PageParams,
    opts: { search?: string } = {}
  ): Promise<Paginated<Customer>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    let q = db
      .from('customers')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)

    const term = opts.search?.trim()
    if (term) {
      const safe = term.replace(/[%_]/g, '\\$&')
      q = q.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`)
    }

    const { data, count } = await q
    return packPaginated((data ?? []) as Customer[], count ?? 0, p)
  },

  async getById(id: string): Promise<Customer | null> {
    const db = await getDb()
    const { data } = await db
      .from('customers').select('*').eq('id', id).single()
    return (data as Customer | null) ?? null
  },

  async create(input: CustomerInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('customers').insert(input)
    return error?.message ?? null
  },

  async createReturning(input) {
    const db = await getDb()
    const { data, error } = await db
      .from('customers')
      .insert({ name: input.name, phone: input.phone })
      .select('id, name, phone')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return data
  },

  async update(id: string, input: CustomerInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('customers').update(input).eq('id', id)
    return error?.message ?? null
  },

  async delete(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('customers').delete().eq('id', id)
    return error?.message ?? null
  },

  async hasSales(id: string): Promise<boolean> {
    const db = await getDb()
    const { count } = await db
      .from('sales').select('id', { count: 'exact', head: true })
      .eq('customer_id', id)
    return (count ?? 0) > 0
  },
}
