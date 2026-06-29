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
import { AuthContext, type AuthState } from './context'
import { ensureHousehold } from './household'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        try {
          const result = await ensureHousehold(nextUser)
          setProfile(result.profile)
          setHousehold(result.household)
        } catch (err) {
          console.error('Failed to load or create household', err)
          setProfile(null)
          setHousehold(null)
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
    [user, profile, household, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
