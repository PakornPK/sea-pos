import type { UserRole } from '@/types/database'

export type UserListRow = {
  id: string
  email: string
  created_at: string
  role: UserRole
  full_name: string | null
}

export interface UserRepository {
  listAll(): Promise<UserListRow[]>
  create(input: {
    email: string
    password: string
    role: UserRole
    full_name: string | null
  }): Promise<{ id: string } | { error: string }>
  updateProfile(id: string, input: { role: UserRole; full_name: string | null }): Promise<string | null>
  updatePassword(id: string, password: string): Promise<string | null>
  delete(id: string): Promise<string | null>
  forceSignOut(id: string, scope?: 'global' | 'others'): Promise<string | null>
}
