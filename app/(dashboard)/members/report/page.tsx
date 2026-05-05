'use client'

import { useAuth } from '@/lib/auth-client'
import { MembersReportSection } from '@/components/loyalty/MembersReportSection'

export default function LoyaltyReportPage() {
  const { user } = useAuth()

  if (!user) return null

  return <MembersReportSection />
}
