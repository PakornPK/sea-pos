'use client'

import { useState, useTransition } from 'react'
import { MapPin, Pencil, Star, StarOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { deleteBranch, setBranchDefault, updateBranch } from '@/lib/actions/branches'
import type { Branch } from '@/types/database'

type Props = {
  branch: Branch
  onMutated?: () => void
}

export function BranchRow({ branch, onMutated }: Props) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)

  function handleSetDefault() {
    setRowError(null)
    startTransition(async () => {
      try { await setBranchDefault(branch.id); onMutated?.() }
      catch (e) { setRowError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') }
    })
  }

  function handleDelete() {
    if (!confirm(`ยืนยันการลบสาขา "${branch.name}"?`)) return
    setRowError(null)
    startTransition(async () => {
      try { await deleteBranch(branch.id); onMutated?.() }
      catch (e) { setRowError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ') }
    })
  }

  function handleUpdate(formData: FormData) {
    setRowError(null)
    startTransition(async () => {
      const result = await updateBranch(undefined, formData)
      if (result?.error) { setRowError(result.error); return }
      onMutated?.()
    })
  }

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-card shadow-sm ring-1 ring-border/60 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{branch.name}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono shrink-0">
                {branch.code}
              </code>
              {branch.is_default && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Star className="h-3 w-3" />
                  เริ่มต้น
                </span>
              )}
            </div>
            {(branch.address || branch.phone || branch.tax_id) && (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {branch.address && <span>{branch.address}</span>}
                {branch.phone && <span>โทร {branch.phone}</span>}
                {branch.tax_id && <span>ผู้เสียภาษี {branch.tax_id}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!branch.is_default && (
            <Button
              size="sm" variant="ghost"
              onClick={handleSetDefault} disabled={pending}
              title="ตั้งเป็นสาขาเริ่มต้น"
            >
              <StarOff className="h-3.5 w-3.5" />
            </Button>
          )}
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
        </div>
      </div>

      {rowError && <p className="text-xs text-destructive">{rowError}</p>}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขสาขา</DialogTitle>
            <DialogDescription>
              รหัสสาขาใช้ขึ้นต้นเลขใบเสร็จ (เช่น {branch.code}-00042)
            </DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={branch.id} />
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 flex flex-col gap-1">
                <Label htmlFor={`name-${branch.id}`}>ชื่อสาขา *</Label>
                <Input id={`name-${branch.id}`} name="name" required defaultValue={branch.name} disabled={pending} />
              </div>
              <div className="col-span-1 flex flex-col gap-1">
                <Label htmlFor={`code-${branch.id}`}>รหัส *</Label>
                <Input
                  id={`code-${branch.id}`}
                  name="code"
                  required
                  defaultValue={branch.code}
                  style={{ textTransform: 'uppercase' }}
                  maxLength={10}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`address-${branch.id}`}>ที่อยู่</Label>
              <Input id={`address-${branch.id}`} name="address" defaultValue={branch.address ?? ''} disabled={pending} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`phone-${branch.id}`}>เบอร์โทร</Label>
                <Input id={`phone-${branch.id}`} name="phone" defaultValue={branch.phone ?? ''} disabled={pending} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`tax-${branch.id}`}>เลขประจำตัวผู้เสียภาษี</Label>
                <Input id={`tax-${branch.id}`} name="tax_id" defaultValue={branch.tax_id ?? ''} disabled={pending} />
              </div>
            </div>
            {rowError && <p className="text-sm text-destructive">{rowError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={pending}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
