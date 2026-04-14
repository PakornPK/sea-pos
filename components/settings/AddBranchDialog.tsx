'use client'

import { useState, useRef, useEffect } from 'react'
import { useActionState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { createBranch, type BranchState } from '@/lib/actions/branches'

export function AddBranchDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<BranchState, FormData>(createBranch, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setOpen(false)
    }
  }, [state])

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        เพิ่มสาขา
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มสาขาใหม่</DialogTitle>
          <DialogDescription>
            รหัสสาขาใช้ขึ้นต้นเลขใบเสร็จ (เช่น B02-00042)
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3 flex flex-col gap-1">
              <Label htmlFor="new-name">ชื่อสาขา *</Label>
              <Input id="new-name" name="name" required disabled={pending} placeholder="เช่น สาขาสุขุมวิท" />
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              <Label htmlFor="new-code">รหัส *</Label>
              <Input
                id="new-code"
                name="code"
                required
                disabled={pending}
                placeholder="B02"
                style={{ textTransform: 'uppercase' }}
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-address">ที่อยู่</Label>
            <Input id="new-address" name="address" disabled={pending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-phone">เบอร์โทร</Label>
              <Input id="new-phone" name="phone" disabled={pending} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-tax">เลขประจำตัวผู้เสียภาษี</Label>
              <Input id="new-tax" name="tax_id" disabled={pending} />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'กำลังสร้าง...' : 'สร้างสาขา'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  )
}
