import { collection, doc, getDoc, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '../../firebase/config'
import type { Household, UserProfile } from '../../types/models'

/**
 * Ensures a signed-in user has a profile doc and a household.
 *
 * On first login this creates a brand-new household owned by the user and the
 * matching `users/{uid}` profile that points at it. On subsequent logins it just
 * loads the existing profile + household.
 *
 * Inviting a second parent into an existing household is a future enhancement;
 * for now every first-time user gets their own household.
 */
export async function ensureHousehold(
  user: User,
): Promise<{ profile: UserProfile; household: Household }> {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    const data = userSnap.data()
    const profile: UserProfile = { uid: user.uid, householdId: data.householdId, ...data }
    const householdSnap = await getDoc(doc(db, 'households', profile.householdId))
    const household = { id: householdSnap.id, ...householdSnap.data() } as Household
    return { profile, household }
  }

  // First login — create the household, then the user profile that references it.
  const householdRef = doc(collection(db, 'households'))
  const name = user.displayName ? `${user.displayName}'s household` : 'My household'
  const createdAt = Date.now()

  await setDoc(householdRef, {
    name,
    memberUids: [user.uid],
    createdAt,
  })
  await setDoc(userRef, {
    householdId: householdRef.id,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
  })

  const household: Household = { id: householdRef.id, name, memberUids: [user.uid], createdAt }
  const profile: UserProfile = {
    uid: user.uid,
    householdId: householdRef.id,
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
  }
  return { profile, household }
}
