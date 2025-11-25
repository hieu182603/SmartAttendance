import React from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Profile } from '../Profile'
import { UserRole, type UserRoleType } from '../../../utils/roles'

export default function ProfilePage(): React.JSX.Element {
  const { user } = useAuth()

  // Map user role - Profile component will use roles.ts internally, but we keep this for compatibility
  const getRole = (): string => {
    if (!user?.role) return 'employee'
    // Use UserRole constants instead of hardcoded strings
    const adminRoles: UserRoleType[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER]
    return adminRoles.includes(user.role as UserRoleType) ? 'admin' : 'employee'
  }

  return (
    <Profile 
      role={getRole()} 
      user={user}
    />
  )
}




