'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { formatReceiptNo, formatDateTime, formatBaht } from '@/lib/format'
import { PAYMENT_LABEL, SALE_STATUS_LABEL, type PaymentMethod, type SaleStatus } from '@/lib/labels'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { parseSort, sortRows, sortToggleHref } from '@/lib/sort'
import type { UserRole } from '@/types/database'
import type { Paginated } from '@/lib/pagination'

type SortCol = 'receipt_no' | 'created_at' | 'total_amount' | 'status'

interface Props {
  role: UserRole
  companyId: string | null
  activeBranchId: string | null
  branchIds: string[]
  isPlatformAdmin: boolean
}

export function SalesListSection({ role, companyId: _companyId, activeBranchId, branchIds, isPlatformAdmin }: Props) {
  const searchParams = useSearchParams()
  const sp = {
    page:     searchParams.get('page')     ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
    branch:   searchParams.get('branch')   ?? undefined,
    sort:     searchParams.get('sort')     ?? undefined,
    dir:      searchParams.get('dir')      ?? undefined,
  }

  const me = { role, companyId: _companyId, activeBranchId, branchIds, isPlatformAdmin, id: '', email: null, fullName: null }
  const p = parsePageParams(sp)
  const branchFilter = resolveBranchFilter(me, sp.branch)
  const isAdmin = role === 'admin' || isPlatformAdmin
  const { col, dir } = parseSort<SortCol>(sp, 'created_at', 'desc')

  type SaleResult = Awaited<ReturnType<typeof saleRepo.listRecentPaginated>>
  const [result, setResult] = useState<SaleResult | null>(null)
  const [activeBranch, setActiveBranch] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetches: Promise<void>[] = [
      saleRepo.listRecentPaginated(p, { branchId: branchFilter }).then(setResult),
    ]
    if (activeBranchId) {
      fetches.push(branchRepo.getById(activeBranchId).then((b) => setActiveBranch(b)))
    }
    Promise.all(fetches).catch(() => {}).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.page, sp.pageSize, sp.branch])

  function href(c: SortCol) {
    return sortToggleHref('/pos/sales', sp, c, col, dir)
  }

  if (loading) return <TableSkeleton columns={7} rows={10} />

  const sortedRows = sortRows(result?.rows ?? [], col as keyof NonNullable<SaleResult>['rows'][0], dir)

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

      {(!result || result.rows.length === 0) ? (
        <p className="text-center text-muted-foreground py-16">ยังไม่มีรายการขาย</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader label="เลขที่ใบเสร็จ" active={col === 'receipt_no'} dir={dir} href={href('receipt_no')} />
                </TableHead>
                <TableHead>
                  <SortableHeader label="วันที่" active={col === 'created_at'} dir={dir} href={href('created_at')} />
                </TableHead>
                <TableHead>ลูกค้า</TableHead>
                <TableHead>ชำระด้วย</TableHead>
                <TableHead className="text-right">
                  <SortableHeader label="ยอดรวม" active={col === 'total_amount'} dir={dir} href={href('total_amount')} />
                </TableHead>
                <TableHead className="text-center">
                  <SortableHeader label="สถานะ" active={col === 'status'} dir={dir} href={href('status')} />
                </TableHead>
                <TableHead className="text-center">ดู</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((sale) => {
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
                      {sale.member_name ?? <span className="italic">walk-in</span>}
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
                        href={`/pos/receipt/?saleId=${sale.id}`}
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
      )}
    </>
  )
}
