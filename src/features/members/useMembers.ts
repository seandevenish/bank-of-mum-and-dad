import { useMemo } from 'react'
import { orderBy, query } from 'firebase/firestore'
import { useAuth } from '../auth/context'
import { useCollection } from '../../hooks/useCollection'
import { householdCollection } from '../../lib/firestore'
import type { Invite, Member } from '../../types/models'

export function useMembers() {
  const { household } = useAuth()
  const householdId = household?.id ?? null

  const membersQuery = useMemo(
    () =>
      householdId
        ? query(householdCollection(householdId, 'members'), orderBy('joinedAt'))
        : null,
    [householdId],
  )

  const { data, loading, error } = useCollection<Member>(membersQuery, 'members')
  return { members: data, loading, error }
}

/** Pending invites for the current household (for the management UI). */
export function useHouseholdInvites() {
  const { household } = useAuth()
  const householdId = household?.id ?? null

  const invitesQuery = useMemo(
    () =>
      householdId
        ? query(householdCollection(householdId, 'invites'), orderBy('createdAt'))
        : null,
    [householdId],
  )

  const { data, loading, error } = useCollection<Invite>(invitesQuery, 'invites')
  return { invites: data, loading, error }
}
