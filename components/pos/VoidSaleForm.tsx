'use client'

import { useActionState } from 'react'
import { voidSale } from '@/lib/actions/pos'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type VoidSaleFormProps = {
  saleId: string
}

export function VoidSaleForm({ saleId }: VoidSaleFormProps) {
  const [state, formAction, isPending] = useActionState(voidSale, undefined)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="saleId" value={saleId} />

      <div className="space-y-1.5">
        <Label htmlFor="reason">เหตุผลการยกเลิก</Label>
        <Input
          id="reason"
          name="reason"
          placeholder="เช่น ลูกค้าเปลี่ยนใจ, ชำระเงินผิด..."
          required
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button
        type="submit"
        variant="destructive"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิกออเดอร์'}
      </Button>
    </form>
  )
}
