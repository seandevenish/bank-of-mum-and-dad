import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../../firebase/config'
import type { Household, Invite, Member, UserProfile } from '../../types/models'
import { logError } from '../../lib/log'
import { AuthContext, type AuthState } from './context'
import { acceptInvite, createOwnHousehold, renameHousehold, resolveMembership } from './household'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [householdError, setHouseholdError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Apply a resolved membership (or invite prompt) to state.
  const applyMembership = useCallback(
    (result: Awaited<ReturnType<typeof resolveMembership>>) => {
      if (result.kind === 'pending-invites') {
        setProfile(null)
        setHousehold(null)
        setMember(null)
        setPendingInvites(result.invites)
      } else {
        setProfile(result.profile)
        setHousehold(result.household)
        setMember(result.member)
        setPendingInvites([])
      }
    },
    [],
  )

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      setHouseholdError(null)
      if (nextUser) {
        try {
          applyMembership(await resolveMembership(nextUser))
        } catch (err) {
          logError('Failed to resolve membership for {Uid}', err, { Uid: nextUser.uid })
          setProfile(null)
          setHousehold(null)
          setMember(null)
          setPendingInvites([])
          setHouseholdError(householdErrorMessage(err))
        }
      } else {
        setProfile(null)
        setHousehold(null)
        setMember(null)
        setPendingInvites([])
      }
      setLoading(false)
    })
  }, [applyMembership])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      household,
      member,
      pendingInvites,
      householdError,
      loading,
      signInWithGoogle: async () => {
        await signInWithPopup(auth, new GoogleAuthProvider())
      },
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password)
      },
      registerWithEmail: async (email, password) => {
        await createUserWithEmailAndPassword(auth, email, password)
      },
      signOut: async () => {
        await firebaseSignOut(auth)
      },
      updateHouseholdName: async (name) => {
        if (!household) return
        const trimmed = name.trim()
        if (!trimmed || trimmed === household.name) return
        await renameHousehold(household.id, trimmed)
        setHousehold({ ...household, name: trimmed })
      },
      acceptPendingInvite: async (invite) => {
        if (!user) return
        await acceptInvite(user, invite)
        applyMembership(await resolveMembership(user))
      },
      dismissPendingInvites: () => {
        if (!user) return
        // The user chose to keep their own space — create it now.
        setLoading(true)
        void (async () => {
          try {
            applyMembership(await createOwnHousehold(user))
          } catch (err) {
            logError('Failed to create own household after dismissing invites', err, {
              Uid: user.uid,
            })
            setHouseholdError(householdErrorMessage(err))
          } finally {
            setLoading(false)
          }
        })()
      },
    }),
    [user, profile, household, member, pendingInvites, householdError, loading, applyMembership],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function householdErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
  switch (code) {
    case 'permission-denied':
      return 'Firestore denied access. Check that the security rules are deployed. (permission-denied)'
    case 'unavailable':
      return 'Could not reach Firestore. Check your connection and try again. (unavailable)'
    case 'not-found':
      return 'The Firestore database was not found. Create it in the Firebase console. (not-found)'
    case 'failed-precondition':
      return 'A Firestore index is still building or missing. Check the console. (failed-precondition)'
    default:
      return `Could not load your household${code ? ` (${code})` : ''}.`
  }
}
