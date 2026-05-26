import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { UserRole } from '@/utils/roles'
import { CompanySelector } from '@/components/dashboard/CompanySelector'

interface SuperAdminCompanyFilterSlotProps {
  /** grid: full width cột filter; inline: 200px (mặc định) */
  layout?: 'inline' | 'grid'
}

/** Ô lọc công ty trong hàng filter — chỉ SUPER_ADMIN. */
export const SuperAdminCompanyFilterSlot: React.FC<SuperAdminCompanyFilterSlotProps> = ({
  layout = 'inline',
}) => {
  const { user } = useAuth()
  if (user?.role !== UserRole.SUPER_ADMIN) return null
  return <CompanySelector variant="filter" filterLayout={layout} />
}

export default SuperAdminCompanyFilterSlot
