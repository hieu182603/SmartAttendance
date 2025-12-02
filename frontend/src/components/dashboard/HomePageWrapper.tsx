import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { canAccessAdminPanel, type UserRoleType } from '@/utils/roles'
import DashboardOverview from '@/components/dashboard/Overview'
import EmployeeHome from '@/components/dashboard/EmployeeHome'

/**
 * Component wrapper để render đúng trang chủ theo role
 * - MANAGER+ → Dashboard Admin
 * - EMPLOYEE → Employee Home
 */
export default function HomePageWrapper(): React.JSX.Element {
  const { user } = useAuth()
  const userRole = user?.role as UserRoleType | undefined

  // Nếu có quyền admin → hiển thị Admin Dashboard
  if (userRole && canAccessAdminPanel(userRole)) {
    return <DashboardOverview />
  }

  // Nếu không → hiển thị Employee Home
  return <EmployeeHome />
}




