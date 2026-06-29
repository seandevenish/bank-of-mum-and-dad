import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { Household, UserProfile } from '../../types/models'

export interface AuthState {
  /** The Firebase auth user, or null when signed out. */
  user: User | null
  /** The signed-in user's profile doc (maps them to a household). */
  profile: UserProfile | null
  /** The household this user belongs to. */
  household: Household | null
  /** True while the initial auth state / household load is in flight. */
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
