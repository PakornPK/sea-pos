import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { CustomerTable, type CustomerRow } from '@/components/customers/CustomerTable'
import type { Customer } from '@/types/database'

export const metadata: Metadata = {
  title: 'ลูกค้า | SEA-POS',
}

export default async function CustomersPage() {
  const { supabase, me } = await requirePageRole(['admin', 'manager', 'cashier'])
  const role = me.role

  const [{ data: customerData }, { data: salesData }] = await Promise.all([
    supabase.from('customers').select('*').order('name'),
    supabase
      .from('sales')
      .select('customer_id, total_amount, created_at, status')
      .eq('status', 'completed'),
  ])

  const customers = (customerData ?? []) as Customer[]
  const sales = (salesData ?? []) as Array<{
    customer_id: string | null
    total_amount: number
    created_at: string
    status: string
  }>

  // Aggregate purchase stats per customer
  const stats = new Map<string, { total: number; count: number; last: string }>()
  for (const s of sales) {
    if (!s.customer_id) continue
    const cur = stats.get(s.customer_id) ?? { total: 0, count: 0, last: '' }
    cur.total += Number(s.total_amount)
    cur.count += 1
    if (s.created_at > cur.last) cur.last = s.created_at
    stats.set(s.customer_id, cur)
  }

  const rows: CustomerRow[] = customers.map((c) => {
    const st = stats.get(c.id)
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      created_at: c.created_at,
      total_spent: st?.total ?? 0,
      order_count: st?.count ?? 0,
      last_order_at: st?.last || null,
    }
  })

  const canManage = role === 'admin' || role === 'manager' || role === 'cashier'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ลูกค้า</h1>
      </div>
      <CustomerTable customers={rows} canManage={canManage} role={role} />
    </div>
  )
}
