import type { LucideIcon } from 'lucide-react';
import {
  Home, Camera, History, FileText, Clock, CalendarDays, Calendar,
  User, BarChart3, CheckCircle2, Users, Shield, Briefcase, Building2,
  DollarSign, TrendingUp, Award, FileBarChart
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { Permission, type PermissionType, UserRole, ROLE_PERMISSIONS, type UserRoleType } from '@/utils/roles';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  permission?: PermissionType;
  section: 'admin' | 'employee' | 'system';
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'home',
    label: 'Trang chủ',
    icon: Home,
    path: '/employee',
    section: 'employee',
  },
  {
    id: 'scan',
    label: 'Chấm công',
    icon: Camera,
    path: '/employee/scan',
    section: 'employee',
  },
  {
    id: 'history',
    label: 'Lịch sử',
    icon: History,
    path: '/employee/history',
    section: 'employee',
  },
  {
    id: 'requests',
    label: 'Yêu cầu',
    icon: FileText,
    path: '/employee/requests',
    section: 'employee',
  },
  {
    id: 'leave-balance',
    label: 'Số ngày phép',
    icon: CalendarDays,
    path: '/employee/leave-balance',
    section: 'employee',
  },
  {
    id: 'schedule',
    label: 'Lịch làm việc',
    icon: Clock,
    path: '/employee/schedule',
    section: 'employee',
  },
  {
    id: 'company-calendar',
    label: 'Lịch công ty',
    icon: Calendar,
    path: '/employee/company-calendar',
    section: 'employee',
  },
  {
    id: 'profile',
    label: 'Hồ sơ',
    icon: User,
    path: '/employee/profile',
    section: 'employee',
  },
  // Admin Dashboard (home) - moved to admin section for admin roles in getMenuByPermissionsWithTranslations
  // Quản lý nhân viên
  {
    id: 'employee-management',
    label: 'Quản lý nhân viên',
    icon: Users,
    path: '/admin/employee-management',
    permission: Permission.USERS_VIEW,
    section: 'admin',
  },
  // Bảng lương
  {
    id: 'payroll',
    label: 'Bảng lương',
    icon: DollarSign,
    path: '/admin/payroll',
    permission: Permission.PAYROLL_VIEW,
    section: 'admin',
  },
  // Báo cáo lương
  {
    id: 'payroll-reports',
    label: 'Báo cáo lương',
    icon: TrendingUp,
    path: '/admin/payroll-reports',
    permission: Permission.PAYROLL_VIEW,
    section: 'admin',
  },
  // Phê duyệt yêu cầu - có thể ở manager, hr, hoặc admin
  {
    id: 'approve-requests',
    label: 'Phê duyệt yêu cầu',
    icon: CheckCircle2,
    path: '/admin/approve-requests', // Base path, sẽ được replace theo role
    permission: Permission.REQUESTS_APPROVE_DEPARTMENT,
    section: 'admin',
  },
  // Đánh giá hiệu suất - có thể ở manager, hr, hoặc admin
  {
    id: 'performance-review',
    label: 'Đánh giá hiệu suất',
    icon: Award,
    path: '/admin/performance-review', // Base path, sẽ được replace theo role
    permission: Permission.USERS_VIEW,
    section: 'admin',
  },
  // Chấm công - chỉ HR và Admin
  {
    id: 'admin-attendance',
    label: 'Quản lý chấm công',
    icon: Clock,
    path: '/admin/admin-attendance', // Base path, sẽ được replace theo role
    permission: Permission.ATTENDANCE_VIEW_ALL,
    section: 'admin',
  },
  // Ca làm việc - có thể ở manager, hr, hoặc admin
  {
    id: 'shifts',
    label: 'Quản lý ca làm việc',
    icon: Clock,
    path: '/admin/shifts', // Base path, sẽ được replace theo role
    permission: Permission.ATTENDANCE_VIEW_DEPARTMENT,
    section: 'admin',
  },
  // Báo cáo và thống kê - chỉ HR và Admin
  {
    id: 'admin-reports',
    label: 'Báo cáo & Thống kê',
    icon: FileBarChart,
    path: '/admin/admin-reports', // Base path, sẽ được replace theo role
    permission: Permission.VIEW_REPORTS,
    section: 'admin',
  },
  // Phân tích chấm công - có thể ở manager, hr, hoặc admin
  {
    id: 'attendance-analytics',
    label: 'Phân tích chấm công',
    icon: BarChart3,
    path: '/admin/attendance-analytics', // Base path, sẽ được replace theo role
    permission: Permission.ANALYTICS_VIEW_DEPARTMENT,
    section: 'admin',
  },
  {
    id: 'departments',
    label: 'Quản lý phòng ban',
    icon: Briefcase,
    path: '/admin/departments',
    permission: Permission.DEPARTMENTS_VIEW,
    section: 'admin',
  },
  {
    id: 'branches',
    label: 'Quản lý chi nhánh',
    icon: Building2,
    path: '/admin/branches',
    permission: Permission.BRANCHES_VIEW,
    section: 'admin',
  },
  {
    id: 'audit-logs',
    label: 'Nhật ký hệ thống',
    icon: Shield,
    path: '/admin/audit-logs',
    permission: Permission.AUDIT_LOGS_VIEW,
    section: 'system',
  },
  // trial-analytics removed
];

// Helper function to check if user has permission (including higher level permissions)
function hasPermission(userPermissions: PermissionType[], requiredPermission: PermissionType): boolean {
  if (userPermissions.includes(requiredPermission)) return true;
  
  // Check for higher level permissions
  const permissionHierarchy: Record<string, string[]> = {
    [Permission.REQUESTS_APPROVE_DEPARTMENT]: [Permission.REQUESTS_APPROVE_ALL],
    [Permission.ATTENDANCE_VIEW_DEPARTMENT]: [Permission.ATTENDANCE_VIEW_ALL],
    [Permission.ANALYTICS_VIEW_DEPARTMENT]: [Permission.ANALYTICS_VIEW_ALL],
  };
  
  const higherPermissions = permissionHierarchy[requiredPermission] || [];
  return higherPermissions.some(perm => userPermissions.includes(perm));
}

export function getMenuByPermissions(
  userRole: UserRoleType,
  basePath: string
): MenuItem[] {
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  
  return MENU_ITEMS
    .filter(item => {
      if (!item.permission) return true;
      return hasPermission(userPermissions, item.permission);
    })
    .map(item => ({
      ...item,
      path: item.path.replace(/^\/(employee|manager|hr|admin)/, basePath),
    }));
}

/**
 * Get menu items with translated labels
 * @param t - Translation function from useTranslation hook
 * @param userRole - User role
 * @param basePath - Base path for the role
 * @returns Menu items with translated labels
 */
export function getMenuByPermissionsWithTranslations(
  t: TFunction<any, undefined>,
  userRole: UserRoleType,
  basePath: string
): MenuItem[] {
  const menu = getMenuByPermissions(userRole, basePath);
  
  // Move "Trang chủ" (home) from employee section to admin section for admin roles
  const adminRoles: UserRoleType[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.SUPERVISOR];
  const isAdminRole = adminRoles.includes(userRole);
  
  return menu.map(item => {
    const menuItem = {
      ...item,
      label: t(`menu:${item.id}`) || item.label,
    };
    
    // Change section of "home" item to 'admin' for admin roles
    if (item.id === 'home' && isAdminRole) {
      menuItem.section = 'admin';
    }
    
    return menuItem;
  });
}

