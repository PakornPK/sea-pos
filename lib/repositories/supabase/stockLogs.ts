import type { StockLogRepository } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseStockLogRepo: StockLogRepository = {
  async insert(input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('stock_logs').insert(input)
    return error?.message ?? null
  },
}
