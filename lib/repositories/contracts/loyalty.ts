import type {
  MembershipSettings,
  MembershipTier,
  Member,
  MemberPointsLog,
} from '@/types/database'

// ─── Input types ──────────────────────────────────────────────────────────────

export type MembershipSettingsInput = {
  company_id?:         string   // required for upsert; injected from server action
  enabled?:            boolean
  points_per_baht?:    number
  baht_per_point?:     number
  max_redeem_pct?:     number
  points_expiry_days?: number | null
}

export type MembershipTierInput = {
  name:               string
  color?:             string
  min_spend_baht:     number
  discount_pct?:      number
  points_multiplier?: number
  sort_order?:        number
}

export type EnrollMemberInput = {
  name:    string
  phone?:  string | null
  email?:  string | null
  address?: string | null
}

export type AwardPointsInput = {
  member_id:      string
  amount_baht:    number   // final sale total (after any discount)
  sale_id:        string
  redeem_points?: number   // points the buyer chose to redeem
}

// ─── List row types ───────────────────────────────────────────────────────────

export type MemberListRow = Member & {
  tier_name:  string | null
  tier_color: string | null
}

export type MemberWithDetails = Member & {
  tier: MembershipTier | null
}

// ─── Loyalty report types ─────────────────────────────────────────────────────

export type LoyaltySummary = {
  totalMembers:      number
  activeMembers:     number   // distinct members who purchased in the period
  pointsIssued:      number   // earn points logged in the period
  pointsRedeemed:    number   // redeem points (absolute) logged in the period
  pointsOutstanding: number   // current total balance across all members (฿ liability)
  discountGiven:     number   // ฿ member_discount_baht on completed sales in the period
}

export type TierStat = {
  tier_id:    string | null
  tier_name:  string
  tier_color: string | null
  count:      number
  pct:        number   // % of total members
}

export type TopMemberRow = {
  id:               string
  member_no:        string
  name:             string
  tier_name:        string | null
  tier_color:       string | null
  total_spend_baht: number
  points_balance:   number
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface LoyaltyRepository {
  // Settings
  getSettings(): Promise<MembershipSettings | null>
  upsertSettings(input: MembershipSettingsInput): Promise<string | null>

  // Tiers
  listTiers(): Promise<MembershipTier[]>
  upsertTier(id: string | null, input: MembershipTierInput): Promise<string | null>
  deleteTier(id: string): Promise<string | null>

  // Members
  listMembers(): Promise<MemberListRow[]>
  getMember(id: string): Promise<MemberWithDetails | null>
  findMemberByPhone(phone: string): Promise<MemberWithDetails | null>
  findMemberByNo(memberNo: string): Promise<MemberWithDetails | null>
  enrollMember(input: EnrollMemberInput): Promise<{ id: string; member_no: string } | null>

  // Points
  awardPointsFromSale(input: AwardPointsInput): Promise<string | null>
  adjustPoints(memberId: string, points: number, note: string): Promise<string | null>
  getPointsLog(memberId: string): Promise<MemberPointsLog[]>

  // Report
  getLoyaltySummary(start: string, end: string): Promise<LoyaltySummary>
  getTierStats(): Promise<TierStat[]>
  getTopMembers(limit?: number): Promise<TopMemberRow[]>
}
