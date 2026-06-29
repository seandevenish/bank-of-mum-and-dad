import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { Household, Invite, Member, UserProfile } from '../../types/models'

export interface AuthState {
  /** The Firebase auth user, or null when signed out. */
  user: User | null
  /** The signed-in user's profile doc (maps them to a household). */
  profile: UserProfile | null
  /** The household this user belongs to. */
  household: Household | null
  /** The signed-in user's membership (role + scope) in their household. */
  member: Member | null
  /** Invites addressed to this user that are waiting to be accepted. */
  pendingInvites: Invite[]
  /** Set when loading/creating the household failed (e.g. Firestore not reachable). */
  householdError: string | null
  /** True while the initial auth state / household load is in flight. */
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Accept a pending invite and switch into that household. */
  acceptPendingInvite: (invite: Invite) => Promise<void>
  /** Dismiss the invite prompt for this session (keeps the user's own space). */
  dismissPendingInvites: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
