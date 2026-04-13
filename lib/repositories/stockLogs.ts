import type { DB } from './types'

export const stockLogRepo = {
  async insert(
    db: DB,
    input: {
      product_id: string
      change: number
      reason: string | null
      user_id: string | null
    }
  ): Promise<string | null> {
    const { error } = await db.from('stock_logs').insert(input)
    return error?.message ?? null
  },
}
