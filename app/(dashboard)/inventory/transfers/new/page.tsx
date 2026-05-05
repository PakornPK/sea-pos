'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { TransferCreateForm } from '@/components/inventory/TransferCreateForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getTransferFormData, type TransferFormData } from '@/lib/actions/stockTransfers'

export default function NewTransferPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState<TransferFormData | null>(null)

  useEffect(() => {
    if (!user) return
    getTransferFormData(user.activeBranchId).then(setFormData)
  }, [user])

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/transfers/"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">สร้างรายการโอน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ย้ายสินค้าจากสาขาปัจจุบันไปสาขาอื่น
          </p>
        </div>
      </div>

      {formData && (
        <TransferCreateForm
          fromBranch={formData.fromBranch}
          toBranchCandidates={formData.toBranchCandidates}
          productsAtSource={formData.productsAtSource}
        />
      )}
    </div>
  )
}
