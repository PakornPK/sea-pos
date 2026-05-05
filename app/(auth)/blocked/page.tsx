'use client'

import Link from 'next/link'
import { AlertCircle, Clock, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

const MESSAGES = {
  pending: {
    icon: Clock,
    title: 'บัญชีของคุณกำลังรอการอนุมัติ',
    body: 'ทีมงาน SEA-POS จะตรวจสอบและเปิดใช้งานบัญชีของคุณภายใน 24 ชั่วโมงทำการ. หากมีคำถาม กรุณาติดต่อทีมสนับสนุน',
  },
  suspended: {
    icon: Lock,
    title: 'บัญชีของคุณถูกระงับชั่วคราว',
    body: 'บัญชีถูกระงับการใช้งาน. กรุณาติดต่อทีมสนับสนุนเพื่อแก้ไขปัญหาและเปิดใช้งานอีกครั้ง',
  },
  closed: {
    icon: AlertCircle,
    title: 'บัญชีของคุณถูกปิด',
    body: 'บัญชีนี้ถูกปิดถาวร. หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อทีมสนับสนุน',
  },
  active: {
    icon: AlertCircle,
    title: 'เกิดข้อผิดพลาด',
    body: 'กรุณารีเฟรชหน้า หรือเข้าสู่ระบบใหม่',
  },
} as const

export default function BlockedPage() {
  const { signOut } = useAuth()
  const message = MESSAGES['pending']
  const Icon = message.icon

  return (
    <div className="flex flex-col items-center gap-6 text-center max-w-md">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-[22px] font-bold tracking-tight">{message.title}</h1>
        <p className="text-sm text-muted-foreground">{message.body}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => { void signOut() }}>
        ออกจากระบบ
      </Button>
      <p className="text-xs text-muted-foreground">
        <Link href="mailto:support@sea-pos.com" className="underline">
          ติดต่อทีมสนับสนุน
        </Link>
      </p>
    </div>
  )
}
