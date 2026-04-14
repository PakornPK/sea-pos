'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPurchaseOrder, updatePurchaseOrder } from '@/lib/actions/purchasing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { POLineEditor, type POLine } from '@/components/purchasing/POLineEditor'
import type { Branch, Category, Product, Supplier } from '@/types/database'
import type { VatConfig } from '@/lib/vat'

type Props = {
  suppliers: Supplier[]
  products: Product[]
  categories?: Category[]
  /** Branches the current user can create a PO at. Create flow only. */
  branches?: Branch[]
  /** User's active branch — preselected in the picker. Create flow only. */
  activeBranchId?: string | null
  /** Company VAT config for the live breakdown in the line editor. */
  vatConfig?: VatConfig
  initial?: {
    id: string
    supplierId: string
    notes: string | null
    lines: POLine[]
  }
}

export function POForm({
  suppliers, products, categories, branches, activeBranchId, vatConfig, initial,
}: Props) {
  const isEdit = Boolean(initial)
  const action = isEdit ? updatePurchaseOrder : createPurchaseOrder
  const [state, formAction, pending] = useActionState(action, undefined)
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [lines, setLines] = useState<POLine[]>(initial?.lines ?? [])
  const availableBranches = branches ?? []
  const defaultBranchId =
    activeBranchId && availableBranches.some((b) => b.id === activeBranchId)
      ? activeBranchId
      : availableBranches[0]?.id ?? ''
  const [branchId, setBranchId] = useState<string>(defaultBranchId)
  const router = useRouter()

  useEffect(() => {
    if (isEdit && state?.success) router.refresh()
  }, [state, isEdit, router])

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      {!isEdit && <input type="hidden" name="branchId" value={branchId} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="supplierId">ผู้จำหน่าย *</Label>
          <select
            id="supplierId"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">— เลือกผู้จำหน่าย —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {!isEdit && availableBranches.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchId">สาขาที่จะรับของ *</Label>
            <select
              id="branchId"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              disabled={pending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">หมายเหตุ</Label>
          <Input
            id="notes"
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            placeholder="เช่น สั่งล็อตประจำเดือน"
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">รายการสินค้า</Label>
        <POLineEditor
          products={products}
          categories={categories}
          vatConfig={vatConfig}
          initial={initial?.lines}
          onChange={setLines}
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !supplierId || lines.length === 0 || (!isEdit && !branchId)}>
          {pending ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกใบสั่งซื้อ (ร่าง)'}
        </Button>
      </div>
    </form>
  )
}
