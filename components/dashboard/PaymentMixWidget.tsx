'use client'

import { usePaymentMix } from '@/hooks/use-dashboard'
import { PaymentMixDonut } from '@/components/dashboard/PaymentMixDonut'
import { Skeleton } from '@/components/ui/skeleton'

interface Props { branchId: string | null }

export function PaymentMixWidget({ branchId }: Props) {
  const { data, loading, error } = usePaymentMix(30, branchId)

  if (loading) return <Skeleton className="h-[270px] rounded-2xl" />
  if (error || !data) return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
  return <PaymentMixDonut data={data} />
}
