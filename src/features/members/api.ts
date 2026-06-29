import { arrayRemove, deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { householdDoc } from '../../lib/firestore'
import { emailKeyOf } from '../auth/household'
import type { MemberRole } from '../../types/models'

export interface InviteInput {
  email: string
  role: MemberRole
  scopedGroupIds: string[] | null
}

/** Record (or overwrite) a pending invite for an email at the given role/scope. */
export async function createInvite(
  householdId: string,
  householdName: string,
  invitedByUid: string,
  input: InviteInput,
): Promise<void> {
  const email = emailKeyOf(input.email)
  await setDoc(householdDoc(householdId, 'invites', email), {
    email,
    role: input.role,
    scopedGroupIds: input.scopedGroupIds,
    householdId,
    householdName,
    invitedByUid,
    createdAt: Date.now(),
    status: 'pending',
  })
}

export async function revokeInvite(householdId: string, email: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'invites', emailKeyOf(email)))
}

export async function updateMemberRole(
  householdId: string,
  uid: string,
  patch: { role?: MemberRole; scopedGroupIds?: string[] | null },
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'members', uid), patch)
}

/** Remove a member: drop their member doc and the household's memberUids entry. */
export async function removeMember(householdId: string, uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(householdDoc(householdId, 'members', uid))
  batch.update(doc(db, 'households', householdId), { memberUids: arrayRemove(uid) })
  await batch.commit()
}
