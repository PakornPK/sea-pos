'use client'

import { useActionState, useState } from 'react'
import { CheckCircle2, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { receiveStockTransfer } from '@/lib/actions/stockTransfers'
import type { StockTransferItemWithProduct } from '@/lib/repositories/contracts'

type Props = {
  transferId: string
  items:      StockTransferItemWithProduct[]
}

type LineState = {
  quantityReceived: number
  receiveNote:      string
}

/**
 * Per-item receive form. Each row has a quantity input (defaults to
 * quantity_sent) and a reason note. Submitting credits destination stock
 * by the entered quantity and records the note for any shortfall.
 */
export function TransferReceiveForm({ transferId, items }: Props) {
  const [state, formAction, pending] = useActionState(receiveStockTransfer, undefined)
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(items.map((i) => [
      i.id,
      { quantityReceived: i.quantity_sent, receiveNote: '' },
    ])),
  )

  function update(itemId: string, patch: Partial<LineState>) {
    setLines((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }))
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <input type="hidden" name="id" value={transferId} />

      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <PackageCheck className="h-4 w-4" />
        รับของจากสาขาต้นทาง
      </div>
      <p className="text-xs text-muted-foreground">
        กรอกจำนวนที่ได้รับจริง หากน้อยกว่าจำนวนที่โอนมา ส่วนต่างจะถูกตัดจำหน่าย
        (ไม่คืนให้สาขาต้นทาง) โปรดระบุเหตุผลเพื่อเก็บเป็นประวัติ
      </p>

      <div className="rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">สินค้า</th>
              <th className="px-3 py-2 font-medium text-right w-20">ส่งมา</th>
              <th className="px-3 py-2 font-medium text-right w-24">รับจริง</th>
              <th className="px-3 py-2 font-medium w-[40%]">หมายเหตุ (ถ้ามีส่วนต่าง)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const line = lines[item.id]
              const shortage = item.quantity_sent - line.quantityReceived
              return (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.product.name}</div>
                    {item.product.sku && (
                      <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {item.quantity_sent}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      name={`recv__${item.id}`}
                      min={0}
                      max={item.quantity_sent}
                      value={line.quantityReceived}
                      onChange={(e) => update(item.id, { quantityReceived: Number(e.target.value) })}
                      disabled={pending}
                      className={cn('text-right', shortage > 0 && 'border-destructive')}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      name={`note__${item.id}`}
                      value={line.receiveNote}
                      onChange={(e) => update(item.id, { receiveNote: e.target.value })}
                      placeholder={
                        shortage > 0
                          ? `ขาด ${shortage} ชิ้น เช่น เสียหาย / สูญหาย`
                          : 'เช่น รับครบตามส่งมา'
                      }
                      disabled={pending}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="inline-flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> บันทึกการรับของแล้ว
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines(
            Object.fromEntries(items.map((i) => [
              i.id,
              { quantityReceived: i.quantity_sent, receiveNote: '' },
            ])),
          )}
          disabled={pending}
        >
          รีเซ็ตเป็นจำนวนเต็ม
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก...' : 'ยืนยันรับของ'}
        </Button>
      </div>
    </form>
  )
}
