import type { DB } from './types'

export const authRepo = {
  async signInWithPassword(
    db: DB,
    credentials: { email: string; password: string }
  ): Promise<string | null> {
    const { error } = await db.auth.signInWithPassword(credentials)
    return error?.message ?? null
  },

  async signOut(db: DB): Promise<string | null> {
    const { error } = await db.auth.signOut()
    return error?.message ?? null
  },
}
