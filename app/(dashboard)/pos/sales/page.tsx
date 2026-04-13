import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { saleRepo } from '@/lib/repositories'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
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

export default async function SalesListPage() {
  await requirePageRole(ALLOWED)

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<HeaderSkeleton />}>
        <SalesContent />
      </Suspense>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-56" />
      </div>
      <TableSkeleton columns={7} rows={10} />
    </>
  )
}

async function SalesContent() {
  const { supabase } = await requirePageRole(ALLOWED)
  const sales = await saleRepo.listRecent(supabase)

  const totalCompleted = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + Number(s.total_amount), 0)

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">รายการขาย</h1>
        <div className="text-sm text-muted-foreground">
          ยอดรวม (ไม่รวมที่ยกเลิก):{' '}
          <span className="font-semibold text-foreground">{formatBaht(totalCompleted)}</span>
        </div>
      </div>

      {sales.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">ยังไม่มีรายการขาย</p>
      ) : (
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
            {sales.map((sale) => {
              const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer
              const status = sale.status as SaleStatus
              return (
                <TableRow key={sale.id} className={status === 'voided' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono font-medium">
                    {formatReceiptNo(sale.receipt_no)}
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
      )}
    </>
  )
}
