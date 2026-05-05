'use client'

import { useEffect } from 'react'
import { refreshAccessToken } from '@/lib/auth-client'

export function TokenRefresher() {
  useEffect(() => {
    const id = setInterval(() => {
      refreshAccessToken().catch(() => {})
    }, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return null
}
