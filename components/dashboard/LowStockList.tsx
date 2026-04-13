import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LowStockItem } from '@/lib/repositories'

export function LowStockList({ items }: { items: LowStockItem[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          สินค้าใกล้หมด
        </h3>
        <Link href="/inventory" className="text-xs text-primary hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          ไม่มีสินค้าใกล้หมด 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
              </div>
              <Badge variant="destructive" className="shrink-0">
                เหลือ {p.stock} / ขั้นต่ำ {p.min_stock}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
