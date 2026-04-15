import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { saleRepo, branchRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatReceiptNo, formatDateTime, formatBaht } from '@/lib/format'
import { PAYMENT_LABEL, SALE_STATUS_LABEL, type PaymentMethod, type SaleStatus } from '@/lib/labels'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'รายการขาย | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager']

type Search = { page?: string; pageSize?: string; branch?: string }

export default async function SalesListPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  await requirePageRole(ALLOWED)
  const sp = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">รายการขาย</h1>
      </div>

      <Suspense
        key={`${sp.page ?? 1}-${sp.pageSize ?? 20}`}
        fallback={<TableSkeleton columns={7} rows={10} />}
      >
        <SalesTable sp={sp} />
      </Suspense>
    </div>
  )
}

async function SalesTable({ sp }: { sp: Search }) {
  const { me } = await requirePageRole(ALLOWED)
  const p = parsePageParams(sp)
  const branchFilter = resolveBranchFilter(me, sp.branch)
  const isAdmin = me.role === 'admin' || me.isPlatformAdmin
  const [result, activeBranch] = await Promise.all([
    saleRepo.listRecentPaginated(p, { branchId: branchFilter }),
    me.activeBranchId ? branchRepo.getById(me.activeBranchId) : Promise.resolve(null),
  ])

  if (result.totalCount === 0) {
    return (
      <>
        {isAdmin && (
          <BranchScopeToggle
            basePath="/pos/sales"
            searchParams={sp}
            isAllBranches={branchFilter === null}
            activeBranchLabel={activeBranch?.name ?? null}
          />
        )}
        <p className="text-center text-muted-foreground py-16">ยังไม่มีรายการขาย</p>
      </>
    )
  }

  return (
    <>
      {isAdmin && (
        <BranchScopeToggle
          basePath="/pos/sales"
          searchParams={sp}
          isAllBranches={branchFilter === null}
          activeBranchLabel={activeBranch?.name ?? null}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เลขที่ใบเสร็จ</TableHead>
            <TableHead>วันที่</TableHead>
            <TableHead>ลูกค้า</TableHead>
            <TableHead>ชำระด้วย</TableHead>
            <TableHead className="text-right">ยอดรวม</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-center">ดู</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((sale) => {
            const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer
            const branch = Array.isArray(sale.branch) ? sale.branch[0] : sale.branch
            const status = sale.status as SaleStatus
            return (
              <TableRow key={sale.id} className={status === 'voided' ? 'opacity-50' : ''}>
                <TableCell className="font-mono font-medium">
                  {formatReceiptNo(sale.receipt_no, branch?.code)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateTime(sale.created_at)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer?.name ?? <span className="italic">walk-in</span>}
                </TableCell>
                <TableCell>{PAYMENT_LABEL[sale.payment_method as PaymentMethod] ?? sale.payment_method}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBaht(sale.total_amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={status === 'voided' ? 'destructive' : 'secondary'}>
                    {SALE_STATUS_LABEL[status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Link
                    href={`/pos/receipt/${sale.id}`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Pagination
        basePath="/pos/sales"
        searchParams={sp}
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
      />
    </>
  )
}

// keep Skeleton import usable
void Skeleton
