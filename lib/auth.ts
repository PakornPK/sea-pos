import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type AuthedUser = {
  id: string
  email: string | null
  role: UserRole
  fullName: string | null
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function loadUserRole(
  supabase: SupabaseServerClient
): Promise<AuthedUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role ?? 'cashier') as UserRole,
    fullName: (profile?.full_name as string | null) ?? null,
  }
}

/**
 * For Server Component pages. Redirects to /login if unauthenticated,
 * to / if authenticated but role not allowed.
 * Returns the supabase client + the resolved user.
 */
export async function requirePageRole(allowed: UserRole[]) {
  const supabase = await createClient()
  const me = await loadUserRole(supabase)
  if (!me) redirect('/login')
  if (!allowed.includes(me.role)) redirect('/')
  return { supabase, me }
}

/**
 * For Server Actions. Throws a user-visible Error on failure.
 * Returns the supabase client + the resolved user.
 */
export async function requireActionRole(allowed: UserRole[]) {
  const supabase = await createClient()
  const me = await loadUserRole(supabase)
  if (!me) throw new Error('กรุณาเข้าสู่ระบบใหม่')
  if (!allowed.includes(me.role)) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
  return { supabase, me }
}

/**
 * Same as requireActionRole but returns the role instead of throwing —
 * useful when the action wants to branch behavior by role (e.g., only
 * admin can delete, everyone else returns an error message).
 */
export async function getActionUser() {
  const supabase = await createClient()
  const me = await loadUserRole(supabase)
  if (!me) throw new Error('กรุณาเข้าสู่ระบบใหม่')
  return { supabase, me }
}
