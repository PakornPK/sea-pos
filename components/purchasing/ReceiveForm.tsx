'use client'

import { useActionState, useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { receivePurchaseOrder } from '@/lib/actions/purchasing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type ReceiveLine = {
  itemId: string
  productName: string
  productSku: string | null
  ordered: number
  received: number
}

export function ReceiveForm({
  id, lines,
}: {
  id: string
  lines: ReceiveLine[]
}) {
  const [state, formAction, pending] = useActionState(receivePurchaseOrder, undefined)
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const l of lines) init[l.itemId] = Math.max(0, l.ordered - l.received)
    return init
  })

  const outstanding = lines.filter((l) => l.ordered - l.received > 0)

  if (outstanding.length === 0) {
    return <p className="text-sm text-muted-foreground">รับของครบทุกรายการแล้ว</p>
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">สินค้า</th>
              <th className="px-3 py-2 font-medium text-right w-28">สั่ง</th>
              <th className="px-3 py-2 font-medium text-right w-28">รับแล้ว</th>
              <th className="px-3 py-2 font-medium text-right w-28">คงเหลือ</th>
              <th className="px-3 py-2 font-medium text-right w-32">รับครั้งนี้</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const remaining = l.ordered - l.received
              return (
                <tr key={l.itemId} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{l.productName}</div>
                    {l.productSku && (
                      <div className="text-xs text-muted-foreground">{l.productSku}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.ordered}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.received}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {remaining}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      name={`qty__${l.itemId}`}
                      min={0}
                      max={remaining}
                      value={qty[l.itemId] || ''}
                      disabled={pending || remaining === 0}
                      onChange={(e) =>
                        setQty((prev) => ({
                          ...prev,
                          [l.itemId]: Math.min(remaining, Math.max(0, Number(e.target.value))),
                        }))
                      }
                      className="text-right"
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
        <p className="text-sm text-green-600">บันทึกการรับของสำเร็จ — สต๊อกได้ถูกอัปเดตแล้ว</p>
      )}

      <Button type="submit" disabled={pending}>
        <PackageCheck className="mr-1 h-4 w-4" />
        {pending ? 'กำลังบันทึก...' : 'บันทึกการรับของ'}
      </Button>
    </form>
  )
}
