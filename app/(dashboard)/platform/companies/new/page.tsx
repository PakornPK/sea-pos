import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth'
import { CreateCompanyForm } from '@/components/platform/CreateCompanyForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'เพิ่มบริษัทใหม่ | SEA-POS Platform',
}

export default async function NewCompanyPage() {
  await requirePlatformAdmin()

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
          <h1 className="text-2xl font-semibold">เพิ่มบริษัทใหม่</h1>
          <p className="text-sm text-muted-foreground mt-1">
            สร้างบริษัทพร้อมบัญชีผู้ดูแล (admin) คนแรก
          </p>
        </div>
      </div>

      <CreateCompanyForm />
    </div>
  )
}
