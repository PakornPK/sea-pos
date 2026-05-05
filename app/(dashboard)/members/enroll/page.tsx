'use client'

import { useAuth } from '@/lib/auth-client'
import { EnrollMemberForm } from '@/components/loyalty/EnrollMemberForm'

export default function EnrollPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="max-w-lg">
      <h1 className="text-[24px] font-bold tracking-tight mb-6">สมัครสมาชิก</h1>
      <EnrollMemberForm />
    </div>
  )
}
