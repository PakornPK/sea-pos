import { redirect } from 'next/navigation'
import { getActionUser } from '@/lib/auth'
import type { UserRole } from '@/types/database'

const ROLE_HOME: Record<UserRole, string> = {
  admin:      '/dashboard',
  manager:    '/dashboard',
  cashier:    '/pos',
  purchasing: '/purchasing',
}

export default async function DashboardPage() {
  // proxy.ts already guarantees an authenticated user before we reach here,
  // so we don't need to guard for unauthenticated state.
  const { me } = await getActionUser()
  redirect(ROLE_HOME[me.role] ?? '/inventory')
}
