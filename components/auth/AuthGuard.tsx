'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-client'
import type { UserRole } from '@/types/database'

type Props = {
  children: React.ReactNode
  roles?: UserRole[]
}

export function AuthGuard({ children, roles }: Props) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login/')
      return
    }
    if (roles && !user.isPlatformAdmin && !roles.includes(user.role)) {
      router.replace('/')
    }
  }, [loading, user, roles, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null
  if (roles && !user.isPlatformAdmin && !roles.includes(user.role)) return null

  return <>{children}</>
}
