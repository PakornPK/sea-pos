'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = { error: string } | undefined

export function SignupForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(signUp, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company_name">ชื่อร้าน / บริษัท *</Label>
        <Input
          id="company_name"
          name="company_name"
          required
          disabled={pending}
          placeholder="เช่น ร้าน ABC"
          autoComplete="organization"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">ชื่อ-สกุล *</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          disabled={pending}
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">อีเมล *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          disabled={pending}
          autoComplete="email"
        />
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
          autoComplete="new-password"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'กำลังสร้างบัญชี...' : 'สมัครใช้งาน'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        มีบัญชีอยู่แล้ว?{' '}
        <Link href="/login" className="text-primary hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  )
}
