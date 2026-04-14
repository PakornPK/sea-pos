import type { Branch, BranchInsert } from '@/types/database'

/**
 * BranchRepository — manages physical store locations under a company.
 *
 * Tenancy model: branches sit under `companies`. RLS restricts:
 *   - company admins see every branch in their company
 *   - branch-scoped roles (manager/cashier/purchasing) see only branches
 *     listed in `user_branches` for their user id
 *   - platform admins see everything
 */
export interface BranchRepository {
  /** Branches the current user can see (RLS filters). */
  list(): Promise<Branch[]>

  /** All branches in a company — admin-only use (service role). */
  listForCompany(companyId: string): Promise<Branch[]>

  getById(id: string): Promise<Branch | null>

  /** The branch flagged `is_default = true` for a company. */
  getDefaultForCompany(companyId: string): Promise<Branch | null>

  /** Branches a specific user is assigned to. */
  listBranchesForUser(userId: string): Promise<Branch[]>

  /** Bulk version for the users admin page: one map lookup per user. */
  listAssignmentsForCompany(companyId: string): Promise<Array<{
    user_id:       string
    branch_id:     string
    is_default:    boolean
  }>>

  /** Number of branches in a company — used against plans.max_branches. */
  countForCompany(companyId: string): Promise<number>

  create(input: BranchInsert): Promise<{ id: string } | { error: string }>
  update(id: string, input: Partial<BranchInsert>): Promise<string | null>

  /** Atomically flip the `is_default` flag — one default per company. */
  setDefault(id: string): Promise<string | null>

  /**
   * Delete a branch. Rejects if the branch has any sales, purchase orders,
   * stock, or stock-log rows attached.
   */
  delete(id: string): Promise<string | null>

  // ─── User ↔ branch assignment ─────────────────────────────────
  assignUser(input: {
    userId: string
    branchId: string
    isDefault?: boolean
  }): Promise<string | null>

  unassignUser(userId: string, branchId: string): Promise<string | null>

  /** Replace a user's branch set in one shot (adds/removes diff). */
  setUserBranches(input: {
    userId: string
    branchIds: string[]
    defaultBranchId: string | null
  }): Promise<string | null>
}
