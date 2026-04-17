import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftRight, ArrowRight, Plus } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { stockTransferRepo, branchRepo } from '@/lib/repositories'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { parseSort, sortRows, sortToggleHref } from '@/lib/sort'
import type { StockTransferStatus, UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'โอนสต๊อก | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']

const STATUS_LABEL: Record<StockTransferStatus, string> = {
  draft:      'ร่าง',
  in_transit: 'กำลังโอน',
  received:   'รับของแล้ว',
  cancelled:  'ยกเลิก',
}

const STATUS_VARIANT: Record<StockTransferStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft:      'outline',
  in_transit: 'default',
  received:   'secondary',
  cancelled:  'destructive',
}

type SortCol = 'created_at' | 'status' | 'total_quantity'
type Search = { branch?: string; sort?: string; dir?: string }

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { me } = await requirePageRole(ALLOWED)
  const sp = await searchParams

  const isAdmin = me.role === 'admin' || me.isPlatformAdmin
  const branchFilter = resolveBranchFilter(me, sp.branch)
  const { col, dir } = parseSort<SortCol>(sp as Record<string, string | undefined>, 'created_at', 'desc')

  const [rawRows, activeBranch] = await Promise.all([
    stockTransferRepo.list({ branchId: branchFilter }),
    me.activeBranchId ? branchRepo.getById(me.activeBranchId) : Promise.resolve(null),
  ])

  const rows = sortRows(rawRows, col as keyof typeof rawRows[0], dir)

  function href(c: SortCol) {
    return sortToggleHref('/inventory/transfers', sp as Record<string, string | undefined>, c, col, dir)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">โอนสต๊อกระหว่างสาขา</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ย้ายสินค้าจากสาขาหนึ่งไปอีกสาขา สต๊อกต้นทางจะถูกหักทันทีที่สร้างรายการ
          </p>
        </div>
        <Link
          href="/inventory/transfers/new"
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          <Plus className="mr-1 h-4 w-4" />
          สร้างรายการโอน
        </Link>
      </div>

      {isAdmin && (
        <BranchScopeToggle
          basePath="/inventory/transfers"
          searchParams={sp as Record<string, string | undefined>}
          isAllBranches={branchFilter === null}
          activeBranchLabel={activeBranch?.name ?? null}
        />
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-muted/30 py-10 text-center text-sm text-muted-foreground">
          ยังไม่มีรายการโอน
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader label="วันที่" active={col === 'created_at'} dir={dir} href={href('created_at')} />
              </TableHead>
              <TableHead>จาก → ไป</TableHead>
              <TableHead className="text-right">จำนวนรายการ</TableHead>
              <TableHead className="text-right">
                <SortableHeader label="ชิ้นรวม" active={col === 'total_quantity'} dir={dir} href={href('total_quantity')} />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader label="สถานะ" active={col === 'status'} dir={dir} href={href('status')} />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(t.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="inline-flex items-center gap-0.5 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                      {t.from_branch.code}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="inline-flex items-center gap-0.5 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                      {t.to_branch.code}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{t.item_count}</TableCell>
                <TableCell className="text-right tabular-nums">{t.total_quantity}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={STATUS_VARIANT[t.status]}>
                    {STATUS_LABEL[t.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/inventory/transfers/${t.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
