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
} from '@/lib/repositories/contracts/loyalty'
import { chain, money, add } from '@/lib/money'
import { getDb } from './db'

export const supabaseLoyaltyRepo: LoyaltyRepository = {

  // ─── Settings ──────────────────────────────────────────────────────────────

  async getSettings(): Promise<MembershipSettings | null> {
    const db = await getDb()
    const { data } = await db
      .from('membership_settings')
      .select('*')
      .maybeSingle()
    return (data as MembershipSettings | null) ?? null
  },

  async upsertSettings(input: MembershipSettingsInput): Promise<string | null> {
    const db = await getDb()
    const { company_id, ...fields } = input
    if (!company_id) return 'company_id is required'
    const { error } = await db
      .from('membership_settings')
      .upsert(
        { company_id, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'company_id' },
      )
    return error?.message ?? null
  },

  // ─── Tiers ─────────────────────────────────────────────────────────────────

  async listTiers(): Promise<MembershipTier[]> {
    const db = await getDb()
    const { data, error } = await db
      .from('membership_tiers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('min_spend_baht', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as MembershipTier[]
  },

  async upsertTier(id: string | null, input: MembershipTierInput): Promise<string | null> {
    const db = await getDb()
    if (id) {
      const { error } = await db.from('membership_tiers').update(input).eq('id', id)
      return error?.message ?? null
    }
    const { error } = await db.from('membership_tiers').insert(input)
    return error?.message ?? null
  },

  async deleteTier(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('membership_tiers').delete().eq('id', id)
    return error?.message ?? null
  },

  // ─── Members ───────────────────────────────────────────────────────────────

  async listMembers(): Promise<MemberListRow[]> {
    const db = await getDb()
    const { data, error } = await db
      .from('members')
      .select('*, membership_tiers(name, color)')
      .order('enrolled_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row as unknown as Member),
      tier_name:  (row.membership_tiers as { name: string }  | null)?.name  ?? null,
      tier_color: (row.membership_tiers as { color: string } | null)?.color ?? null,
    }))
  },

  async getMember(id: string): Promise<MemberWithDetails | null> {
    const db = await getDb()
    const { data } = await db
      .from('members')
      .select('*, membership_tiers(*)')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null
    const row = data as Record<string, unknown>
    return {
      ...(row as unknown as Member),
      tier: (row.membership_tiers as MembershipTier | null) ?? null,
    }
  },

  async findMemberByPhone(phone: string): Promise<MemberWithDetails | null> {
    const db = await getDb()
    const { data } = await db
      .from('members')
      .select('*, membership_tiers(*)')
      .eq('phone', phone)
      .maybeSingle()
    if (!data) return null
    const row = data as Record<string, unknown>
    return {
      ...(row as unknown as Member),
      tier: (row.membership_tiers as MembershipTier | null) ?? null,
    }
  },

  async findMemberByNo(memberNo: string): Promise<MemberWithDetails | null> {
    const db = await getDb()
    const { data } = await db
      .from('members')
      .select('*, membership_tiers(*)')
      .eq('member_no', memberNo)
      .maybeSingle()
    if (!data) return null
    const row = data as Record<string, unknown>
    return {
      ...(row as unknown as Member),
      tier: (row.membership_tiers as MembershipTier | null) ?? null,
    }
  },

  async enrollMember(input: EnrollMemberInput): Promise<{ id: string; member_no: string } | null> {
    const db = await getDb()
    const { data, error } = await db
      .from('members')
      .insert({
        name:      input.name,
        phone:     input.phone   ?? null,
        email:     input.email   ?? null,
        address:   input.address ?? null,
        member_no: '',  // filled by trg_set_member_no
      })
      .select('id, member_no')
      .single()
    if (error) return null
    return { id: data.id, member_no: data.member_no }
  },

  // ─── Points ────────────────────────────────────────────────────────────────

  async awardPointsFromSale(input: AwardPointsInput): Promise<string | null> {
    const db = await getDb()

    const [{ data: member }, { data: settings }] = await Promise.all([
      db.from('members').select('*, membership_tiers(points_multiplier)').eq('id', input.member_id).single(),
      db.from('membership_settings').select('*').maybeSingle(),
    ])
    if (!member || !settings) return 'ไม่พบข้อมูลสมาชิกหรือการตั้งค่า'

    const multiplier    = (member.membership_tiers as { points_multiplier: number } | null)?.points_multiplier ?? 1
    const pointsPerBaht = Number(settings.points_per_baht)

    // Process redemption first — cap by both balance AND max_redeem_pct
    if (input.redeem_points && input.redeem_points > 0) {
      const bahtPerPoint = Number(settings.baht_per_point)
      const maxDiscount  = money(chain(input.amount_baht).times(settings.max_redeem_pct).div(100))
      // Points needed to produce exactly the capped discount (ceil so we never over-deduct)
      const maxPtsByPct  = bahtPerPoint > 0
        ? Math.ceil(chain(maxDiscount).div(bahtPerPoint).toNumber())
        : 0
      const toRedeem = Math.min(input.redeem_points, Number(member.points_balance), maxPtsByPct)
      if (toRedeem > 0) {
        const newBal = Number(member.points_balance) - toRedeem
        await db.from('members').update({ points_balance: newBal }).eq('id', input.member_id)
        await db.from('member_points_log').insert({
          member_id:     input.member_id,
          type:          'redeem',
          points:        -toRedeem,
          balance_after: newBal,
          sale_id:       input.sale_id,
          note:          'ใช้แต้มแลกส่วนลด',
        })
        member.points_balance = newBal
      }
    }

    // Award earn points — always update total_spend_baht
    const earned   = Math.floor(chain(input.amount_baht).times(pointsPerBaht).times(multiplier).toNumber())
    const newSpend = add(member.total_spend_baht, input.amount_baht)

    if (earned > 0) {
      const newBal = Number(member.points_balance) + earned
      await db.from('members').update({
        points_balance:   newBal,
        total_spend_baht: newSpend,
      }).eq('id', input.member_id)
      await db.from('member_points_log').insert({
        member_id:    input.member_id,
        type:         'earn',
        points:       earned,
        balance_after: newBal,
        sale_id:      input.sale_id,
        note:         `ซื้อ ฿${input.amount_baht.toFixed(2)}`,
      })
      member.points_balance = newBal
    } else {
      await db.from('members').update({ total_spend_baht: newSpend }).eq('id', input.member_id)
    }

    // Auto tier upgrade
    const { data: tiers } = await db
      .from('membership_tiers')
      .select('id, min_spend_baht')
      .order('min_spend_baht', { ascending: false })
    const newTier = (tiers ?? []).find((t) => newSpend >= Number(t.min_spend_baht))
    if (newTier && newTier.id !== member.tier_id) {
      await db.from('members').update({ tier_id: newTier.id }).eq('id', input.member_id)
    }

    return null
  },

  async adjustPoints(memberId: string, points: number, note: string): Promise<string | null> {
    const db = await getDb()
    const { data: member } = await db.from('members').select('points_balance').eq('id', memberId).single()
    if (!member) return 'ไม่พบสมาชิก'
    const newBal = Math.max(0, Number(member.points_balance) + points)
    await db.from('members').update({ points_balance: newBal }).eq('id', memberId)
    const { error } = await db.from('member_points_log').insert({
      member_id: memberId,
      type:      'adjust',
      points,
      balance_after: newBal,
      note,
    })
    return error?.message ?? null
  },

  async getPointsLog(memberId: string): Promise<MemberPointsLog[]> {
    const db = await getDb()
    const { data } = await db
      .from('member_points_log')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(100)
    return (data ?? []) as MemberPointsLog[]
  },
}
