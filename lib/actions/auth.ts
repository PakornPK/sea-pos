'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authRepo } from '@/lib/repositories'

export async function signIn(_prev: unknown, formData: FormData) {
  const rememberMe = formData.get('remember_me') === 'on'
  const error = await authRepo.signInWithPassword(
    {
      email:    formData.get('email')    as string,
      password: formData.get('password') as string,
    },
    rememberMe
  )
  if (error) return { error }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  await authRepo.signOut()
  redirect('/login')
}

export async function signUp(_prev: unknown, formData: FormData) {
  const email       = String(formData.get('email') ?? '').trim().toLowerCase()
  const password    = String(formData.get('password') ?? '')
  const fullName    = String(formData.get('full_name') ?? '').trim()
  const companyName = String(formData.get('company_name') ?? '').trim()

  if (!email)       return { error: 'กรุณาระบุอีเมล' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'รูปแบบอีเมลไม่ถูกต้อง' }
  if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
  if (!fullName)    return { error: 'กรุณาระบุชื่อ-สกุล' }
  if (!companyName) return { error: 'กรุณาระบุชื่อร้าน/บริษัท' }

  const error = await authRepo.signUp({ email, password, fullName, companyName })
  if (error) return { error }

  // Auto sign-in after signup — Supabase returns a session when email
  // confirmation is disabled (our default).
  const signInError = await authRepo.signInWithPassword({ email, password })
  if (signInError) return { error: signInError }

  revalidatePath('/', 'layout')
  redirect('/')
}
