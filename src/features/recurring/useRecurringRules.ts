import { useMemo } from 'react'
import { orderBy, query } from 'firebase/firestore'
import { useAuth } from '../auth/context'
import { useCollection } from '../../hooks/useCollection'
import { householdCollection } from '../../lib/firestore'
import type { RecurringRule } from '../../types/models'

export function useRecurringRules() {
  const { household } = useAuth()
  const householdId = household?.id ?? null

  const rulesQuery = useMemo(
    () =>
      householdId
        ? query(householdCollection(householdId, 'recurringRules'), orderBy('createdAt'))
        : null,
    [householdId],
  )

  const { data, loading, error } = useCollection<RecurringRule>(rulesQuery, 'recurringRules')
  return { rules: data, loading, error }
}
