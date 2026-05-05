import type {
  MembershipSettings,
  MembershipTier,
  Member,
  MemberPointsLog,
} from '@/types/database'
import type {
  LoyaltyRepository,
  MembershipSettingsInput,
  MembershipTierInput,
  EnrollMemberInput,
  AwardPointsInput,
  MemberListRow,
  MemberWithDetails,
  LoyaltySummary,
  TierStat,
  TopMemberRow,
} from '@/lib/repositories/contracts/loyalty'
import Decimal from 'decimal.js'
import { chain, money, add, sumBy } from '@/lib/money'
import { restGet, restPost, restPatchById, restDeleteById, restRpc } from '@/lib/api/rest'

export const fetchLoyaltyRepo: LoyaltyRepository = {

  async getSettings(): Promise<MembershipSettings | null> {
    const raw = await restGet<MembershipSettings[] | MembershipSettings>('membership_settings', { limit: '1' }).catch(() => null)
    if (!raw) return null
    const row = Array.isArray(raw) ? raw[0] : raw
    if (!row) return null
    return {
      ...row,
      points_per_baht:    money(row.points_per_baht),
      baht_per_point:     money(row.baht_per_point),
      max_redeem_pct:     money(row.max_redeem_pct),
      points_expiry_days: row.points_expiry_days != null ? new Decimal(row.points_expiry_days).toNumber() : null,
    }
  },

  async upsertSettings(input: MembershipSettingsInput): Promise<string | null> {
    try {
      const { company_id, ...fields } = input
      if (!company_id) return 'company_id is required'
      await restRpc('upsert_membership_settings', {
        p_company_id:         company_id,
        p_enabled:            fields.enabled            ?? true,
        p_points_per_baht:    fields.points_per_baht    ?? 1.0,
        p_baht_per_point:     fields.baht_per_point     ?? 0.10,
        p_max_redeem_pct:     fields.max_redeem_pct     ?? 20.0,
        p_points_expiry_days: fields.points_expiry_days ?? null,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async listTiers(): Promise<MembershipTier[]> {
    return restGet<MembershipTier[]>('membership_tiers', {
      order: ['sort_order.asc', 'min_spend_baht.asc'],
    }).catch(() => [])
  },

  async upsertTier(id: string | null, input: MembershipTierInput): Promise<string | null> {
    try {
      if (id) {
        await restPatchById('membership_tiers', id, input)
      } else {
        await restPost('membership_tiers', input)
      }
      return null
    } catch (e) {
      return String(e)
    }
  },

  async deleteTier(id: string): Promise<string | null> {
    try {
      await restDeleteById('membership_tiers', id)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async listMembers(): Promise<MemberListRow[]> {
    const data = await restGet<Array<Member & {
      membership_tiers: { name: string; color: string } | Array<{ name: string; color: string }> | null
    }>>('members', {
      select: '*,membership_tiers(name,color)',
      order:  'enrolled_at.desc',
    })
    return data.map((row) => {
      const tier = Array.isArray(row.membership_tiers) ? row.membership_tiers[0] : row.membership_tiers
      return {
        ...row,
        tier_name:  tier?.name  ?? null,
        tier_color: tier?.color ?? null,
      }
    })
  },

  async getMember(id: string): Promise<MemberWithDetails | null> {
    const rows = await restGet<Array<Member & { membership_tiers: MembershipTier | null }>>('members', {
      select: '*,membership_tiers(*)',
      id:     `eq.${id}`,
      limit:  '1',
    })
    const row = rows[0]
    if (!row) return null
    const tier = Array.isArray(row.membership_tiers) ? row.membership_tiers[0] : row.membership_tiers
    return { ...row, tier: tier ?? null }
  },

  async findMemberByPhone(phone: string): Promise<MemberWithDetails | null> {
    const rows = await restGet<Array<Member>>('members', {
      select: '*',
      phone:  `eq.${phone}`,
      limit:  '1',
    })
    const row = Array.isArray(rows) ? rows[0] : rows as Member | null
    if (!row) return null
    let tier: MembershipTier | null = null
    if (row.tier_id) {
      const tiers = await restGet<MembershipTier[]>('membership_tiers', { id: `eq.${row.tier_id}`, limit: '1' }).catch(() => [])
      const t = Array.isArray(tiers) ? tiers[0] : tiers as MembershipTier | null
      tier = t ?? null
    }
    return { ...row, tier }
  },

  async findMemberByNo(memberNo: string): Promise<MemberWithDetails | null> {
    const rows = await restGet<Array<Member & { membership_tiers: MembershipTier | null }>>('members', {
      select:    '*,membership_tiers(*)',
      member_no: `eq.${memberNo}`,
      limit:     '1',
    })
    const row = rows[0]
    if (!row) return null
    const tier = Array.isArray(row.membership_tiers) ? row.membership_tiers[0] : row.membership_tiers
    return { ...row, tier: tier ?? null }
  },

  async enrollMember(input: EnrollMemberInput): Promise<{ id: string; member_no: string } | null> {
    const rows = await restPost<Array<{ id: string; member_no: string }>>('members', {
      name:    input.name,
      phone:   input.phone   ?? null,
      email:   input.email   ?? null,
      address: input.address ?? null,
    })
    const row = Array.isArray(rows) ? rows[0] : rows as { id: string; member_no: string }
    if (!row) return null
    return { id: row.id, member_no: row.member_no }
  },

  async awardPointsFromSale(input: AwardPointsInput): Promise<string | null> {
    try {
      await restRpc('award_points', {
        p_member_id:     input.member_id,
        p_sale_id:       input.sale_id,
        p_amount_baht:   input.amount_baht,
        p_redeem_points: input.redeem_points ?? 0,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async adjustPoints(memberId: string, points: number, note: string): Promise<string | null> {
    try {
      await restRpc('adjust_points', {
        p_member_id: memberId,
        p_points:    points,
        p_note:      note,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async getPointsLog(memberId: string): Promise<MemberPointsLog[]> {
    return restGet<MemberPointsLog[]>('member_points_log', {
      member_id: `eq.${memberId}`,
      order:     'created_at.desc',
      limit:     '100',
    })
  },

  async getLoyaltySummary(start: string, end: string): Promise<LoyaltySummary> {
    const [
      allMembers,
      balances,
      activeSales,
      discountRows,
      earnLogs,
      redeemLogs,
    ] = await Promise.all([
      restGet<{ id: string }[]>('members', { select: 'id' }).catch(() => []),
      restGet<{ points_balance: number }[]>('members', { select: 'points_balance' }).catch(() => []),
      restGet<{ member_id: string | null }[]>('sales', {
        select:     'member_id',
        status:     'eq.completed',
        created_at: [`gte.${start}`, `lte.${end}`],
      }).catch(() => []),
      restGet<{ member_discount_baht: number }[]>('sales', {
        select:     'member_discount_baht',
        status:     'eq.completed',
        created_at: [`gte.${start}`, `lte.${end}`],
      }).catch(() => []),
      restGet<{ points: number }[]>('member_points_log', {
        select:     'points',
        type:       'eq.earn',
        created_at: [`gte.${start}`, `lte.${end}`],
      }).catch(() => []),
      restGet<{ points: number }[]>('member_points_log', {
        select:     'points',
        type:       'eq.redeem',
        created_at: [`gte.${start}`, `lte.${end}`],
      }).catch(() => []),
    ])

    const totalMembers      = allMembers.length
    const activeMembers     = new Set(activeSales.map((r) => r.member_id).filter(Boolean)).size
    const pointsOutstanding = sumBy(balances, (r) => r.points_balance)
    const discountGiven     = sumBy(discountRows, (r) => r.member_discount_baht)
    const pointsIssued      = sumBy(earnLogs, (r) => r.points)
    const pointsRedeemed    = Math.abs(sumBy(redeemLogs, (r) => r.points))

    return { totalMembers, activeMembers, pointsIssued, pointsRedeemed, pointsOutstanding, discountGiven }
  },

  async getTierStats(): Promise<TierStat[]> {
    const [tiers, members] = await Promise.all([
      restGet<MembershipTier[]>('membership_tiers', {
        select: 'id,name,color',
        order:  ['sort_order.asc', 'min_spend_baht.asc'],
      }),
      restGet<{ tier_id: string | null }[]>('members', { select: 'tier_id' }),
    ])

    const total  = members.length
    const counts = new Map<string | null, number>()
    for (const m of members) {
      counts.set(m.tier_id, (counts.get(m.tier_id) ?? 0) + 1)
    }

    const rows: TierStat[] = tiers.map((t) => {
      const count = counts.get(t.id) ?? 0
      return {
        tier_id:    t.id,
        tier_name:  t.name,
        tier_color: t.color,
        count,
        pct: total > 0 ? money(chain(count).times(100).div(total)) : 0,
      }
    })

    const noTierCount = counts.get(null) ?? 0
    if (noTierCount > 0) {
      rows.push({
        tier_id:    null,
        tier_name:  'ไม่มีระดับ',
        tier_color: null,
        count:      noTierCount,
        pct:        total > 0 ? money(chain(noTierCount).times(100).div(total)) : 0,
      })
    }
    return rows
  },

  async getTopMembers(limit = 10): Promise<TopMemberRow[]> {
    const data = await restGet<Array<{
      id: string; member_no: string; name: string; total_spend_baht: number; points_balance: number
      membership_tiers: { name: string; color: string } | Array<{ name: string; color: string }> | null
    }>>('members', {
      select: 'id,member_no,name,total_spend_baht,points_balance,membership_tiers(name,color)',
      order:  'total_spend_baht.desc',
      limit:  String(limit),
    })
    return data.map((row) => {
      const tier = Array.isArray(row.membership_tiers) ? row.membership_tiers[0] : row.membership_tiers
      return {
        id:               row.id,
        member_no:        row.member_no,
        name:             row.name,
        total_spend_baht: Number(row.total_spend_baht),
        points_balance:   Number(row.points_balance),
        tier_name:        tier?.name  ?? null,
        tier_color:       tier?.color ?? null,
      }
    })
  },
}

// Unused import guard
void add
