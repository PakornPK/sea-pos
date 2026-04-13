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
import type { CompanyStatus } from '@/types/database'

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

export default async function CompaniesPage() {
  await requirePlatformAdmin()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">บริษัทลูกค้า</h1>
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
        <CompanyList />
      </Suspense>
    </div>
  )
}

async function CompanyList() {
  const companies = await companyRepo.listAll()

  if (companies.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">ยังไม่มีบริษัทในระบบ</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ชื่อบริษัท</TableHead>
          <TableHead>เจ้าของ</TableHead>
          <TableHead className="text-center">ผู้ใช้</TableHead>
          <TableHead className="text-center">แพ็กเกจ</TableHead>
          <TableHead className="text-center">สถานะ</TableHead>
          <TableHead>สมัครเมื่อ</TableHead>
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
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
