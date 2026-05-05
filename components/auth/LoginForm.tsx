'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { clientSignIn } from '@/lib/auth-client'
import { features } from '@/lib/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email      = String(fd.get('email') ?? '').trim().toLowerCase()
    const password   = String(fd.get('password') ?? '')
    const rememberMe = fd.get('remember_me') === 'on'
    startTransition(async () => {
      const err = await clientSignIn(email, password, rememberMe)
      if (err) { setError(err); return }
      window.location.href = '/'
    })
  }

  return (
    <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary shadow-lg">
          <ShoppingBag className="h-8 w-8 text-white" strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <h1 className="text-[22px] font-bold tracking-tight">SEA-POS</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">ขายคล่อง จัดการง่าย โตได้จริง</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full rounded-2xl bg-card shadow-sm ring-1 ring-border/70 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={pending}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={pending}
              autoComplete="current-password"
            />
          </div>

          <label className="flex items-center gap-2 text-[13px] text-muted-foreground select-none cursor-pointer">
            <input
              type="checkbox"
              name="remember_me"
              defaultChecked
              disabled={pending}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            จดจำฉันในอุปกรณ์นี้
          </label>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
      </div>

      {features.enableSignup && (
        <p className="text-[13px] text-muted-foreground">
          ยังไม่มีบัญชี?{' '}
          <Link href="/signup/" className="text-primary font-medium hover:underline">
            สมัครใช้งาน
          </Link>
        </p>
      )}
    </div>
  )
}
