import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLE_HOME: Record<string, string> = {
  admin:      '/inventory',
  manager:    '/inventory',
  cashier:    '/pos',
  purchasing: '/purchasing',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(ROLE_HOME[profile?.role ?? 'cashier'] ?? '/inventory')
}
