import type {
  MembershipSettings,
  MembershipTier,
  Member,
  MemberPointsLog,
  MlmLevelConfig,
} from '@/types/database'

// ─── Input types ──────────────────────────────────────────────────────────────

export type MembershipSettingsInput = {
  enabled?:            boolean
  points_per_baht?:    number
  baht_per_point?:     number
  max_redeem_pct?:     number
  points_expiry_days?: number | null
  mlm_enabled?:        boolean
  mlm_levels?:         MlmLevelConfig[]
}

export type MembershipTierInput = {
  name:              string
  color?:            string
  min_spend_baht:    number
  discount_pct?:     number
  points_multiplier?: number
  sort_order?:       number
}

export type EnrollMemberInput = {
  name:                   string
  phone?:                 string | null
  email?:                 string | null
  address?:               string | null
  referred_by_member_no?: string | null
}

export type AwardPointsInput = {
  member_id:        string
  amount_baht:      number   // sale total (before redemption)
  sale_id:          string
  redeem_points?:   number   // points buyer wants to spend
}

// ─── List row types ───────────────────────────────────────────────────────────

export type MemberListRow = Member & {
  tier_name:  string | null
  tier_color: string | null
}

export type MemberWithDetails = Member & {
  tier:           MembershipTier | null
  referred_by_no: string | null   // member_no of referrer
}

export type MemberTreeRow = {
  member_id:      string
  member_no:      string
  name:           string
  depth:          number
  tier_name:      string | null
  tier_color:     string | null
  points_balance: number
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

  // Tree
  getDownline(memberId: string, maxDepth?: number): Promise<MemberTreeRow[]>
  getUpline(memberId: string): Promise<MemberTreeRow[]>
}
