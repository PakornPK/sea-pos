'use client'

import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { convertStockUnit } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BranchStock = { branch_id: string; branch_name: string; quantity: number }

type Props = {
  productId: string
  currentUnit: string
  minStock: number
  branchStocks: BranchStock[]
}

export function ConvertStockUnitForm({ productId, currentUnit, minStock, branchStocks }: Props) {
  const [newUnit, setNewUnit] = useState('')
  const [factor, setFactor] = useState('')
  const [result, setResult] = useState<{ success?: true; error?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const f = parseFloat(factor)
  const validFactor = Number.isFinite(f) && f > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newUnit.trim() || !validFactor) return
    setResult(null)
    startTransition(async () => {
      const res = await convertStockUnit(productId, newUnit.trim(), f)
      setResult(res)
      if ('success' in res) {
        setNewUnit('')
        setFactor('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">หน่วยปัจจุบัน:</span>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono">{currentUnit}</span>
      </div>

      {branchStocks.length > 0 && (
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px] space-y-0.5">
          {branchStocks.map((b) => (
            <div key={b.branch_id} className="flex justify-between">
              <span className="text-muted-foreground">{b.branch_name}</span>
              <span className="tabular-nums font-medium">
                {b.quantity} {currentUnit}
                {validFactor && newUnit.trim() && (
                  <span className="text-primary ml-2">
                    → {Math.round(b.quantity * f * 1000) / 1000} {newUnit.trim()}
                  </span>
                )}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border/60 mt-1 pt-1">
            <span className="text-muted-foreground">สต๊อกขั้นต่ำ</span>
            <span className="tabular-nums font-medium">
              {minStock} {currentUnit}
              {validFactor && newUnit.trim() && (
                <span className="text-primary ml-2">
                  → {Math.round(minStock * f * 1000) / 1000} {newUnit.trim()}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="space-y-1.5">
          <Label>หน่วยใหม่</Label>
          <Input
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="เช่น กรัม"
            disabled={pending}
          />
        </div>
        <div className="pb-2 text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="space-y-1.5">
          <Label>
            1 {currentUnit || '...'} = ? {newUnit || '...'}
          </Label>
          <Input
            type="number"
            min="0.000001"
            step="any"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            placeholder="เช่น 1000"
            disabled={pending}
            className="tabular-nums"
          />
        </div>
      </div>

      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.success && (
        <p className="text-sm text-green-600">แปลงหน่วยสำเร็จ — สต๊อกและหน่วยขั้นต่ำถูกอัปเดตแล้ว</p>
      )}

      <Button type="submit" disabled={pending || !newUnit.trim() || !validFactor} variant="outline">
        {pending ? 'กำลังแปลง...' : 'แปลงหน่วย'}
      </Button>
    </form>
  )
}
