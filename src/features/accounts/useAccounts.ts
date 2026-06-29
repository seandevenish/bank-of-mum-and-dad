import { useMemo } from 'react'
import { orderBy, query } from 'firebase/firestore'
import { useAuth } from '../auth/context'
import { useCollection } from '../../hooks/useCollection'
import { householdCollection } from '../../lib/firestore'
import type { Account } from '../../types/models'

export function useAccounts() {
  const { household } = useAuth()
  const householdId = household?.id ?? null

  const accountsQuery = useMemo(
    () =>
      householdId
        ? query(householdCollection(householdId, 'accounts'), orderBy('createdAt'))
        : null,
    [householdId],
  )

  const { data, loading, error } = useCollection<Account>(accountsQuery, 'accounts')
  return { accounts: data, loading, error }
}
