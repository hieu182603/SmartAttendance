import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { canAccessAdminPanel } from '../../utils/roles'
import DashboardOverview from './Overview'
import EmployeeHome from './EmployeeHome'

/**
 * Component wrapper để render đúng trang chủ theo role
 * - MANAGER+ → Dashboard Admin
 * - EMPLOYEE → Employee Home
 */
export default function HomePageWrapper() {
  const { user } = useAuth()
  const userRole = user?.role

  // Nếu có quyền admin → hiển thị Admin Dashboard
  if (userRole && canAccessAdminPanel(userRole)) {
    return <DashboardOverview />
  }

  // Nếu không → hiển thị Employee Home
  return <EmployeeHome />
}

