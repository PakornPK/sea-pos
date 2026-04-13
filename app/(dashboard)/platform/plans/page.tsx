import type { Metadata } from 'next'
import { requirePlatformAdmin } from '@/lib/auth'
import { planRepo } from '@/lib/repositories'
import { PlanEditor } from '@/components/platform/PlanEditor'

export const metadata: Metadata = {
  title: 'แพ็กเกจ | SEA-POS Platform',
}

export default async function PlansPage() {
  await requirePlatformAdmin()
  const plans = await planRepo.listAll()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">จัดการแพ็กเกจ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          กำหนดชื่อ ราคา และขีดจำกัดของแต่ละแพ็กเกจ. การเปลี่ยนแปลงมีผลกับบริษัทที่อยู่ในแพ็กเกจนั้นทันที
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((p) => (
          <PlanEditor key={p.code} plan={p} />
        ))}
      </div>
    </div>
  )
}
