'use client'

import { useState, useEffect } from 'react'
import { fetchAnalyticsRepo } from '@/lib/repositories/fetch/analytics'
import type {
  SalesByRangeSummary,
  VatSummary,
  PurchaseVatSummary,
  TopProduct,
  InventoryValueByCategory,
  StockMovement,
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
    // deps supplied by each specific hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export function useSalesByRange(start: string, end: string, branchId: string | null) {
  return useQuery<SalesByRangeSummary>(
    () => fetchAnalyticsRepo.salesByRange(start, end, { branchId }),
    [start, end, branchId],
  )
}

export function useVatSummary(start: string, end: string, branchId: string | null) {
  return useQuery<[VatSummary, PurchaseVatSummary]>(
    () => Promise.all([
      fetchAnalyticsRepo.vatSummary(start, end, { branchId }),
      fetchAnalyticsRepo.purchaseVatSummary(start, end, { branchId }),
    ]),
    [start, end, branchId],
  )
}

export function useTopProductsRange(days: number, branchId: string | null) {
  return useQuery<TopProduct[]>(
    () => fetchAnalyticsRepo.topProducts(days, 10, { branchId }),
    [days, branchId],
  )
}

export function useInventoryValue(branchId: string | null) {
  return useQuery<InventoryValueByCategory[]>(
    () => fetchAnalyticsRepo.inventoryValueByCategory({ branchId }),
    [branchId],
  )
}

export function useStockMovements(start: string, end: string, branchId: string | null) {
  return useQuery<StockMovement[]>(
    () => fetchAnalyticsRepo.stockMovements({ start, end, branchId, limit: 200 }),
    [start, end, branchId],
  )
}
