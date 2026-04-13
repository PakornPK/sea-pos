'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  cancelPurchaseOrder, confirmPurchaseOrder,
} from '@/lib/actions/purchasing'
import type { PurchaseOrderStatus } from '@/types/database'

type Props = {
  id: string
  status: PurchaseOrderStatus
}

export function POActions({ id, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    if (!confirm('ยืนยันการสั่งซื้อใบนี้?')) return
    setError(null)
    startTransition(async () => {
      try { await confirmPurchaseOrder(id) }
      catch (e) { setError(e instanceof Error ? e.message : 'ยืนยันไม่สำเร็จ') }
    })
  }

  function handleCancel() {
    if (!confirm('ยืนยันการยกเลิกใบสั่งซื้อ?')) return
    setError(null)
    startTransition(async () => {
      try { await cancelPurchaseOrder(id) }
      catch (e) { setError(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ') }
    })
  }

  if (status === 'received' || status === 'cancelled') return null

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {status === 'draft' && (
          <Button size="sm" onClick={handleConfirm} disabled={pending}>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            ยืนยันสั่งซื้อ
          </Button>
        )}
        <Button
          size="sm" variant="outline" onClick={handleCancel}
          disabled={pending} className="text-destructive"
        >
          <XCircle className="mr-1 h-4 w-4" />
          ยกเลิก
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
