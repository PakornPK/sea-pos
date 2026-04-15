import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePageRole } from '@/lib/auth'
import { customerRepo, saleRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { add } from '@/lib/money'
import { CustomerTable, type CustomerRow } from '@/components/customers/CustomerTable'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'ลูกค้า | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'cashier']
type Search = { page?: string; pageSize?: string; q?: string }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { me } = await requirePageRole(ALLOWED)
  const sp = await searchParams
  const canManage = me.role === 'admin' || me.role === 'manager' || me.role === 'cashier'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">ลูกค้า</h1>
      </div>

      <Suspense
        key={`${sp.page ?? 1}-${sp.pageSize ?? 20}-${sp.q ?? ''}`}
        fallback={<TableSkeleton columns={6} rows={8} withToolbar />}
      >
        <CustomersList sp={sp} canManage={canManage} role={me.role} />
      </Suspense>
    </div>
  )
}

async function CustomersList({
  sp, canManage, role,
}: {
  sp: Search
  canManage: boolean
  role: UserRole
}) {
  await requirePageRole(ALLOWED)
  const p = parsePageParams(sp)
  const search = sp.q?.trim() ?? ''

  const [result, completedSales] = await Promise.all([
    customerRepo.listPaginated(p, { search }),
    saleRepo.listCompletedForStats(),
  ])

  // Aggregate per-customer stats from ALL completed sales (so totals are
  // correct even when the current page is filtered/paginated).
  const stats = new Map<string, { total: number; count: number; last: string }>()
  for (const s of completedSales) {
    if (!s.customer_id) continue
    const cur = stats.get(s.customer_id) ?? { total: 0, count: 0, last: '' }
    cur.total = add(cur.total, s.total_amount)
    cur.count += 1
    if (s.created_at > cur.last) cur.last = s.created_at
    stats.set(s.customer_id, cur)
  }

  const rows: CustomerRow[] = result.rows.map((c) => {
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

  return (
    <>
      <CustomerTable
        customers={rows}
        canManage={canManage}
        role={role}
        currentSearch={search}
      />
      <Pagination
        basePath="/customers"
        searchParams={sp}
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
      />
    </>
  )
}
