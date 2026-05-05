'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-client'
import { planRepo } from '@/lib/repositories'
import { PlanEditor } from '@/components/platform/PlanEditor'
import { CreatePlanForm } from '@/components/platform/CreatePlanForm'

type PlanWithUsage = Awaited<ReturnType<typeof planRepo.listAllWithUsage>>[number]

export default function PlansPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<PlanWithUsage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    planRepo.listAllWithUsage()
      .then((d) => { setPlans(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user || loading) return null

  const totalCompanies = plans.reduce((s, p) => s + p.company_count, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">จัดการแพ็กเกจ</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            กำหนดชื่อ ราคา และขีดจำกัดของแต่ละแพ็กเกจ — มีผลทันทีกับบริษัทที่อยู่ในแพ็กเกจนั้น
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[26px] font-bold tabular-nums tracking-tight">{plans.length}</span>
          <span className="text-[12px] text-muted-foreground">แพ็กเกจทั้งหมด · {totalCompanies} บริษัท</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((p) => (
          <PlanEditor key={p.code} plan={p} />
        ))}
        <CreatePlanForm />
      </div>
    </div>
  )
}
