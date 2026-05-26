/** Trang admin (path sau /admin) hỗ trợ lọc công ty cho SUPER_ADMIN. */
export const SUPER_ADMIN_COMPANY_FILTER_PAGES = new Set([
  'employee-management',
  'departments',
  'branches',
  'approve-requests',
  'admin-attendance',
  'attendance-analytics',
  'shifts',
  'leave-types',
  'performance-review',
  'payroll',
  'payroll-reports',
  'salary-matrix',
  'audit-logs',
  'admin-reports',
  'face-recognition-logs',
])

/** Tất cả trang dùng lọc trong card/header — không hiện trên layout. */
export const SUPER_ADMIN_COMPANY_FILTER_EMBEDDED_PAGES = SUPER_ADMIN_COMPANY_FILTER_PAGES

export const shouldShowSuperAdminCompanyFilter = (
  userRole: string | undefined,
  currentPage: string,
) => userRole === 'SUPER_ADMIN' && SUPER_ADMIN_COMPANY_FILTER_PAGES.has(currentPage)

/** Layout không render lọc công ty — chỉ dùng SuperAdminCompanyFilterSlot trong từng trang. */
export const shouldShowSuperAdminCompanyFilterInLayout = () => false
