import { useMemo } from 'react'
import { orderBy, query } from 'firebase/firestore'
import { useAuth } from '../auth/context'
import { useCollection } from '../../hooks/useCollection'
import { householdCollection } from '../../lib/firestore'
import type { Group } from '../../types/models'

export function useGroups() {
  const { household } = useAuth()
  const householdId = household?.id ?? null

  const groupsQuery = useMemo(
    () =>
      householdId
        ? query(householdCollection(householdId, 'groups'), orderBy('sortOrder'))
        : null,
    [householdId],
  )

  const { data, loading, error } = useCollection<Group>(groupsQuery, 'groups')
  return { groups: data, loading, error }
}
