import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import type { Household, UserProfile } from '../../types/models'
import { logError } from '../../lib/log'
import { AuthContext, type AuthState } from './context'
import { ensureHousehold } from './household'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [householdError, setHouseholdError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      setHouseholdError(null)
      if (nextUser) {
        try {
          const result = await ensureHousehold(nextUser)
          setProfile(result.profile)
          setHousehold(result.household)
        } catch (err) {
          logError('Failed to load or create household for {Uid}', err, { Uid: nextUser.uid })
          setProfile(null)
          setHousehold(null)
          setHouseholdError(householdErrorMessage(err))
        }
      } else {
        setProfile(null)
        setHousehold(null)
      }
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      household,
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
    }),
    [user, profile, household, householdError, loading],
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
    default:
      return `Could not load your household${code ? ` (${code})` : ''}.`
  }
}
