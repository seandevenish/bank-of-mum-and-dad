import { addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { householdCollection, householdDoc } from '../../lib/firestore'
import type { Account, Iso8601Date, Transaction } from '../../types/models'

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

export interface TransferInput {
  from: Account
  to: Account
  amountMinor: number // magnitude > 0; debited from `from`, credited to `to`
  date: Iso8601Date
  description: string
}

/**
 * Record a transfer as two linked transactions: a debit on the source account
 * and a matching credit on the destination, sharing a `transferId`. Both legs
 * must be the same currency (enforced by the caller) so per-currency balances
 * stay correct.
 */
export async function addTransfer(
  householdId: string,
  createdByUid: string,
  input: TransferInput,
): Promise<void> {
  const txns = householdCollection(householdId, 'transactions')
  const outRef = doc(txns)
  const inRef = doc(txns)
  const transferId = outRef.id
  const description = input.description.trim()
  const createdAt = Date.now()
  const magnitude = Math.abs(input.amountMinor)

  const batch = writeBatch(db)
  batch.set(outRef, {
    accountId: input.from.id,
    groupId: input.from.groupId,
    counterpartAccountId: input.to.id,
    transferId,
    date: input.date,
    description,
    amountMinor: -magnitude,
    source: 'manual',
    createdAt,
    createdByUid,
  })
  batch.set(inRef, {
    accountId: input.to.id,
    groupId: input.to.groupId,
    counterpartAccountId: input.from.id,
    transferId,
    date: input.date,
    description,
    amountMinor: magnitude,
    source: 'manual',
    createdAt,
    createdByUid,
  })
  await batch.commit()
}

/** Delete several transactions at once — used to remove both legs of a transfer. */
export async function deleteTransactions(householdId: string, ids: string[]): Promise<void> {
  const batch = writeBatch(db)
  for (const id of ids) batch.delete(householdDoc(householdId, 'transactions', id))
  await batch.commit()
}
