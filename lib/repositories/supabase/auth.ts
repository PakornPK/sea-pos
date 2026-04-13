import type { AuthRepository } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseAuthRepo: AuthRepository = {
  async signInWithPassword(credentials): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.auth.signInWithPassword(credentials)
    return error?.message ?? null
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
