import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'รายการขาย | SEA-POS',
}

function formatReceiptNo(no: number | null): string {
  if (!no) return '—'
  return `REC-${String(no).padStart(5, '0')}`
}

const PAYMENT_LABEL: Record<string, string> = {
  cash:     'เงินสด',
  card:     'บัตร',
  transfer: 'โอนเงิน',
}

export default async function SalesListPage() {
  const supabase = await createClient()

  // Guard: admin and manager only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    redirect('/pos')
  }

  const { data } = await supabase
    .from('sales')
    .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name)')
    .order('receipt_no', { ascending: false })
    .limit(200)

  const sales = data ?? []

  const totalCompleted = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + Number(s.total_amount), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">รายการขาย</h1>
        <div className="text-sm text-muted-foreground">
          ยอดรวม (ไม่รวมที่ยกเลิก):{' '}
          <span className="font-semibold text-foreground">
            ฿{totalCompleted.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
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
              const customer = Array.isArray(sale.customer) ? null : sale.customer as { name: string } | null
              const createdAt = new Date(sale.created_at).toLocaleString('th-TH', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
              return (
                <TableRow key={sale.id} className={sale.status === 'voided' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono font-medium">
                    {formatReceiptNo(sale.receipt_no)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{createdAt}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer?.name ?? <span className="italic">walk-in</span>}
                  </TableCell>
                  <TableCell>{PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    ฿{Number(sale.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {sale.status === 'voided' ? (
                      <Badge variant="destructive">ยกเลิกแล้ว</Badge>
                    ) : (
                      <Badge variant="secondary">สำเร็จ</Badge>
                    )}
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
    </div>
  )
}
