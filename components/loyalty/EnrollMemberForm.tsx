'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { enrollMember } from '@/lib/actions/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EnrollMemberForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(enrollMember, undefined)

  useEffect(() => {
    if (state?.success && state.id) {
      router.push(`/members/${state.id}`)
    }
  }, [state, router])

  return (
    <form action={formAction} className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
      <div className="flex items-center gap-2 bg-primary/5 border-b border-primary/20 px-5 py-3">
        <UserPlus className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-[14px]">ข้อมูลสมาชิก</span>
      </div>

      <div className="p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enroll-name">ชื่อ-สกุล *</Label>
            <Input id="enroll-name" name="name" required disabled={pending} placeholder="สมชาย ใจดี" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enroll-phone">โทรศัพท์</Label>
            <Input id="enroll-phone" name="phone" type="tel" disabled={pending} placeholder="08x-xxx-xxxx" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enroll-email">อีเมล</Label>
          <Input id="enroll-email" name="email" type="email" disabled={pending} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enroll-addr">ที่อยู่</Label>
          <Input id="enroll-addr" name="address" disabled={pending} />
        </div>

{state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          {pending ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </Button>
      </div>
    </form>
  )
}
