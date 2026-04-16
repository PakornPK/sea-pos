import type { Metadata } from 'next'
import { requirePage } from '@/lib/auth'
import { EnrollMemberForm } from '@/components/loyalty/EnrollMemberForm'

export const metadata: Metadata = { title: 'สมัครสมาชิก | SEA-POS' }

export default async function EnrollPage() {
  await requirePage()
  return (
    <div className="max-w-lg">
      <h1 className="text-[24px] font-bold tracking-tight mb-6">สมัครสมาชิก</h1>
      <EnrollMemberForm />
    </div>
  )
}
