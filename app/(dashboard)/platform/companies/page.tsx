import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Eye } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { parseSort, sortRows, sortToggleHref } from '@/lib/sort'
import type { CompanyStatus } from '@/types/database'

type CompanyRow = { id: string; name: string; owner_email: string | null; user_count: number; plan: string; status: CompanyStatus; created_at: string }

export const metadata: Metadata = {
  title: 'บริษัทลูกค้า | SEA-POS Platform',
}

const STATUS_LABEL: Record<CompanyStatus, string> = {
  pending:   'รออนุมัติ',
  active:    'ใช้งานอยู่',
  suspended: 'ระงับ',
  closed:    'ปิด',
}

const STATUS_VARIANT: Record<CompanyStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending:   'outline',
  active:    'secondary',
  suspended: 'destructive',
  closed:    'destructive',
}

const PLAN_LABEL: Record<string, string> = {
  free:       'ฟรี',
  pro:        'โปร',
  enterprise: 'องค์กร',
}

type SortCol = 'name' | 'user_count' | 'created_at' | 'status'
type Search = { sort?: string; dir?: string }

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  await requirePlatformAdmin()
  const sp = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">บริษัทลูกค้า</h1>
          <p className="text-sm text-muted-foreground mt-1">จัดการบริษัทที่ใช้งาน SEA-POS</p>
        </div>
        <Link
          href="/platform/companies/new"
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มบริษัทใหม่
        </Link>
      </div>

      <Suspense fallback={<TableSkel />}>
        <CompanyList sp={sp} />
      </Suspense>
    </div>
  )
}

async function CompanyList({ sp }: { sp: Search }) {
  const { col, dir } = parseSort<SortCol>(sp as Record<string, string | undefined>, 'name', 'asc')
  const companies = sortRows(await companyRepo.listAll() as CompanyRow[], col as keyof CompanyRow, dir)

  function href(c: SortCol) {
    return sortToggleHref('/platform/companies', sp as Record<string, string | undefined>, c, col, dir)
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-12 text-center">
        <p className="text-[14px] text-muted-foreground">ยังไม่มีบริษัทในระบบ</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SortableHeader label="ชื่อบริษัท" active={col === 'name'} dir={dir} href={href('name')} />
          </TableHead>
          <TableHead>เจ้าของ</TableHead>
          <TableHead className="text-center">
            <SortableHeader label="ผู้ใช้" active={col === 'user_count'} dir={dir} href={href('user_count')} />
          </TableHead>
          <TableHead className="text-center">แพ็กเกจ</TableHead>
          <TableHead className="text-center">
            <SortableHeader label="สถานะ" active={col === 'status'} dir={dir} href={href('status')} />
          </TableHead>
          <TableHead>
            <SortableHeader label="สมัครเมื่อ" active={col === 'created_at'} dir={dir} href={href('created_at')} />
          </TableHead>
          <TableHead className="text-center">ดู</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {c.owner_email ?? <span className="italic">—</span>}
            </TableCell>
            <TableCell className="text-center tabular-nums">{c.user_count}</TableCell>
            <TableCell className="text-center text-sm">{PLAN_LABEL[c.plan] ?? c.plan}</TableCell>
            <TableCell className="text-center">
              <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(c.created_at)}
            </TableCell>
            <TableCell className="text-center">
              <Link
                href={`/platform/companies/${c.id}`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                <Eye className="h-4 w-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TableSkel() {
  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-border/60 px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}
