import { addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { householdCollection, householdDoc } from '../../lib/firestore'
import type { Iso8601Date, Transaction } from '../../types/models'

export interface TransactionInput {
  accountId: string
  /** Denormalised from the account, for group-scoped write authorisation. */
  groupId: string
  date: Iso8601Date
  description: string
  amountMinor: number // signed: + credit / - debit
}

export async function addTransaction(
  householdId: string,
  createdByUid: string,
  input: TransactionInput,
): Promise<void> {
  await addDoc(householdCollection(householdId, 'transactions'), {
    accountId: input.accountId,
    groupId: input.groupId,
    date: input.date,
    description: input.description.trim(),
    amountMinor: input.amountMinor,
    source: 'manual',
    createdAt: Date.now(),
    createdByUid,
  })
}

export async function updateTransaction(
  householdId: string,
  id: string,
  patch: Partial<Pick<Transaction, 'date' | 'description' | 'amountMinor'>>,
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'transactions', id), patch)
}

export async function deleteTransaction(householdId: string, id: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'transactions', id))
}
