import {
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '../../firebase/config'
import type { Household, Invite, Member, UserProfile } from '../../types/models'

/** Lowercased email — the key under which a user's invites are filed. */
export function emailKeyOf(email: string): string {
  return email.trim().toLowerCase()
}

/** What `resolveMembership` found for a signed-in user. */
export type MembershipResult =
  | { kind: 'ready'; profile: UserProfile; household: Household; member: Member }
  | { kind: 'pending-invites'; invites: Invite[] }

/**
 * Resolve a signed-in user to their household + role.
 *
 * - Returning user (has a `users/{uid}` profile): load their household and
 *   member doc, backfilling owner/membership for legacy pre-Stage-6 households.
 * - Brand-new user with a pending invite: return the invites so the UI can
 *   prompt to accept — we don't auto-create a household for them.
 * - Brand-new user with no invite: create their own household, owned by them.
 */
export async function resolveMembership(user: User): Promise<MembershipResult> {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    const data = userSnap.data()
    const profile: UserProfile = { uid: user.uid, householdId: data.householdId, ...data }
    const householdSnap = await getDoc(doc(db, 'households', profile.householdId))
    const household = { id: householdSnap.id, ...householdSnap.data() } as Household
    const member = await ensureMemberDoc(user, household)
    return { kind: 'ready', profile, household, member }
  }

  const invites = await findPendingInvites(user.email)
  if (invites.length > 0) return { kind: 'pending-invites', invites }

  return createOwnHousehold(user)
}

/** All pending invites addressed to the given email, across every household. */
export async function findPendingInvites(email: string | null): Promise<Invite[]> {
  if (!email) return []
  const q = query(
    collectionGroup(db, 'invites'),
    where('email', '==', emailKeyOf(email)),
    where('status', '==', 'pending'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Invite)
}

/** First-login household creation: household + profile + owner member doc. */
export async function createOwnHousehold(user: User): Promise<MembershipResult> {
  const householdRef = doc(collection(db, 'households'))
  const name = user.displayName ? `${user.displayName}'s household` : 'My household'
  const createdAt = Date.now()

  // Sequential (not batched) so each write's rules can see the prior ones —
  // the member-create rule reads the household's memberUids.
  await setDoc(householdRef, {
    name,
    ownerUid: user.uid,
    memberUids: [user.uid],
    createdAt,
  })
  await setDoc(doc(db, 'users', user.uid), {
    householdId: householdRef.id,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
  })
  const member: Member = {
    uid: user.uid,
    role: 'owner',
    scopedGroupIds: null,
    email: emailKeyOf(user.email ?? ''),
    displayName: user.displayName ?? undefined,
    joinedAt: createdAt,
  }
  await setDoc(doc(db, 'households', householdRef.id, 'members', user.uid), memberData(member))

  const household: Household = {
    id: householdRef.id,
    name,
    ownerUid: user.uid,
    memberUids: [user.uid],
    createdAt,
  }
  const profile: UserProfile = {
    uid: user.uid,
    householdId: householdRef.id,
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
  }
  return { kind: 'ready', profile, household, member }
}

/**
 * Ensure the user has a `members/{uid}` doc. Legacy pre-Stage-6 households have
 * members listed in `memberUids` but no member docs and no `ownerUid`; the first
 * such member to load claims ownership and writes their own member doc.
 */
async function ensureMemberDoc(user: User, household: Household): Promise<Member> {
  const memberRef = doc(db, 'households', household.id, 'members', user.uid)
  const snap = await getDoc(memberRef)
  if (snap.exists()) {
    return { uid: user.uid, ...(snap.data() as Omit<Member, 'uid'>) }
  }

  // Backfill. If the household has no owner yet, this member becomes the owner;
  // otherwise they're added as a full member (shouldn't normally happen).
  const role: Member['role'] = household.ownerUid ? 'full' : 'owner'
  const member: Member = {
    uid: user.uid,
    role,
    scopedGroupIds: null,
    email: emailKeyOf(user.email ?? ''),
    displayName: user.displayName ?? undefined,
    joinedAt: Date.now(),
  }

  if (!household.ownerUid) {
    const batch = writeBatch(db)
    batch.update(doc(db, 'households', household.id), { ownerUid: user.uid })
    batch.set(memberRef, memberData(member))
    await batch.commit()
    household.ownerUid = user.uid
  } else {
    await setDoc(memberRef, memberData(member))
  }
  return member
}

/** Rename a household. Allowed for owner/admin by the security rules. */
export async function renameHousehold(householdId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { name })
}

/** Accept an invite: join the household and remove the invite, atomically. */
export async function acceptInvite(user: User, invite: Invite): Promise<void> {
  const { householdId } = invite
  const batch = writeBatch(db)
  const member: Member = {
    uid: user.uid,
    role: invite.role,
    scopedGroupIds: invite.scopedGroupIds,
    email: emailKeyOf(user.email ?? invite.email),
    displayName: user.displayName ?? undefined,
    invitedByUid: invite.invitedByUid,
    joinedAt: Date.now(),
  }
  batch.set(doc(db, 'users', user.uid), {
    householdId,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
  })
  batch.update(doc(db, 'households', householdId), {
    memberUids: arrayUnion(user.uid),
  })
  batch.set(doc(db, 'households', householdId, 'members', user.uid), memberData(member))
  batch.delete(doc(db, 'households', householdId, 'invites', emailKeyOf(invite.email)))
  await batch.commit()
}

/** Member doc shape for Firestore (keeps `uid`, nulls optionals). */
function memberData(member: Member) {
  return {
    uid: member.uid,
    role: member.role,
    scopedGroupIds: member.scopedGroupIds,
    email: member.email,
    displayName: member.displayName ?? null,
    invitedByUid: member.invitedByUid ?? null,
    joinedAt: member.joinedAt,
  }
}
