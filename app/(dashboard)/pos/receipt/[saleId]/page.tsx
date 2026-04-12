import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/pos/PrintButton'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'ใบเสร็จ | SEA-POS',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash:     'เงินสด',
  card:     'บัตรเครดิต/เดบิต',
  transfer: 'โอนเงิน',
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>
}) {
  const { saleId } = await params
  const supabase = await createClient()

  const { data: sale } = await supabase
    .from('sales')
    .select('*, customer:customers(name, phone)')
    .eq('id', saleId)
    .single()

  if (!sale) notFound()

  const { data: rawItems } = await supabase
    .from('sale_items')
    .select('*, product:products(name, sku)')
    .eq('sale_id', saleId)
    .order('id')

  const items = rawItems ?? []

  const createdAt = new Date(sale.created_at).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // customer is either an object or null (Supabase returns {} for unmatched FK)
  const customer = sale.customer && typeof sale.customer === 'object' && 'name' in sale.customer
    ? sale.customer as { name: string; phone: string | null }
    : null

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar (hidden on print) ── */}
      <div className="flex items-center gap-3 print:hidden">
        <Link
          href="/pos"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ChevronLeft className="h-4 w-4" />
          กลับ
        </Link>
        <h1 className="text-2xl font-semibold">ใบเสร็จรับเงิน</h1>
        <PrintButton className="ml-auto" />
      </div>

      {/* ── Receipt body ── */}
      <div className="max-w-sm mx-auto w-full border rounded-xl p-6 space-y-4 print:border-0 print:shadow-none print:p-0 print:max-w-none">
        {/* Shop name */}
        <div className="text-center space-y-0.5">
          <p className="text-2xl font-bold tracking-tight">SEA-POS</p>
          <p className="text-sm text-muted-foreground">ใบเสร็จรับเงิน / Receipt</p>
        </div>

        <Separator />

        {/* Sale meta */}
        <div className="space-y-1 text-sm">
          <Row label="เลขที่" value={`#${sale.id.slice(0, 8).toUpperCase()}`} mono />
          <Row label="วันที่" value={createdAt} />
          <Row label="ชำระด้วย" value={PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method} />
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
                    {item.quantity} × ฿{Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
                <span className="tabular-nums font-medium shrink-0">
                  ฿{Number(item.subtotal).toFixed(2)}
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
            ฿{Number(sale.total_amount).toFixed(2)}
          </span>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          ขอบคุณที่ใช้บริการ 🙏
        </p>
      </div>
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
