import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { supplierRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { SupplierTable } from '@/components/purchasing/SupplierTable'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'ผู้จำหน่าย | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']
type Search = { page?: string; pageSize?: string }

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { me } = await requirePageRole(ALLOWED)
  const sp = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/purchasing"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">ผู้จำหน่าย</h1>
      </div>

      <Suspense
        key={`${sp.page ?? 1}-${sp.pageSize ?? 20}`}
        fallback={<TableSkeleton columns={5} rows={6} withToolbar />}
      >
        <SuppliersList sp={sp} role={me.role} />
      </Suspense>
    </div>
  )
}

async function SuppliersList({ sp, role }: { sp: Search; role: UserRole }) {
  await requirePageRole(ALLOWED)
  const p = parsePageParams(sp)
  const result = await supplierRepo.listPaginated(p)

  return (
    <>
      <SupplierTable suppliers={result.rows} role={role} />
      <Pagination
        basePath="/purchasing/suppliers"
        searchParams={sp}
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
      />
    </>
  )
}
