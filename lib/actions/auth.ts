'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authRepo } from '@/lib/repositories'

export async function signIn(_prev: unknown, formData: FormData) {
  const error = await authRepo.signInWithPassword({
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
  })
  if (error) return { error }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  await authRepo.signOut()
  redirect('/login')
}
