'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { getNewPOFormData, type NewPOFormData } from '@/lib/actions/purchasing'
import { POForm } from '@/components/purchasing/POForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NewPOPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState<NewPOFormData | null>(null)

  useEffect(() => {
    if (!user) return
    getNewPOFormData().then(setFormData)
  }, [user])

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/purchasing/"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight">สร้างใบสั่งซื้อ</h1>
      </div>

      {formData && (
        formData.suppliers.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-6 text-center">
            <p className="text-muted-foreground">
              ยังไม่มีผู้จำหน่ายในระบบ{' '}
              <Link href="/purchasing/suppliers/" className="text-primary underline">
                เพิ่มผู้จำหน่ายก่อน
              </Link>
            </p>
          </div>
        ) : (
          <POForm
            suppliers={formData.suppliers}
            products={formData.products}
            categories={formData.categories}
            branches={formData.branches}
            activeBranchId={user.activeBranchId}
            vatConfig={formData.vatConfig}
          />
        )
      )}
    </div>
  )
}
