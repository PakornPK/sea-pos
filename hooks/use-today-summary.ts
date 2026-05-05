'use client'

import { useState, useEffect } from 'react'
import { fetchAnalyticsRepo } from '@/lib/repositories/fetch/analytics'
import type { TodaySummary } from '@/lib/repositories/contracts'

export function useTodaySummary(branchId?: string | null) {
  const [data, setData]       = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAnalyticsRepo
      .todaySummary({ branchId })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [branchId])

  return { data, loading, error }
}
