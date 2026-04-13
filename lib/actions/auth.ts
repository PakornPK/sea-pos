'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authRepo } from '@/lib/repositories'

export async function signIn(_prev: unknown, formData: FormData) {
  const supabase = await createClient()

  const error = await authRepo.signInWithPassword(supabase, {
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
  })
  if (error) return { error }

  revalidatePath('/', 'layout')
  redirect('/inventory')
}

export async function signOut() {
  const supabase = await createClient()
  await authRepo.signOut(supabase)
  redirect('/login')
}
