import { useMemo } from 'react'
import { orderBy, query } from 'firebase/firestore'
import { useAuth } from '../auth/context'
import { useCollection } from '../../hooks/useCollection'
import { householdCollection } from '../../lib/firestore'
import type { Transaction } from '../../types/models'

/**
 * Subscribe to *all* transactions in the household, newest first. The set is
 * small (family pocket money) so a single subscription is cheaper than one per
 * account, and per-account/per-balance views are derived client-side. Ordering
 * on `date` alone needs no composite index; ties are broken by `createdAt`.
 */
export function useTransactions() {
  const { household } = useAuth()
  const householdId = household?.id ?? null

  const txnQuery = useMemo(
    () =>
      householdId
        ? query(householdCollection(householdId, 'transactions'), orderBy('date', 'desc'))
        : null,
    [householdId],
  )

  const { data, loading, error } = useCollection<Transaction>(txnQuery, 'transactions')

  // Stable secondary sort so same-day transactions keep a deterministic order.
  const transactions = useMemo(
    () => [...data].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : 0)),
    [data],
  )

  return { transactions, loading, error }
}
