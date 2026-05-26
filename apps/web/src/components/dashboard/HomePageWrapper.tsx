import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { canAccessAdminPanel, type UserRoleType, UserRole } from '@/utils/roles'
import DashboardOverview from '@/components/dashboard/Overview'
import SuperAdminOverview from '@/components/dashboard/SuperAdminOverview'
import EmployeeHome from '@/components/dashboard/EmployeeHome'
import TrialHome from '@/components/dashboard/TrialHome'


export default function HomePageWrapper(): React.JSX.Element {
  const { user } = useAuth()
  const userRole = user?.role as UserRoleType | undefined

  // SUPER_ADMIN → dashboard nền tảng riêng (billing, companies, platform stats)
  if (userRole === UserRole.SUPER_ADMIN) {
    return <SuperAdminOverview />
  }

  // Các role admin khác → Admin Dashboard tổng quan
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




