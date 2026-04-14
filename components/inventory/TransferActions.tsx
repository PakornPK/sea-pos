'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cancelStockTransfer } from '@/lib/actions/stockTransfers'
import type { StockTransferStatus } from '@/types/database'

type Props = {
  transferId: string
  status:     StockTransferStatus
  canCancel:  boolean
}

export function TransferActions({ transferId, status, canCancel }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    const msg = status === 'in_transit'
      ? 'ยกเลิกรายการโอน? สต๊อกต้นทางจะถูกคืนอัตโนมัติ'
      : 'ยกเลิกรายการโอนนี้?'
    if (!confirm(msg)) return
    setError(null)
    startTransition(async () => {
      try { await cancelStockTransfer(transferId) }
      catch (e) { setError(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ') }
    })
  }

  if (!canCancel) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleCancel} disabled={pending} size="sm" variant="outline"
        className="text-destructive hover:text-destructive"
      >
        <X className="mr-1 h-4 w-4" />
        ยกเลิกรายการ
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
