import type { Supplier } from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export type SupplierInput = {
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
}

export interface SupplierRepository {
  list(): Promise<Supplier[]>
  listPaginated(p: PageParams): Promise<Paginated<Supplier>>
  create(input: SupplierInput): Promise<string | null>
  update(id: string, input: SupplierInput): Promise<string | null>
  delete(id: string): Promise<string | null>
  hasOrders(id: string): Promise<boolean>
}
