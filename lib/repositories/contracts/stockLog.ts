export interface StockLogRepository {
  insert(input: {
    product_id: string
    change: number
    reason: string | null
    user_id: string | null
  }): Promise<string | null>
}
