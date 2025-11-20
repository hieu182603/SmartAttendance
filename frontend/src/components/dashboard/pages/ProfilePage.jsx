import React from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Profile } from '../Profile'

export default function ProfilePage() {
  const { user } = useAuth()

  // Map backend role to Profile component role
  const getRole = () => {
    if (!user?.role) return 'employee'
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER']
    return adminRoles.includes(user.role) ? 'admin' : 'employee'
  }

  return (
    <Profile 
      role={getRole()} 
      user={user}
    />
  )
}

