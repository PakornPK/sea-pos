'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteCategory, updateCategoryPrefix, updateCategoryVatExempt, updateCategoryType } from '@/lib/actions/categories'
import type { CategoryType } from '@/types/database'

const TYPE_LABELS: Record<CategoryType, string> = {
  sale:   'ขาย (POS)',
  option: 'ตัวเลือก',
  both:   'ทั้งสอง',
}

type Props = {
  id:           string
  name:         string
  prefix:       string | null
  vatExempt:    boolean
  categoryType: CategoryType
}

export function CategoryRow({ id, name, prefix, vatExempt, categoryType }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(prefix ?? '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isExempt, setIsExempt] = useState(vatExempt)
  const [catType, setCatType] = useState<CategoryType>(categoryType)

  function handleTypeChange(next: CategoryType) {
    setCatType(next)
    startTransition(async () => {
      try { await updateCategoryType(id, next) }
      catch (e) {
        setCatType(catType)
        setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
      }
    })
  }

  function toggleVat(next: boolean) {
    setError(null)
    setIsExempt(next)
    startTransition(async () => {
      try { await updateCategoryVatExempt(id, next) }
      catch (e) {
        setIsExempt(!next)
        setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
      }
    })
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateCategoryPrefix(id, draft)
        setEditing(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
      }
    })
  }

  function handleDelete() {
    if (!confirm(`ยืนยันการลบหมวดหมู่ "${name}"?`)) return
    setError(null)
    startTransition(async () => {
      try { await deleteCategory(id) }
      catch (e) { setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ') }
    })
  }

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-card shadow-sm ring-1 ring-border/60 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{name}</span>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="PREFIX"
                maxLength={6}
                className="h-8 w-28"
                style={{ textTransform: 'uppercase' }}
                disabled={pending}
              />
              <Button size="sm" onClick={handleSave} disabled={pending}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraft(prefix ?? '') }} disabled={pending}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <code className="text-xs rounded bg-muted px-2 py-0.5 font-mono">
                {prefix || '— ไม่มีรหัส —'}
              </code>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={handleDelete} disabled={pending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>ประเภท:</span>
        {(Object.keys(TYPE_LABELS) as CategoryType[]).map((val) => (
          <label key={val} className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={`cat-type-${id}`}
              checked={catType === val}
              onChange={() => handleTypeChange(val)}
              disabled={pending}
              className="h-3 w-3"
            />
            {TYPE_LABELS[val]}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={isExempt}
          onChange={(e) => toggleVat(e.target.checked)}
          disabled={pending}
          className="h-3.5 w-3.5"
        />
        ยกเว้น VAT
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
