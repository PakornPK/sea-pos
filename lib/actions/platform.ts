'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionUser } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'
import type { CompanyPlan, CompanyStatus } from '@/types/database'

export type PlatformState = { error?: string; success?: boolean } | undefined

async function requirePlatformAdmin() {
  const { me } = await getActionUser()
  if (!me.isPlatformAdmin) throw new Error('เฉพาะผู้ดูแลแพลตฟอร์มเท่านั้น')
  return { me }
}

export async function createCompany(
  _prev: PlatformState,
  formData: FormData
): Promise<PlatformState> {
  let newCompanyId: string | null = null
  try {
    await requirePlatformAdmin()

    const name       = String(formData.get('name') ?? '').trim()
    const email      = String(formData.get('email') ?? '').trim().toLowerCase()
    const password   = String(formData.get('password') ?? '')
    const fullName   = String(formData.get('full_name') ?? '').trim()

    if (!name)     return { error: 'กรุณาระบุชื่อบริษัท' }
    if (!email)    return { error: 'กรุณาระบุอีเมลของผู้ใช้' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'รูปแบบอีเมลไม่ถูกต้อง' }
    if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
    if (!fullName) return { error: 'กรุณาระบุชื่อ-สกุลของผู้ใช้' }

    const res = await companyRepo.createWithOwner({
      name,
      ownerEmail: email,
      ownerPassword: password,
      ownerFullName: fullName,
    })
    if ('error' in res) return { error: res.error }

    newCompanyId = res.companyId
    revalidatePath('/platform/companies')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
  if (newCompanyId) redirect(`/platform/companies/${newCompanyId}`)
  return { error: 'เกิดข้อผิดพลาด' }
}

export async function setCompanyStatus(
  id: string,
  status: CompanyStatus
): Promise<void> {
  await requirePlatformAdmin()
  const err = await companyRepo.setStatus(id, status)
  if (err) throw new Error(err)
  revalidatePath('/platform/companies')
  revalidatePath(`/platform/companies/${id}`)
}

export async function setCompanyPlan(
  id: string,
  plan: CompanyPlan
): Promise<void> {
  await requirePlatformAdmin()
  const err = await companyRepo.setPlan(id, plan)
  if (err) throw new Error(err)
  revalidatePath('/platform/companies')
  revalidatePath(`/platform/companies/${id}`)
}
