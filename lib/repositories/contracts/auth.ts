export interface AuthRepository {
  signInWithPassword(credentials: { email: string; password: string }): Promise<string | null>
  signOut(): Promise<string | null>
  /**
   * Self-serve signup. The DB `handle_new_user` trigger picks up `companyName`
   * from user_metadata and creates a fresh company for this user, making them
   * its admin owner.
   */
  signUp(input: {
    email: string
    password: string
    fullName: string
    companyName: string
  }): Promise<string | null>
}
