export interface AuthRepository {
  signInWithPassword(credentials: { email: string; password: string }): Promise<string | null>
  signOut(): Promise<string | null>
}
