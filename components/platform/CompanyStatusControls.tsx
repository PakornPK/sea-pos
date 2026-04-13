'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Lock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setCompanyStatus } from '@/lib/actions/platform'
import type { CompanyStatus } from '@/types/database'

type Props = {
  companyId: string
  currentStatus: CompanyStatus
}

export function CompanyStatusControls({ companyId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function apply(next: CompanyStatus, confirmMsg: string) {
    if (!confirm(confirmMsg)) return
    setError(null)
    startTransition(async () => {
      try {
        await setCompanyStatus(companyId, next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ไม่สำเร็จ')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentStatus !== 'active' && (
          <Button
            size="sm"
            onClick={() => apply('active', 'เปิดใช้งานบริษัทนี้?')}
            disabled={pending}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            เปิดใช้งาน
          </Button>
        )}
        {currentStatus !== 'suspended' && currentStatus !== 'closed' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => apply('suspended', 'ระงับบริษัทนี้ชั่วคราว?')}
            disabled={pending}
            className="text-destructive"
          >
            <Lock className="mr-1 h-4 w-4" />
            ระงับชั่วคราว
          </Button>
        )}
        {currentStatus !== 'closed' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => apply('closed', 'ปิดบริษัทนี้ถาวร? การดำเนินการนี้ส่งผลให้ผู้ใช้ทุกคนในบริษัทไม่สามารถเข้าใช้งานได้อีก')}
            disabled={pending}
            className="text-destructive"
          >
            <XCircle className="mr-1 h-4 w-4" />
            ปิดถาวร
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {currentStatus === 'pending'  && 'บริษัทกำลังรออนุมัติ ผู้ใช้ในบริษัทเห็นหน้า "รออนุมัติ" จนกว่าจะเปิดใช้งาน'}
        {currentStatus === 'active'   && 'บริษัทใช้งานได้ตามปกติ'}
        {currentStatus === 'suspended' && 'บริษัทถูกระงับ ผู้ใช้ไม่สามารถเข้าใช้งานได้'}
        {currentStatus === 'closed'   && 'บริษัทถูกปิดถาวร'}
      </p>
    </div>
  )
}
