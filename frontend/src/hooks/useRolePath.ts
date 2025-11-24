import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleBasePath, type UserRoleType } from '../utils/roles'

/**
 * Hook to get the current role-based base path from URL or user role
 * Returns the base path (e.g., /employee, /manager, /hr, /admin)
 */
export function useRolePath(): string {
  const location = useLocation()
  const { user } = useAuth()

  // Try to extract base path from current location
  const pathParts = location.pathname.split('/').filter(Boolean)
  const possibleBasePath = pathParts[0]

  // Check if the base path matches a known role path
  if (possibleBasePath && ['employee', 'manager', 'hr', 'admin'].includes(possibleBasePath)) {
    return `/${possibleBasePath}`
  }

  // Fallback to user's role base path
  if (user?.role) {
    return getRoleBasePath(user.role as UserRoleType)
  }

  // Default fallback
  return '/employee'
}


