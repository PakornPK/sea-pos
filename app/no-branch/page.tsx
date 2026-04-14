import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPinOff } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'

export const metadata: Metadata = {
  title: 'ไม่มีสาขา | SEA-POS',
}

export default function NoBranchPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
        <MapPinOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">ยังไม่ได้กำหนดสาขา</h1>
        <p className="text-sm text-muted-foreground">
          บัญชีของคุณยังไม่ถูกมอบหมายให้กับสาขาใด กรุณาติดต่อผู้ดูแลระบบ
          ของบริษัทเพื่อขอเพิ่มสิทธิ์เข้าถึงสาขา
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          ออกจากระบบ
        </button>
      </form>
      <p className="text-xs text-muted-foreground">
        ผู้ดูแลสามารถมอบหมายสาขาได้ที่{' '}
        <Link href="/users" className="underline underline-offset-2 hover:text-foreground">
          หน้าผู้ใช้งาน
        </Link>
      </p>
    </div>
  )
}
