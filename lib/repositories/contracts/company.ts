import type { Company, CompanyPlan, CompanyStatus } from '@/types/database'

export type CompanyListRow = Company & {
  owner_email: string | null
  user_count: number
}

export interface CompanyRepository {
  /** Returns the current user's company (resolved via RLS). */
  getCurrent(): Promise<Company | null>
  getById(id: string): Promise<Company | null>
  updateSettings(id: string, settings: Record<string, unknown>): Promise<string | null>
  updateName(id: string, name: string): Promise<string | null>

  // ─── Platform-admin ops (bypass tenant filter via service role) ─────
  listAll(): Promise<CompanyListRow[]>
  setStatus(id: string, status: CompanyStatus): Promise<string | null>
  setPlan(id: string, plan: CompanyPlan): Promise<string | null>
  /**
   * Platform admin creates a new company and its initial admin user.
   * Uses the service-role admin client to bypass RLS so it works in
   * invite-only mode where public signup is disabled.
   */
  createWithOwner(input: {
    name: string
    ownerEmail: string
    ownerPassword: string
    ownerFullName: string
  }): Promise<{ companyId: string; userId: string } | { error: string }>
}
