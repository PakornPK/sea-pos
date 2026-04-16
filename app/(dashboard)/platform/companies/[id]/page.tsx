import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth'
import { companyRepo, planRepo, billingRepo } from '@/lib/repositories'
import { CompanyStatusControls } from '@/components/platform/CompanyStatusControls'
import { CompanyPlanControls } from '@/components/platform/CompanyPlanControls'
import { CompanyBillingSection } from '@/components/platform/CompanyBillingSection'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import type { CompanyStatus } from '@/types/database'

export const metadata: Metadata = {
  title: 'รายละเอียดบริษัท | SEA-POS Platform',
}

const STATUS_LABEL: Record<CompanyStatus, string> = {
  pending:   'รออนุมัติ',
  active:    'ใช้งานอยู่',
  suspended: 'ระงับ',
  closed:    'ปิด',
}

const STATUS_VARIANT: Record<CompanyStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending:   'outline',
  active:    'secondary',
  suspended: 'destructive',
  closed:    'destructive',
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePlatformAdmin()

  const [company, plans, subscription, invoices] = await Promise.all([
    companyRepo.getById(id),
    planRepo.listActive(),
    billingRepo.getSubscriptionByCompany(id),
    billingRepo.listInvoices({ companyId: id }),
  ])
  if (!company) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/companies"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-tight">{company.name}</h1>
          <Badge variant={STATUS_VARIANT[company.status]}>
            {STATUS_LABEL[company.status]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <InfoCard label="Company ID" value={company.id} mono />
        <InfoCard label="สร้างเมื่อ" value={formatDateTime(company.created_at)} />
        <InfoCard label="Slug" value={company.slug ?? '—'} mono />
        <InfoCard label="แพ็กเกจปัจจุบัน" value={company.plan} />
      </div>

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
        <h2 className="font-semibold text-sm mb-3">แพ็กเกจ</h2>
        <CompanyPlanControls
          companyId={company.id}
          currentPlan={company.plan}
          plans={plans}
        />
      </div>

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 max-w-3xl">
        <h2 className="font-semibold text-sm mb-3">จัดการสถานะ</h2>
        <CompanyStatusControls companyId={company.id} currentStatus={company.status} />
      </div>

      <CompanyBillingSection
        company={company}
        subscription={subscription}
        invoices={invoices}
      />
    </div>
  )
}

function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-4">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-[14px]', mono && 'font-mono text-[12px] break-all')}>{value}</p>
    </div>
  )
}
