'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteCategory, updateCategoryPrefix } from '@/lib/actions/categories'

type Props = {
  id: string
  name: string
  prefix: string | null
}

export function CategoryRow({ id, name, prefix }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(prefix ?? '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex flex-col gap-1 rounded-lg border px-4 py-3">
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
