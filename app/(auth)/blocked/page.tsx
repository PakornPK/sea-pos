import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePage } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'บัญชีของคุณ | SEA-POS',
}

/**
 * Dead-end page shown to users whose company is not `active`. Platform
 * admins never land here because their company_id is null and they are
 * routed elsewhere. Proxy.ts sends traffic here when company.status is
 * pending / suspended / closed.
 */
export default async function BlockedPage() {
  await requirePage()
  const company = await companyRepo.getCurrent()
  const status = company?.status ?? 'pending'

  const message = {
    pending: {
      icon: Clock,
      title: 'บัญชีของคุณกำลังรอการอนุมัติ',
      body:
        'ทีมงาน SEA-POS จะตรวจสอบและเปิดใช้งานบัญชีของคุณภายใน 24 ชั่วโมงทำการ. ' +
        'หากมีคำถาม กรุณาติดต่อทีมสนับสนุน',
    },
    suspended: {
      icon: Lock,
      title: 'บัญชีของคุณถูกระงับชั่วคราว',
      body:
        'บัญชีถูกระงับการใช้งาน. กรุณาติดต่อทีมสนับสนุนเพื่อแก้ไขปัญหาและเปิดใช้งานอีกครั้ง',
    },
    closed: {
      icon: AlertCircle,
      title: 'บัญชีของคุณถูกปิด',
      body:
        'บัญชีนี้ถูกปิดถาวร. หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อทีมสนับสนุน',
    },
    active: {
      icon: AlertCircle,
      title: 'เกิดข้อผิดพลาด',
      body: 'กรุณารีเฟรชหน้า หรือเข้าสู่ระบบใหม่',
    },
  }[status]

  const Icon = message.icon

  return (
    <div className="flex flex-col items-center gap-6 text-center max-w-md">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{message.title}</h1>
        <p className="text-sm text-muted-foreground">{message.body}</p>
      </div>
      {company && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm w-full">
          <div className="flex justify-between">
            <span className="text-muted-foreground">บริษัท</span>
            <span className="font-medium">{company.name}</span>
          </div>
        </div>
      )}
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          ออกจากระบบ
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        <Link href="mailto:support@sea-pos.com" className="underline">
          ติดต่อทีมสนับสนุน
        </Link>
      </p>
    </div>
  )
}
