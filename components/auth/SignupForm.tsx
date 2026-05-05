'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { clientSignUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email       = String(fd.get('email') ?? '').trim().toLowerCase()
    const password    = String(fd.get('password') ?? '')
    const fullName    = String(fd.get('full_name') ?? '').trim()
    const companyName = String(fd.get('company_name') ?? '').trim()

    if (!email)       { setError('กรุณาระบุอีเมล'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return }
    if (password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    if (!fullName)    { setError('กรุณาระบุชื่อ-สกุล'); return }
    if (!companyName) { setError('กรุณาระบุชื่อร้าน/บริษัท'); return }

    startTransition(async () => {
      const err = await clientSignUp(email, password, fullName, companyName)
      if (err) { setError(err); return }
      window.location.href = '/'
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'กำลังสร้างบัญชี...' : 'สมัครใช้งาน'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        มีบัญชีอยู่แล้ว?{' '}
        <Link href="/login/" className="text-primary hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  )
}
