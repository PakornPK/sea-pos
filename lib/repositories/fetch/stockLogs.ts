import type { StockLogRepository } from '@/lib/repositories/contracts'
import { restPost } from '@/lib/api/rest'

export const fetchStockLogRepo: StockLogRepository = {
  async insert(input): Promise<string | null> {
    try {
      await restPost('stock_logs', input)
      return null
    } catch (e) {
      return String(e)
    }
  },
}
