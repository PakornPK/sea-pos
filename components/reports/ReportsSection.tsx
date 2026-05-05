'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseDateRange } from '@/lib/daterange'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { getVatConfig, DEFAULT_VAT_CONFIG } from '@/lib/vat'
import { companyRepo } from '@/lib/repositories'
import type { UserRole } from '@/types/database'
import type { VatConfig } from '@/lib/vat'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { SalesSummarySection } from '@/components/reports/SalesSummarySection'
import { VatReportSection } from '@/components/reports/VatReportSection'
import { TopProductsSection } from '@/components/reports/TopProductsSection'
import { InventoryValueSection } from '@/components/reports/InventoryValueSection'
import { StockMovementSection } from '@/components/reports/StockMovementSection'
import { CostStructureReport } from '@/components/reports/CostStructureReport'

interface Props {
  role: UserRole
  companyId: string | null
  activeBranchId: string | null
  branchIds: string[]
  isPlatformAdmin: boolean
}

function humanRange(matchingPreset: number | null, startDate: string, endDate: string): string {
  if (matchingPreset) return `${matchingPreset} วันล่าสุด`
  return `${startDate}  ถึง  ${endDate}`
}

export function ReportsSection({ role, companyId, activeBranchId, branchIds, isPlatformAdmin }: Props) {
  const searchParams = useSearchParams()
  const sp = {
    start:        searchParams.get('start')        ?? undefined,
    end:          searchParams.get('end')           ?? undefined,
    branch:       searchParams.get('branch')        ?? undefined,
    cost_product: searchParams.get('cost_product')  ?? undefined,
  }

  const range = parseDateRange(sp)
  const meForFilter = { role, companyId, activeBranchId, branchIds, isPlatformAdmin, id: '', email: null, fullName: null }
  const branchId = resolveBranchFilter(meForFilter, sp.branch)
  const isAdmin = role === 'admin' || isPlatformAdmin
  const isAllBranches = branchId === null
  const costProductId = sp.cost_product ?? null
  const days = range.matchingPreset ?? 30

  const [vatConfig, setVatConfig] = useState<VatConfig>(DEFAULT_VAT_CONFIG)
  useEffect(() => {
    if (!companyId) return
    companyRepo.getById(companyId)
      .then((c) => setVatConfig(getVatConfig(c)))
      .catch(() => {})
  }, [companyId])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">รายงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">{humanRange(range.matchingPreset, range.startDate, range.endDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <BranchScopeToggle
              basePath="/reports"
              searchParams={sp}
              isAllBranches={isAllBranches}
              activeBranchLabel={null}
            />
          )}
          <DateRangePicker
            currentStart={range.startDate}
            currentEnd={range.endDate}
            activePreset={range.matchingPreset}
          />
        </div>
      </div>

      <SalesSummarySection
        start={range.startIso}
        end={range.endIso}
        startDate={range.startDate}
        endDate={range.endDate}
        branchId={branchId}
      />

      {vatConfig.mode !== 'none' && (
        <VatReportSection
          start={range.startIso}
          end={range.endIso}
          startDate={range.startDate}
          endDate={range.endDate}
          branchId={branchId}
          vatConfig={vatConfig}
        />
      )}

      <TopProductsSection days={days} branchId={branchId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InventoryValueSection branchId={branchId} />
        <StockMovementSection
          start={range.startIso}
          end={range.endIso}
          startDate={range.startDate}
          endDate={range.endDate}
          branchId={branchId}
        />
      </div>

      <CostStructureReport selectedProductId={costProductId} />
    </div>
  )
}
