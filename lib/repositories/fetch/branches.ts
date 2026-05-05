import type { Branch, BranchInsert } from '@/types/database'
import type { BranchRepository } from '@/lib/repositories/contracts'
import { restGet, restPost, restPatch, restPatchById, restDelete, restDeleteById } from '@/lib/api/rest'

export const fetchBranchRepo: BranchRepository = {
  async list(): Promise<Branch[]> {
    return restGet<Branch[]>('branches', { order: ['is_default.desc', 'name.asc'] })
  },

  async listForCompany(_companyId: string): Promise<Branch[]> {
    // backend filters by tenant from JWT
    return restGet<Branch[]>('branches', { order: ['is_default.desc', 'name.asc'] })
  },

  async getById(id: string): Promise<Branch | null> {
    const rows = await restGet<Branch[]>('branches', { id: `eq.${id}`, limit: '1' })
    return rows[0] ?? null
  },

  async getDefaultForCompany(_companyId: string): Promise<Branch | null> {
    const rows = await restGet<Branch[]>('branches', {
      is_default: 'eq.true',
      limit:      '1',
    })
    return rows[0] ?? null
  },

  async listBranchesForUser(userId: string): Promise<Branch[]> {
    const rows = await restGet<Array<{ branch: Branch | Branch[] | null }>>('user_branches', {
      select:  'branch:branches(*)',
      user_id: `eq.${userId}`,
    })
    return rows
      .map((r) => (Array.isArray(r.branch) ? r.branch[0] : r.branch))
      .filter((b): b is Branch => !!b)
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name))
  },

  async listAssignmentsForCompany(_companyId: string) {
    return restGet<Array<{ user_id: string; branch_id: string; is_default: boolean }>>('user_branches', {
      select: 'user_id,branch_id,is_default',
    })
  },

  async countForCompany(_companyId: string): Promise<number> {
    const rows = await restGet<Branch[]>('branches', { select: 'id' })
    return rows.length
  },

  async create(input: BranchInsert): Promise<{ id: string } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('branches', input)
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      if (!row?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async update(id: string, input: Partial<BranchInsert>): Promise<string | null> {
    try {
      await restPatchById('branches', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async setDefault(id: string): Promise<string | null> {
    try {
      // Clear existing default via query filter, then set new one by ID
      await restPatch('branches', { is_default: 'eq.true' }, { is_default: false })
      await restPatchById('branches', id, { is_default: true })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async delete(id: string): Promise<string | null> {
    try {
      await restDeleteById('branches', id)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async assignUser({ userId, branchId, isDefault = false }): Promise<string | null> {
    try {
      if (isDefault) {
        await restPatch('user_branches', { user_id: `eq.${userId}`, is_default: 'eq.true' }, { is_default: false })
      }
      await restPost('user_branches', { user_id: userId, branch_id: branchId, is_default: isDefault })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async unassignUser(userId: string, branchId: string): Promise<string | null> {
    try {
      await restDelete('user_branches', { user_id: `eq.${userId}`, branch_id: `eq.${branchId}` })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async setUserBranches({ userId, branchIds, defaultBranchId }): Promise<string | null> {
    try {
      if (branchIds.length === 0) {
        await restDelete('user_branches', { user_id: `eq.${userId}` })
        return null
      }
      // Delete all existing, then re-insert (avoid not.in. which backend doesn't support)
      await restDelete('user_branches', { user_id: `eq.${userId}` })

      const rows = branchIds.map((bid) => ({
        user_id:    userId,
        branch_id:  bid,
        is_default: bid === defaultBranchId,
      }))
      await restPost('user_branches', rows)
      return null
    } catch (e) {
      return String(e)
    }
  },
}
