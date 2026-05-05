'use client'

import { useAuth } from '@/lib/auth-client'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { MembersSection } from '@/components/loyalty/MembersSection'
import { buttonVariants } from '@/components/ui/button'
import { ImportButton } from '@/components/import/ImportButton'
import { cn } from '@/lib/utils'

export default function MembersPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">สมาชิก</h1>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton type="members" />
          <Link href="/members/enroll" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
            <UserPlus className="h-3.5 w-3.5" />
            สมัครสมาชิก
          </Link>
        </div>
      </div>

      <MembersSection />
    </div>
  )
}
