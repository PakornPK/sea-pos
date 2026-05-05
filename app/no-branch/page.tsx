'use client'

import Link from 'next/link'
import { MapPinOff } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-client'

export default function NoBranchPage() {
  const { signOut } = useAuth()

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
        <MapPinOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[22px] font-bold tracking-tight">ยังไม่ได้กำหนดสาขา</h1>
        <p className="text-sm text-muted-foreground">
          บัญชีของคุณยังไม่ถูกมอบหมายให้กับสาขาใด กรุณาติดต่อผู้ดูแลระบบ
          ของบริษัทเพื่อขอเพิ่มสิทธิ์เข้าถึงสาขา
        </p>
      </div>
      <button
        type="button"
        onClick={() => { void signOut() }}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        ออกจากระบบ
      </button>
      <p className="text-xs text-muted-foreground">
        ผู้ดูแลสามารถมอบหมายสาขาได้ที่{' '}
        <Link href="/users/" className="underline underline-offset-2 hover:text-foreground">
          หน้าผู้ใช้งาน
        </Link>
      </p>
    </div>
  )
}
