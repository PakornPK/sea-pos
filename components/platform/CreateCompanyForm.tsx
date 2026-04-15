'use client'

import { useActionState } from 'react'
import { createCompany } from '@/lib/actions/platform'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState(createCompany, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-xl">
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
        <h2 className="font-semibold text-sm">ข้อมูลบริษัท</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">ชื่อบริษัท *</Label>
          <Input id="name" name="name" required disabled={pending} />
        </div>
      </section>

      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
        <h2 className="font-semibold text-sm">บัญชีผู้ดูแลคนแรก</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">ชื่อ-สกุล *</Label>
            <Input id="full_name" name="full_name" required disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">อีเมล *</Label>
            <Input id="email" name="email" type="email" required disabled={pending} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">รหัสผ่าน *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            disabled={pending}
            placeholder="อย่างน้อย 8 ตัวอักษร"
          />
          <p className="text-xs text-muted-foreground">
            บอกรหัสผ่านนี้ให้ลูกค้าเพื่อเข้าสู่ระบบครั้งแรก
          </p>
        </div>
      </section>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังสร้าง...' : 'สร้างบริษัท'}
        </Button>
      </div>
    </form>
  )
}
