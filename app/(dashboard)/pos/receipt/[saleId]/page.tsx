import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { saleRepo } from '@/lib/repositories'
import { PrintButton } from '@/components/pos/PrintButton'
import { VoidSaleForm } from '@/components/pos/VoidSaleForm'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatReceiptNo, formatBaht } from '@/lib/format'
import { PAYMENT_LABEL, type PaymentMethod } from '@/lib/labels'

export const metadata: Metadata = {
  title: 'ใบเสร็จ | SEA-POS',
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>
}) {
  const { saleId } = await params
  const { supabase, me } = await requirePageRole(['admin', 'manager', 'cashier'])

  const [sale, items] = await Promise.all([
    saleRepo.getById(supabase, saleId),
    saleRepo.listItemsWithProduct(supabase, saleId),
  ])

  if (!sale) notFound()
  const isVoided = sale.status === 'voided'
  const canVoid = !isVoided && (me.role === 'admin' || me.role === 'manager')

  const createdAt = new Date(sale.created_at).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const customer =
    sale.customer && typeof sale.customer === 'object' && 'name' in sale.customer
      ? (sale.customer as { name: string; phone: string | null })
      : null

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      {/* ── Toolbar (hidden on print) ── */}
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/pos" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ChevronLeft className="h-4 w-4" />
          กลับ
        </Link>
        <h1 className="text-2xl font-semibold">ใบเสร็จรับเงิน</h1>
        {isVoided ? (
          <Badge variant="destructive" className="ml-auto">ยกเลิกแล้ว</Badge>
        ) : (
          <PrintButton className="ml-auto" />
        )}
      </div>

      {/* ── Receipt body ── */}
      <div
        className={cn(
          'border rounded-xl p-6 space-y-4',
          'print:border-0 print:shadow-none print:p-0',
          isVoided && 'opacity-60'
        )}
      >
        {/* Shop header */}
        <div className="text-center space-y-0.5">
          <p className="text-2xl font-bold tracking-tight">SEA-POS</p>
          <p className="text-sm text-muted-foreground">ใบเสร็จรับเงิน / Receipt</p>
          {isVoided && (
            <p className="text-destructive font-semibold text-sm mt-1">*** ยกเลิกออเดอร์แล้ว ***</p>
          )}
        </div>

        <Separator />

        {/* Sale meta */}
        <div className="space-y-1 text-sm">
          <Row label="เลขที่ใบเสร็จ" value={formatReceiptNo(sale.receipt_no)} mono />
          <Row label="วันที่"         value={createdAt} />
          <Row label="ชำระด้วย"      value={PAYMENT_LABEL[sale.payment_method as PaymentMethod] ?? sale.payment_method} />
          {customer && <Row label="ลูกค้า" value={customer.name} />}
        </div>

        <Separator />

        {/* Line items */}
        <div className="space-y-2.5">
          {items.map((item) => {
            const product = item.product as { name: string; sku: string | null } | null
            return (
              <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{product?.name ?? '—'}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} × {formatBaht(item.unit_price)}
                  </p>
                </div>
                <span className="tabular-nums font-medium shrink-0">
                  {formatBaht(item.subtotal)}
                </span>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="font-semibold">รวมทั้งสิ้น</span>
          <span className="text-2xl font-bold tabular-nums">
            {formatBaht(sale.total_amount)}
          </span>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-1">ขอบคุณที่ใช้บริการ 🙏</p>
      </div>

      {/* ── Void / Cancel section (hidden on print, admin/manager only) ── */}
      {canVoid && (
        <div className="border border-destructive/30 rounded-xl p-5 space-y-3 print:hidden">
          <div>
            <p className="font-semibold text-sm">ยกเลิกออเดอร์</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              สต๊อกสินค้าทุกรายการจะถูกคืนโดยอัตโนมัติ
            </p>
          </div>
          <VoidSaleForm saleId={saleId} />
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}
