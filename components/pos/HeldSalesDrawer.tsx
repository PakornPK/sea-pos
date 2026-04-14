'use client'

import { useEffect, useState, useTransition } from 'react'
import { Pause, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatBaht, formatDateTime } from '@/lib/format'
import { sumBy, lineTotal } from '@/lib/money'
import { cn } from '@/lib/utils'
import { listHeldSales, resumeHeldSale, deleteHeldSale } from '@/lib/actions/heldSales'
import type { HeldSaleListRow } from '@/lib/repositories'
import type { HeldSale } from '@/types/database'

type Props = {
  /** Called when the cashier picks a held bill — parent should hydrate the cart. */
  onResume: (snapshot: HeldSale) => void
  /**
   * True while the cart has items. Drives whether a resume should confirm —
   * resuming would replace the in-progress cart.
   */
  currentCartHasItems: boolean
  /**
   * Bump this counter to force an immediate refetch (e.g. after the parent
   * holds a new bill). Any change triggers a fresh listHeldSales() call so
   * the count badge + drawer list stay in sync without waiting for the user
   * to open the drawer.
   */
  refreshKey?: number
}

/**
 * Header pill that opens a list of parked bills for the active branch. Count
 * badge refreshes when the drawer opens or when `refreshKey` bumps.
 */
export function HeldSalesDrawer({ onResume, currentCartHasItems, refreshKey = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<HeldSaleListRow[]>([])
  const [loading, startLoading] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  // Fetch on mount, on drawer open, and whenever the parent bumps refreshKey.
  useEffect(() => {
    startLoading(async () => {
      const list = await listHeldSales()
      setRows(list)
    })
  }, [open, refreshKey])

  async function handleResume(id: string) {
    if (currentCartHasItems) {
      if (!confirm('ตะกร้าปัจจุบันจะถูกแทนที่ด้วยบิลที่พักไว้ ดำเนินการต่อ?')) return
    }
    setBusyId(id)
    const snapshot = await resumeHeldSale(id)
    setBusyId(null)
    if (!snapshot) return
    onResume(snapshot)
    setRows((prev) => prev.filter((r) => r.id !== id))
    setOpen(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบบิลที่พักไว้นี้?')) return
    setBusyId(id)
    try { await deleteHeldSale(id) }
    finally { setBusyId(null) }
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Pause className="h-3.5 w-3.5" />
        บิลที่พักไว้
        {rows.length > 0 && (
          <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-xs">
            {rows.length}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-full w-full max-w-md bg-background shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="font-semibold text-sm">บิลที่พักไว้</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  สาขาปัจจุบัน · กดเพื่อเรียกกลับมาขายต่อ
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && rows.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  กำลังโหลด...
                </p>
              ) : rows.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  ไม่มีบิลที่พักไว้
                </p>
              ) : (
                <ul className="divide-y">
                  {rows.map((r) => {
                    const total = sumBy(r.items, (i) => lineTotal(i.price, i.quantity))
                    const qty   = r.items.reduce((s, i) => s + i.quantity, 0)
                    const busy  = busyId === r.id
                    return (
                      <li key={r.id} className={cn('p-3', busy && 'opacity-50')}>
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleResume(r.id)}
                            disabled={busy}
                            className="flex-1 text-left space-y-1 hover:text-primary"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {r.note || 'บิลไม่ได้ระบุชื่อ'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {qty} ชิ้น
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {r.user?.full_name ?? '—'} · {formatDateTime(r.created_at)}
                            </p>
                          </button>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold tabular-nums text-sm">
                              {formatBaht(total)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={busy}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="ลบ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
