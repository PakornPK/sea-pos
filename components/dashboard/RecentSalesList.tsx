import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatReceiptNo, formatDateTime, formatBaht } from '@/lib/format'
import { PAYMENT_LABEL, type PaymentMethod } from '@/lib/labels'
import type { RecentSale } from '@/lib/repositories'

export function RecentSalesList({ sales }: { sales: RecentSale[] }) {
  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">การขายล่าสุด</h3>
        <Link href="/pos/sales" className="text-xs text-primary hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>
      {sales.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีการขาย</p>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <Link
                href={`/pos/receipt/${s.id}`}
                className="font-mono text-xs font-medium hover:underline shrink-0"
              >
                {formatReceiptNo(s.receipt_no, s.branch_code)}
              </Link>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDateTime(s.created_at)}
              </span>
              <span className="text-xs text-muted-foreground truncate flex-1">
                {s.customer_name ?? 'walk-in'}
              </span>
              <span className="text-xs text-muted-foreground">
                {PAYMENT_LABEL[s.payment_method as PaymentMethod] ?? s.payment_method}
              </span>
              <span className="tabular-nums font-medium text-sm shrink-0">
                {formatBaht(s.total_amount)}
              </span>
              {s.status === 'voided' ? (
                <Badge variant="destructive" className="shrink-0">ยกเลิก</Badge>
              ) : (
                <Link
                  href={`/pos/receipt/${s.id}`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0 h-7 w-7 p-0')}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
