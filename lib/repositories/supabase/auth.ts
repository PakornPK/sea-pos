import type { AuthRepository } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseAuthRepo: AuthRepository = {
  async signInWithPassword(credentials, rememberMe = true): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.auth.signInWithPassword(credentials)
    if (error) return error.message

    // When "remember me" is off, strip maxAge from the Supabase auth cookies
    // so they become session cookies that expire on browser close.
    if (!rememberMe) {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const authCookies = cookieStore.getAll().filter((c) => c.name.startsWith('sb-'))
      for (const c of authCookies) {
        cookieStore.set(c.name, c.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          // No maxAge → session cookie; expires when browser is closed
        })
      }
    }
    return null
  },

  async signOut(): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.auth.signOut()
    return error?.message ?? null
  },

  async signUp(input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // handle_new_user trigger reads these
        data: {
          full_name:    input.fullName,
          company_name: input.companyName,
          // role intentionally omitted — trigger sets 'admin' when no
          // company_id is passed (self-serve path).
        },
      },
    })
    return error?.message ?? null
  },
}
