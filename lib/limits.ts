import { companyRepo, planRepo } from '@/lib/repositories'

export type Usage = {
  /** What the company has now. */
  current: number
  /** Plan limit. null = unlimited. */
  limit: number | null
  /** True when current >= limit (or always false when unlimited). */
  reached: boolean
  /** 0..1 ratio of usage; 0 when limit is null. */
  ratio: number
}

function buildUsage(current: number, limit: number | null): Usage {
  if (limit === null) return { current, limit: null, reached: false, ratio: 0 }
  return {
    current,
    limit,
    reached: current >= limit,
    ratio: limit > 0 ? Math.min(1, current / limit) : 1,
  }
}

/**
 * Look up the current company's plan limits.
 * Returns null only if the user is detached from any company (platform admin).
 */
export async function loadCurrentLimits() {
  const company = await companyRepo.getCurrent()
  if (!company) return null
  const plan = await planRepo.getByCode(company.plan)
  return {
    company,
    plan,
    maxProducts: plan?.max_products ?? null,
    maxUsers:    plan?.max_users    ?? null,
    maxBranches: plan?.max_branches ?? null,
  }
}

/**
 * Public helpers used by Server Actions to gate inserts.
 * Each returns either the usage state (so the caller can format an error
 * message with `current` / `limit`) or null when the limit is irrelevant
 * (no company / unlimited).
 */
export async function checkProductLimit(currentCount: number): Promise<Usage | null> {
  const limits = await loadCurrentLimits()
  if (!limits) return null
  return buildUsage(currentCount, limits.maxProducts)
}

export async function checkUserLimit(currentCount: number): Promise<Usage | null> {
  const limits = await loadCurrentLimits()
  if (!limits) return null
  return buildUsage(currentCount, limits.maxUsers)
}

export async function checkBranchLimit(currentCount: number): Promise<Usage | null> {
  const limits = await loadCurrentLimits()
  if (!limits) return null
  return buildUsage(currentCount, limits.maxBranches)
}

export function formatLimitError(
  resource: 'product' | 'user' | 'branch',
  usage: Usage
): string {
  const labels = { product: 'สินค้า', user: 'ผู้ใช้งาน', branch: 'สาขา' }
  return (
    `แพ็กเกจปัจจุบันเพิ่ม${labels[resource]}ได้สูงสุด ${usage.limit} รายการ ` +
    `(ใช้ไปแล้ว ${usage.current}). กรุณาอัปเกรดแพ็กเกจหรือลดจำนวนก่อน`
  )
}
