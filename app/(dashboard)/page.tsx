import { redirect } from 'next/navigation'
import { getActionUser } from '@/lib/auth'
import type { UserRole } from '@/types/database'

const ROLE_HOME: Record<UserRole, string> = {
  admin:      '/inventory',
  manager:    '/inventory',
  cashier:    '/pos',
  purchasing: '/purchasing',
}

export default async function DashboardPage() {
  try {
    const { me } = await getActionUser()
    redirect(ROLE_HOME[me.role] ?? '/inventory')
  } catch {
    redirect('/login')
  }
}
