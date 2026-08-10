import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { PageSkeleton } from '@/components/shared/skeletons'

interface ProtectedRouteProps {
  adminOnly?: boolean
  children?: ReactNode
}

export function ProtectedRoute({ adminOnly, children }: ProtectedRouteProps) {
  const { user, loading, isManager } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageSkeleton />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && !isManager) {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
