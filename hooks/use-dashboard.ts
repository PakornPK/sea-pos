'use client'

import { useState, useEffect } from 'react'
import { fetchAnalyticsRepo } from '@/lib/repositories/fetch/analytics'
import type {
  DailySeriesPoint,
  PaymentMixPoint,
  TopProduct,
  LowStockItem,
  RecentSale,
} from '@/lib/repositories'

type QueryState<T> = { data: T | null; loading: boolean; error: string | null }

function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null })
  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null })
    fn()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((e: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ' })
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export function useDailySeries(days: number, branchId: string | null) {
  return useQuery<DailySeriesPoint[]>(
    () => fetchAnalyticsRepo.dailySeries(days, { branchId }),
    [days, branchId],
  )
}

export function usePaymentMix(days: number, branchId: string | null) {
  return useQuery<PaymentMixPoint[]>(
    () => fetchAnalyticsRepo.paymentMix(days, { branchId }),
    [days, branchId],
  )
}

export function useDashboardTopProducts(days: number, limit: number, branchId: string | null) {
  return useQuery<TopProduct[]>(
    () => fetchAnalyticsRepo.topProducts(days, limit, { branchId }),
    [days, limit, branchId],
  )
}

export function useLowStock(threshold: number, branchId: string | null) {
  return useQuery<LowStockItem[]>(
    () => fetchAnalyticsRepo.lowStock(threshold, { branchId }),
    [threshold, branchId],
  )
}

export function useRecentSales(limit: number, branchId: string | null) {
  return useQuery<RecentSale[]>(
    () => fetchAnalyticsRepo.recentSales(limit, { branchId }),
    [limit, branchId],
  )
}
