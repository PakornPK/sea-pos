'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { listSuppliersPaginated, type SupplierPageData } from '@/lib/actions/suppliers'
import { SupplierTable } from '@/components/purchasing/SupplierTable'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SuppliersPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const page     = searchParams.get('page')     ?? undefined
  const pageSize = searchParams.get('pageSize') ?? undefined
  const sp = { page, pageSize }

  const [data, setData] = useState<SupplierPageData | null>(null)

  useEffect(() => {
    if (!user) return
    listSuppliersPaginated({ page, pageSize }).then(setData)
  }, [user, page, pageSize])

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/purchasing/"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight">ผู้จำหน่าย</h1>
      </div>

      {data ? (
        <>
          <SupplierTable suppliers={data.rows} role={user.role} />
          <Pagination
            basePath="/purchasing/suppliers/"
            searchParams={sp}
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            totalPages={data.totalPages}
          />
        </>
      ) : (
        <TableSkeleton columns={5} rows={6} withToolbar />
      )}
    </div>
  )
}
