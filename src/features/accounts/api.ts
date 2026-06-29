import { addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { householdCollection, householdDoc } from '../../lib/firestore'
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
    currency: input.currency ?? 'GBP',
    openingBalanceMinor: input.openingBalanceMinor,
    archived: false,
    createdAt: Date.now(),
  })
}

export async function updateAccount(
  householdId: string,
  id: string,
  patch: Partial<Pick<Account, 'name' | 'groupId' | 'openingBalanceMinor' | 'archived'>>,
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'accounts', id), patch)
}

export async function deleteAccount(householdId: string, id: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'accounts', id))
}
