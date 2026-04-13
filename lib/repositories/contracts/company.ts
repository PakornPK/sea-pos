import type { Company } from '@/types/database'

export interface CompanyRepository {
  /** Returns the current user's company (resolved via RLS). */
  getCurrent(): Promise<Company | null>
  getById(id: string): Promise<Company | null>
  updateSettings(id: string, settings: Record<string, unknown>): Promise<string | null>
  updateName(id: string, name: string): Promise<string | null>
}
