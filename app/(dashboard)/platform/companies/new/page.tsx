'use client'

import { useAuth } from '@/lib/auth-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CreateCompanyForm } from '@/components/platform/CreateCompanyForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NewCompanyPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/companies"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">เพิ่มบริษัทใหม่</h1>
          <p className="text-sm text-muted-foreground mt-1">
            สร้างบริษัทพร้อมบัญชีผู้ดูแล (admin) คนแรก
          </p>
        </div>
      </div>

      <CreateCompanyForm />
    </div>
  )
}
