import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoadingScreen } from '../../components/LoadingScreen'
import { HouseholdErrorScreen } from '../../components/HouseholdErrorScreen'
import { InviteAcceptScreen } from '../members/InviteAcceptScreen'
import { useAuth } from './context'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, household, pendingInvites, householdError, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/sign-in" replace />
  if (householdError) return <HouseholdErrorScreen message={householdError} />
  // A newly invited user with no household yet chooses to join or start their own.
  if (!household && pendingInvites.length > 0) return <InviteAcceptScreen />
  if (!household) return <LoadingScreen />
  return <>{children}</>
}
