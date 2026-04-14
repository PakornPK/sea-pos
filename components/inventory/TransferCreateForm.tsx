'use client'

import { useActionState, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { createStockTransfer } from '@/lib/actions/stockTransfers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TransferLineEditor, type TransferLine } from '@/components/inventory/TransferLineEditor'
import type { Branch, ProductWithStock } from '@/types/database'

type Props = {
  fromBranch:        Branch | null
  toBranchCandidates: Branch[]
  productsAtSource:   ProductWithStock[]
}

export function TransferCreateForm({
  fromBranch, toBranchCandidates, productsAtSource,
}: Props) {
  const [state, formAction, pending] = useActionState(createStockTransfer, undefined)
  const [, setLines] = useState<TransferLine[]>([])

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl">
      <div className="grid grid-cols-5 items-end gap-3 rounded-lg border bg-card p-4">
        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs">สาขาต้นทาง</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
            {fromBranch
              ? <>{fromBranch.name} <span className="ml-1 text-xs text-muted-foreground">({fromBranch.code})</span></>
              : <span className="text-muted-foreground">—</span>}
          </div>
        </div>
        <div className="col-span-1 flex items-center justify-center pb-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs">สาขาปลายทาง *</Label>
          <select
            name="to_branch_id"
            required
            disabled={pending}
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="" disabled>— เลือกสาขาปลายทาง —</option>
            {toBranchCandidates.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs" htmlFor="notes">หมายเหตุ</Label>
        <Input id="notes" name="notes" placeholder="เช่น โอนเติมสต๊อก" disabled={pending} />
      </div>

      <div>
        <Label className="text-xs">รายการสินค้า</Label>
        <div className="mt-1.5">
          <TransferLineEditor products={productsAtSource} onChange={setLines} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังสร้าง...' : 'สร้างรายการโอน'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        หมายเหตุ: สต๊อกสาขาต้นทางจะถูกหักทันทีเมื่อสร้างรายการ
        ปลายทางต้องกด &quot;รับของ&quot; เพื่อเพิ่มสต๊อกเข้า
      </p>
    </form>
  )
}
