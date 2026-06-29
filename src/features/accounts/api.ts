import {
  addDoc,
  deleteDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { householdCollection, householdDoc } from '../../lib/firestore'
import { DEFAULT_CURRENCY } from '../../lib/currencies'
import type { Account } from '../../types/models'

export interface AccountInput {
  name: string
  groupId: string
  openingBalanceMinor: number
  currency?: string
}

export async function addAccount(householdId: string, input: AccountInput): Promise<void> {
  await addDoc(householdCollection(householdId, 'accounts'), {
    name: input.name.trim(),
    groupId: input.groupId,
    currency: input.currency ?? DEFAULT_CURRENCY,
    openingBalanceMinor: input.openingBalanceMinor,
    archived: false,
    createdAt: Date.now(),
  })
}

export async function updateAccount(
  householdId: string,
  id: string,
  patch: Partial<Pick<Account, 'name' | 'groupId' | 'openingBalanceMinor' | 'archived' | 'currency'>>,
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'accounts', id), patch)
}

export async function deleteAccount(householdId: string, id: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'accounts', id))
}

/**
 * Keep the denormalised `groupId` on an account's transactions and recurring
 * rules in sync after the account is moved to a different group. Without this,
 * group-scoped write authorisation would key off a stale group.
 */
export async function propagateAccountGroup(
  householdId: string,
  accountId: string,
  groupId: string,
): Promise<void> {
  for (const name of ['transactions', 'recurringRules'] as const) {
    const snap = await getDocs(
      query(householdCollection(householdId, name), where('accountId', '==', accountId)),
    )
    const stale = snap.docs.filter((d) => d.data().groupId !== groupId)
    // Firestore batches cap at 500 writes; chunk to stay safely under.
    for (let i = 0; i < stale.length; i += 400) {
      const batch = writeBatch(db)
      for (const d of stale.slice(i, i + 400)) batch.update(d.ref, { groupId })
      await batch.commit()
    }
  }
}
