import type { UserRole } from '@/types/database'

export type UserListRow = {
  id: string
  email: string
  created_at: string
  role: UserRole
  full_name: string | null
}

export interface UserRepository {
  countByCompany(companyId: string): Promise<number>
  /**
   * Platform-admin only: every user across every company.
   * Uses the service role and must NOT be exposed to customer admins.
   */
  listAll(): Promise<UserListRow[]>

  /**
   * Customer-admin safe: only users in the given company.
   */
  listByCompany(companyId: string): Promise<UserListRow[]>

  /**
   * Returns the user's company_id (null for platform admins).
   * Used to verify cross-tenant isolation on every user-mutation action.
   */
  getCompanyId(id: string): Promise<string | null>

  create(input: {
    email: string
    password: string
    role: UserRole
    full_name: string | null
    /** Company the new user will belong to — enforces tenant attachment. */
    companyId: string
  }): Promise<{ id: string } | { error: string }>
  updateProfile(id: string, input: { role: UserRole; full_name: string | null }): Promise<string | null>
  updatePassword(id: string, password: string): Promise<string | null>
  delete(id: string): Promise<string | null>
  forceSignOut(id: string, scope?: 'global' | 'others'): Promise<string | null>
}
