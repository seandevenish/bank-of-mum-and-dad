import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoadingScreen } from '../../components/LoadingScreen'
import { HouseholdErrorScreen } from '../../components/HouseholdErrorScreen'
import { useAuth } from './context'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, household, householdError, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/sign-in" replace />
  if (householdError) return <HouseholdErrorScreen message={householdError} />
  if (!household) return <LoadingScreen />
  return <>{children}</>
}
