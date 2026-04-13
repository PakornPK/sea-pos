'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/actions/auth'
import { features } from '@/lib/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ActionState = { error: string } | undefined

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signIn, undefined)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">SEA-POS</CardTitle>
      </CardHeader>
      <CardContent>
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
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
          {features.enableSignup && (
            <p className="text-center text-sm text-muted-foreground">
              ยังไม่มีบัญชี?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                สมัครใช้งาน
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
