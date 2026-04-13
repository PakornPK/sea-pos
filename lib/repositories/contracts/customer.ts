import type { Customer } from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export type CustomerInput = {
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

export interface CustomerRepository {
  list(): Promise<Customer[]>
  listForPicker(): Promise<Array<{ id: string; name: string; phone: string | null }>>
  listPaginated(p: PageParams, opts?: { search?: string }): Promise<Paginated<Customer>>
  getById(id: string): Promise<Customer | null>
  create(input: CustomerInput): Promise<string | null>
  createReturning(
    input: Pick<CustomerInput, 'name' | 'phone'>
  ): Promise<{ id: string; name: string; phone: string | null } | { error: string }>
  update(id: string, input: CustomerInput): Promise<string | null>
  delete(id: string): Promise<string | null>
  hasSales(id: string): Promise<boolean>
}
