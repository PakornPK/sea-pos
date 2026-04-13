'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteCustomer } from '@/lib/actions/customers'

export function CustomerDeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onDelete() {
    if (!confirm(`ยืนยันการลบลูกค้า "${name}"?`)) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteCustomer(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-1 h-4 w-4" />
        ลบลูกค้า
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
