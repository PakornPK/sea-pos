import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SignupForm } from '@/components/auth/SignupForm'
import { features } from '@/lib/features'

export const metadata: Metadata = {
  title: 'สมัครใช้งาน | SEA-POS',
}

export default function SignupPage() {
  // Gated by NEXT_PUBLIC_ENABLE_SIGNUP. In invite-only mode (MVP1), the
  // platform admin creates every company via /platform/companies/new.
  if (!features.enableSignup) notFound()

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div className="text-center space-y-1">
        <h1 className="text-[22px] font-bold tracking-tight">SEA-POS</h1>
        <p className="text-sm text-muted-foreground">สมัครใช้งานฟรี</p>
      </div>
      <SignupForm />
    </div>
  )
}
