import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Eye, Mail, MapPin, Phone } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { customerRepo, saleRepo } from '@/lib/repositories'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { CustomerDeleteButton } from '@/components/customers/CustomerDeleteButton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatReceiptNo, formatDateTime, formatBaht } from '@/lib/format'
import { PAYMENT_LABEL, type PaymentMethod } from '@/lib/labels'
import { sumBy, average } from '@/lib/money'

export const metadata: Metadata = {
  title: 'รายละเอียดลูกค้า | SEA-POS',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { me } = await requirePageRole(['admin', 'manager', 'cashier'])
  const role = me.role

  const [customer, sales] = await Promise.all([
    customerRepo.getById(id),
    saleRepo.listForCustomer(id),
  ])

  if (!customer) notFound()

  const completed = sales.filter((s) => s.status === 'completed')
  const totalSpent = sumBy(completed, (s) => s.total_amount)
  const avgPerOrder = average(totalSpent, completed.length)

  const canManage = role === 'admin' || role === 'manager'
  const canDelete = role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-[26px] font-bold tracking-tight">{customer.name}</h1>
        </div>
        {canDelete && <CustomerDeleteButton id={customer.id} name={customer.name} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-4">
          <p className="text-xs text-muted-foreground">จำนวนบิล (ไม่รวมยกเลิก)</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{completed.length}</p>
        </div>
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-4">
          <p className="text-xs text-muted-foreground">ยอดซื้อรวม</p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {formatBaht(totalSpent)}
          </p>
        </div>
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-4">
          <p className="text-xs text-muted-foreground">เฉลี่ยต่อบิล</p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {formatBaht(avgPerOrder)}
          </p>
        </div>
      </div>

      {/* Profile */}
      {canManage ? (
        <CustomerForm customer={customer} />
      ) : (
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-4 space-y-2 text-[14px]">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{customer.phone || <span className="text-muted-foreground">—</span>}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{customer.email || <span className="text-muted-foreground">—</span>}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{customer.address || <span className="text-muted-foreground">—</span>}</span>
          </div>
        </div>
      )}

      {/* Purchase history */}
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight mb-3">ประวัติการซื้อ</h2>
        {sales.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            ลูกค้ารายนี้ยังไม่มีประวัติการซื้อ
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่ใบเสร็จ</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>ชำระด้วย</TableHead>
                <TableHead className="text-right">ยอดรวม</TableHead>
                <TableHead className="text-center">สถานะ</TableHead>
                <TableHead className="text-center">ดู</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id} className={s.status === 'voided' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono font-medium">
                    {formatReceiptNo(s.receipt_no, s.branch_code)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(s.created_at)}
                  </TableCell>
                  <TableCell>{PAYMENT_LABEL[s.payment_method as PaymentMethod] ?? s.payment_method}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBaht(s.total_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.status === 'voided' ? (
                      <Badge variant="destructive">ยกเลิกแล้ว</Badge>
                    ) : (
                      <Badge variant="secondary">สำเร็จ</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/pos/receipt/${s.id}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
