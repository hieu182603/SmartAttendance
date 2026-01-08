import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { canAccessAdminPanel, type UserRoleType, UserRole } from '@/utils/roles'
import DashboardOverview from '@/components/dashboard/Overview'
import EmployeeHome from '@/components/dashboard/EmployeeHome'
import TrialHome from '@/components/dashboard/TrialHome'


export default function HomePageWrapper(): React.JSX.Element {
  const { user } = useAuth()
  const userRole = user?.role as UserRoleType | undefined

  // Nếu có quyền admin → hiển thị Admin Dashboard
  if (userRole && canAccessAdminPanel(userRole)) {
    return <DashboardOverview />
  }

  // Nếu là trial user → hiển thị Trial Dashboard
  if (userRole === UserRole.TRIAL) {
    return <TrialHome />
  }

  // Nếu không → hiển thị Employee Home
  return <EmployeeHome />
}




