import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useAuth } from './context'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}
