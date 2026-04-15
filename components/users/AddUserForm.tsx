'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { createUser } from '@/lib/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { BranchMultiSelect } from '@/components/users/BranchMultiSelect'
import { ROLE_LABELS } from '@/lib/labels'
import type { Branch, UserRole } from '@/types/database'

const ROLE_OPTIONS: { value: UserRole; label: string }[] =
  (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }))

type Props = { branches: Branch[] }

export function AddUserForm({ branches }: Props) {
  const [state, formAction, pending] = useActionState(createUser, undefined)
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Collapse form + reset fields after a successful createUser submission.
    if (state?.success) {
      formRef.current?.reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
  }, [state])

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" className="self-start">
        <UserPlus className="mr-1 h-4 w-4" />
        เพิ่มผู้ใช้งาน
      </Button>
    )
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">เพิ่มผู้ใช้งานใหม่</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ยกเลิก
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">อีเมล *</Label>
          <Input id="email" name="email" type="email" required disabled={pending} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">รหัสผ่าน *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">ชื่อ-สกุล</Label>
          <Input id="full_name" name="full_name" disabled={pending} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">บทบาท *</Label>
          <NativeSelect id="role" name="role" required disabled={pending} defaultValue="cashier">
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>สาขาที่มอบหมาย *</Label>
        <BranchMultiSelect branches={branches} disabled={pending} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้งาน'}
      </Button>
    </form>
  )
}
