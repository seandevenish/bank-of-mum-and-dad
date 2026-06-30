import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { householdCollection, householdDoc } from '../../lib/firestore'
import { DEFAULT_CURRENCY } from '../../lib/currencies'
import type { Group } from '../../types/models'

export interface GroupInput {
  name: string
  color?: string
  sortOrder?: number
}

/** Name of the account every new group starts with, so it's usable immediately. */
export const DEFAULT_ACCOUNT_NAME = 'Spending'

/**
 * Create a group and, atomically, a first default account inside it so the group
 * is immediately usable for transactions.
 */
export async function addGroup(householdId: string, input: GroupInput): Promise<void> {
  const now = Date.now()
  const groupRef = doc(householdCollection(householdId, 'groups'))
  const accountRef = doc(householdCollection(householdId, 'accounts'))

  const batch = writeBatch(db)
  batch.set(groupRef, {
    name: input.name.trim(),
    color: input.color ?? null,
    sortOrder: input.sortOrder ?? now,
    createdAt: now,
  })
  batch.set(accountRef, {
    name: DEFAULT_ACCOUNT_NAME,
    groupId: groupRef.id,
    currency: DEFAULT_CURRENCY,
    openingBalanceMinor: 0,
    archived: false,
    createdAt: now,
  })
  await batch.commit()
}

export async function updateGroup(
  householdId: string,
  id: string,
  patch: Partial<Pick<Group, 'name' | 'color' | 'sortOrder'>>,
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'groups', id), patch)
}

export async function deleteGroup(householdId: string, id: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'groups', id))
}
