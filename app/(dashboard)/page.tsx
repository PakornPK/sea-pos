'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-client'
import type { UserRole } from '@/types/database'

const ROLE_HOME: Record<UserRole, string> = {
  admin:      '/dashboard/',
  manager:    '/dashboard/',
  cashier:    '/pos/',
  purchasing: '/purchasing/',
}

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return
    if (user.isPlatformAdmin) router.replace('/platform/companies/')
    else router.replace(ROLE_HOME[user.role] ?? '/inventory/')
  }, [loading, user, router])

  return null
}
