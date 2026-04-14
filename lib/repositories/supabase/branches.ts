import type { Branch, BranchInsert } from '@/types/database'
import type { BranchRepository } from '@/lib/repositories/contracts'
import { getDb, getAdminDb } from './db'

export const supabaseBranchRepo: BranchRepository = {
  async list(): Promise<Branch[]> {
    const db = await getDb()
    const { data } = await db
      .from('branches')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name')
    return (data ?? []) as Branch[]
  },

  async listForCompany(companyId: string): Promise<Branch[]> {
    const { data } = await getAdminDb()
      .from('branches')
      .select('*')
      .eq('company_id', companyId)
      .order('is_default', { ascending: false })
      .order('name')
    return (data ?? []) as Branch[]
  },

  async getById(id: string): Promise<Branch | null> {
    const db = await getDb()
    const { data } = await db.from('branches').select('*').eq('id', id).maybeSingle()
    return (data as Branch | null) ?? null
  },

  async getDefaultForCompany(companyId: string): Promise<Branch | null> {
    const { data } = await getAdminDb()
      .from('branches')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_default', true)
      .maybeSingle()
    return (data as Branch | null) ?? null
  },

  async listAssignmentsForCompany(companyId: string) {
    const { data } = await getAdminDb()
      .from('user_branches')
      .select('user_id, branch_id, is_default')
      .eq('company_id', companyId)
    return (data ?? []) as Array<{ user_id: string; branch_id: string; is_default: boolean }>
  },

  async listBranchesForUser(userId: string): Promise<Branch[]> {
    const { data } = await getAdminDb()
      .from('user_branches')
      .select('branch:branches(*)')
      .eq('user_id', userId)
    return (data ?? [])
      .map((r) => r.branch as unknown as Branch)
      .filter((b): b is Branch => !!b)
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name))
  },

  async countForCompany(companyId: string): Promise<number> {
    const { count } = await getAdminDb()
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
    return count ?? 0
  },

  async create(input: BranchInsert): Promise<{ id: string } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('branches')
      .insert(input)
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async update(id: string, input: Partial<BranchInsert>): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('branches').update(input).eq('id', id)
    return error?.message ?? null
  },

  async setDefault(id: string): Promise<string | null> {
    // Two-step: clear the existing default in the company, then set this one.
    // Wrapped in the admin client so a branch admin promoting any branch
    // doesn't race with RLS on the sibling row update.
    const admin = getAdminDb()
    const { data: row } = await admin
      .from('branches').select('company_id').eq('id', id).single()
    const companyId = (row as { company_id?: string } | null)?.company_id
    if (!companyId) return 'ไม่พบสาขา'

    const { error: clearErr } = await admin
      .from('branches').update({ is_default: false })
      .eq('company_id', companyId).eq('is_default', true)
    if (clearErr) return clearErr.message

    const { error } = await admin
      .from('branches').update({ is_default: true }).eq('id', id)
    return error?.message ?? null
  },

  async delete(id: string): Promise<string | null> {
    const admin = getAdminDb()

    // Safety checks — refuse delete if any FK would orphan rows. We check
    // at app layer so we can return a Thai message; DB CASCADE does not
    // apply here (we want hard-block, not silent cascade).
    for (const { table, col, msg } of [
      { table: 'sales',            col: 'branch_id', msg: 'สาขานี้มีรายการขายอยู่' },
      { table: 'purchase_orders',  col: 'branch_id', msg: 'สาขานี้มีใบสั่งซื้ออยู่' },
      { table: 'stock_logs',       col: 'branch_id', msg: 'สาขานี้มีประวัติสต๊อกอยู่' },
      { table: 'product_stock',    col: 'branch_id', msg: 'สาขานี้มีสต๊อกสินค้าอยู่' },
    ] as const) {
      const { count } = await admin
        .from(table).select('*', { count: 'exact', head: true }).eq(col, id)
      if ((count ?? 0) > 0) return msg
    }

    const { error } = await admin.from('branches').delete().eq('id', id)
    return error?.message ?? null
  },

  async assignUser({ userId, branchId, isDefault = false }): Promise<string | null> {
    const admin = getAdminDb()
    // Need company_id for the new row — pull from the branch.
    const { data: branch } = await admin
      .from('branches').select('company_id').eq('id', branchId).single()
    const companyId = (branch as { company_id?: string } | null)?.company_id
    if (!companyId) return 'ไม่พบสาขา'

    if (isDefault) {
      await admin.from('user_branches')
        .update({ is_default: false })
        .eq('user_id', userId).eq('is_default', true)
    }

    const { error } = await admin.from('user_branches').upsert({
      user_id: userId,
      branch_id: branchId,
      company_id: companyId,
      is_default: isDefault,
    })
    return error?.message ?? null
  },

  async unassignUser(userId: string, branchId: string): Promise<string | null> {
    const { error } = await getAdminDb()
      .from('user_branches')
      .delete()
      .eq('user_id', userId).eq('branch_id', branchId)
    return error?.message ?? null
  },

  async setUserBranches({ userId, branchIds, defaultBranchId }): Promise<string | null> {
    const admin = getAdminDb()
    // Need company_id for every insert — derive from any of the branches.
    if (branchIds.length === 0) {
      const { error } = await admin.from('user_branches').delete().eq('user_id', userId)
      return error?.message ?? null
    }
    const { data: branches } = await admin
      .from('branches').select('id, company_id').in('id', branchIds)
    const companyId = (branches?.[0] as { company_id?: string } | undefined)?.company_id
    if (!companyId) return 'ไม่พบสาขา'

    // Replace the user's branch set in one transaction-like sequence.
    // 1) delete rows for branches no longer in the set
    const { error: delErr } = await admin
      .from('user_branches').delete()
      .eq('user_id', userId)
      .not('branch_id', 'in', `(${branchIds.map((id) => `"${id}"`).join(',')})`)
    if (delErr) return delErr.message

    // 2) upsert all current rows with the correct is_default flag
    const rows = branchIds.map((bid) => ({
      user_id:    userId,
      branch_id:  bid,
      company_id: companyId,
      is_default: bid === defaultBranchId,
    }))
    const { error: upErr } = await admin.from('user_branches').upsert(rows)
    return upErr?.message ?? null
  },
}
