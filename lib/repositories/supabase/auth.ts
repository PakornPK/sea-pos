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
}
