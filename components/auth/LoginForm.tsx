'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { signIn } from '@/lib/actions/auth'
import { features } from '@/lib/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = { error: string } | undefined

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signIn, undefined)

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
      <div className="w-full rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.06] p-6">
        <form action={formAction} className="flex flex-col gap-4">
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

          {state?.error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {state.error}
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
          <Link href="/signup" className="text-primary font-medium hover:underline">
            สมัครใช้งาน
          </Link>
        </p>
      )}
    </div>
  )
}
