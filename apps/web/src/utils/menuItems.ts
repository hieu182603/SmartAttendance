import type { LucideIcon } from 'lucide-react';
import {
  Home, Camera, History, FileText, Clock, CalendarDays, Calendar,
  User, BarChart3, CheckCircle2, Users, Shield, Briefcase, Building2,
  DollarSign, TrendingUp, Award, FileBarChart, Table2, Bot, Wallet, Settings, ShieldCheck, ScanFace, Monitor, Activity, CheckSquare,
  ToggleRight, CreditCard, BookOpen
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { Permission, type PermissionType, UserRole, ROLE_PERMISSIONS, type UserRoleType, hasMinimumLevel } from '@/utils/roles';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  permission?: PermissionType;
  minimumRole?: UserRoleType;
  /** Roles that should NOT see this item even if they meet `minimumRole`. */
  excludeRoles?: UserRoleType[];
  section: 'admin' | 'employee' | 'system';
  /**
   * Khoá feature toggle tương ứng (featureKey trên DB).
   * Nếu toggle bị tắt (enabled=false), menu item này sẽ bị ẩn.
   */
  featureKey?: string;
}

/** SUPER_ADMIN là platform admin — không quản lý HR/ops của từng công ty. */
const EXCLUDE_COMPANY_OPERATIONS: UserRoleType[] = [
  UserRole.SUPER_ADMIN,
];

/** SUPER_ADMIN: platform + monitoring only — not tenant HR/org admin screens. */
const EXCLUDE_SUPER_ADMIN: UserRoleType[] = [UserRole.SUPER_ADMIN];

/** Thứ tự sidebar cho SUPER_ADMIN (số nhỏ = lên trên trong từng section). */
const SUPER_ADMIN_MENU_ORDER: Record<string, number> = {
  home: 0,
  'company-management': 10,
  'ticket-management': 20,
  'feature-toggles': 30,
  'google-analytics': 35,
  'ai-billing': 40,
  'system-health': 200,
  'active-sessions': 210,
  'audit-logs': 220,
  'system-config': 230,
  profile: 310,
  chatbot: 320,
};

function sortMenuForRole(items: MenuItem[], userRole: UserRoleType): MenuItem[] {
  if (userRole !== UserRole.SUPER_ADMIN) return items;
  return [...items].sort(
    (a, b) => (SUPER_ADMIN_MENU_ORDER[a.id] ?? 999) - (SUPER_ADMIN_MENU_ORDER[b.id] ?? 999)
  );
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
    featureKey: 'attendance',
  },
  {
    id: 'history',
    label: 'Lịch sử',
    icon: History,
    path: '/employee/history',
    section: 'employee',
    featureKey: 'attendance',
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
    featureKey: 'company_calendar',
  },
  {
    id: 'requests',
    label: 'Yêu cầu',
    icon: FileText,
    path: '/employee/requests',
    section: 'employee',
    featureKey: 'leave_management',
  },
  {
    id: 'leave-balance',
    label: 'Số ngày phép',
    icon: CalendarDays,
    path: '/employee/leave-balance',
    section: 'employee',
    featureKey: 'leave_management',
  },
  {
    id: 'profile',
    label: 'Hồ sơ',
    icon: User,
    path: '/employee/profile',
    section: 'employee',
  },
  {
    id: 'my-payslip',
    label: 'Phiếu lương của tôi',
    icon: Wallet,
    path: '/employee/my-payslip',
    section: 'employee',
    featureKey: 'payroll',
  },
  {
    id: 'chatbot',
    label: 'Trợ lý AI',
    icon: Bot,
    path: '/employee/chatbot',
    minimumRole: UserRole.EMPLOYEE,
    section: 'employee',
    featureKey: 'chatbot',
  },
  // ── Admin / Super Admin ─────────────────────────────────────────────────────
  // (Thứ tự hiển thị SUPER_ADMIN: xem SUPER_ADMIN_MENU_ORDER)
  {
    id: 'company-management',
    label: 'Quản lý công ty',
    icon: Building2,
    path: '/admin/company-management',
    minimumRole: UserRole.SUPER_ADMIN,
    section: 'admin',
  },
  {
    id: 'ticket-management',
    label: 'Quản lý thanh toán',
    icon: CreditCard,
    path: '/admin/ticket-management',
    minimumRole: UserRole.SUPER_ADMIN,
    section: 'admin',
  },
  {
    id: 'feature-toggles',
    label: 'Quản lý chức năng',
    icon: ToggleRight,
    path: '/admin/feature-toggles',
    minimumRole: UserRole.SUPER_ADMIN,
    section: 'admin',
  },
  {
    id: 'google-analytics',
    label: 'Google Analytics',
    icon: BarChart3,
    path: '/admin/google-analytics',
    minimumRole: UserRole.SUPER_ADMIN,
    section: 'admin',
  },
  {
    id: 'employee-management',
    label: 'Quản lý nhân viên',
    icon: Users,
    path: '/admin/employee-management',
    permission: Permission.USERS_VIEW,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'employee_management',
  },
  {
    id: 'departments',
    label: 'Quản lý phòng ban',
    icon: Briefcase,
    path: '/admin/departments',
    permission: Permission.DEPARTMENTS_VIEW,
    excludeRoles: EXCLUDE_SUPER_ADMIN,
    section: 'admin',
  },
  {
    id: 'branches',
    label: 'Quản lý chi nhánh',
    icon: Building2,
    path: '/admin/branches',
    permission: Permission.BRANCHES_VIEW,
    excludeRoles: EXCLUDE_SUPER_ADMIN,
    section: 'admin',
  },
  {
    id: 'approve-requests',
    label: 'Phê duyệt yêu cầu',
    icon: CheckCircle2,
    path: '/admin/approve-requests',
    permission: Permission.REQUESTS_APPROVE_DEPARTMENT,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'leave_management',
  },
  {
    id: 'admin-attendance',
    label: 'Quản lý chấm công',
    icon: Clock,
    path: '/admin/admin-attendance',
    permission: Permission.ATTENDANCE_VIEW_ALL,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'attendance',
  },
  {
    id: 'shifts',
    label: 'Quản lý ca làm việc',
    icon: Clock,
    path: '/admin/shifts',
    permission: Permission.ATTENDANCE_VIEW_DEPARTMENT,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
  },
  {
    id: 'leave-types',
    label: 'Quản lý loại phép',
    icon: CalendarDays,
    path: '/admin/leave-types',
    minimumRole: UserRole.HR_MANAGER,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
  },
  {
    id: 'performance-review',
    label: 'Đánh giá hiệu suất',
    icon: Award,
    path: '/admin/performance-review',
    minimumRole: UserRole.MANAGER,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'performance_review',
  },
  {
    id: 'task-management',
    label: 'Quản lý công việc',
    icon: CheckSquare,
    path: '/admin/task-management',
    minimumRole: UserRole.MANAGER,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
  },
  {
    id: 'attendance-analytics',
    label: 'Phân tích chấm công',
    icon: BarChart3,
    path: '/admin/attendance-analytics',
    permission: Permission.ANALYTICS_VIEW_DEPARTMENT,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'attendance_analytics',
  },
  {
    id: 'admin-reports',
    label: 'Báo cáo & Thống kê',
    icon: FileBarChart,
    path: '/admin/admin-reports',
    permission: Permission.VIEW_REPORTS,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
  },
  {
    id: 'payroll',
    label: 'Bảng lương',
    icon: DollarSign,
    path: '/admin/payroll',
    permission: Permission.PAYROLL_VIEW,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'payroll',
  },
  {
    id: 'payroll-reports',
    label: 'Báo cáo lương',
    icon: TrendingUp,
    path: '/admin/payroll-reports',
    permission: Permission.PAYROLL_VIEW,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'payroll',
  },
  {
    id: 'salary-matrix',
    label: 'Thang lương',
    icon: Table2,
    path: '/admin/salary-matrix',
    permission: Permission.PAYROLL_MANAGE,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'payroll',
  },
  // ── Hệ thống & giám sát ────────────────────────────────────────────────────
  {
    id: 'system-health',
    label: 'Trạng thái hệ thống',
    icon: Activity,
    path: '/admin/system-health',
    minimumRole: UserRole.ADMIN,
    section: 'system',
  },
  {
    id: 'active-sessions',
    label: 'Phiên đăng nhập',
    icon: Monitor,
    path: '/admin/active-sessions',
    minimumRole: UserRole.ADMIN,
    section: 'system',
  },
  {
    id: 'audit-logs',
    label: 'Nhật ký hệ thống',
    icon: Shield,
    path: '/admin/audit-logs',
    permission: Permission.AUDIT_LOGS_VIEW,
    section: 'system',
  },
  {
    id: 'system-config',
    label: 'Cấu hình hệ thống',
    icon: Settings,
    path: '/admin/system-config',
    permission: Permission.SYSTEM_SETTINGS_VIEW,
    excludeRoles: EXCLUDE_SUPER_ADMIN,
    section: 'system',
  },
  {
    id: 'role-management',
    label: 'Cấu hình quyền theo role',
    icon: ShieldCheck,
    path: '/admin/role-management',
    permission: Permission.USERS_MANAGE_ROLE,
    excludeRoles: EXCLUDE_SUPER_ADMIN,
    section: 'system',
  },
  {
    id: 'face-recognition-logs',
    label: 'Nhật ký khuôn mặt',
    icon: ScanFace,
    path: '/admin/face-recognition-logs',
    minimumRole: UserRole.ADMIN,
    excludeRoles: EXCLUDE_SUPER_ADMIN,
    section: 'system',
  },
  {
    id: 'ai-billing',
    label: 'Quản lý chi phí AI',
    icon: Bot,
    path: '/admin/ai-billing',
    minimumRole: UserRole.ADMIN,
    section: 'admin',
    featureKey: 'chatbot',
  },
  {
    id: 'company-regulations',
    label: 'AI Knowledge Base',
    icon: BookOpen,
    path: '/admin/regulations',
    minimumRole: UserRole.HR_MANAGER,
    excludeRoles: EXCLUDE_COMPANY_OPERATIONS,
    section: 'admin',
    featureKey: 'chatbot',
  },
];

export const PAYROLL_MENU_IDS = new Set(['payroll', 'payroll-reports', 'salary-matrix']);
export const PLATFORM_MENU_IDS = new Set([
  'company-management',
  'ticket-management',
  'feature-toggles',
  'google-analytics',
]);
/** HR day-to-day operations (collapsed group in sidebar). */
export const HR_OPERATIONS_MENU_IDS = new Set([
  'employee-management',
  'approve-requests',
  'admin-attendance',
  'shifts',
  'leave-types',
  'performance-review',
  'attendance-analytics',
  'admin-reports',
  'company-regulations',
]);
/** Company org structure — ADMIN only. */
export const ORG_MENU_IDS = new Set(['departments', 'branches']);
/** Department manager scope. */
export const DEPT_MANAGER_MENU_IDS = new Set([
  'approve-requests',
  'shifts',
  'attendance-analytics',
  'admin-reports',
  'performance-review',
  'task-management',
]);

/** Sidebar employee shortcuts when role uses a compact personal section. */
export const HR_PERSONAL_MENU_IDS = new Set([
  'home',
  'scan',
  'history',
  'requests',
  'leave-balance',
  'my-payslip',
  'company-calendar',
  'profile',
  'chatbot',
]);

/** Giám đốc (ADMIN): chỉ lịch công ty, hồ sơ, trợ lý AI — không menu nhân viên. */
export const ADMIN_PERSONAL_MENU_IDS = new Set([
  'company-calendar',
  'profile',
  'chatbot',
]);

/** Role-specific menu label keys (see menu.json). */
const MENU_LABEL_KEY_BY_ROLE: Partial<Record<UserRoleType, Partial<Record<string, string>>>> = {
  [UserRole.MANAGER]: {
    'approve-requests': 'approve-requests-dept',
    'admin-reports': 'admin-reports-dept',
  },
  [UserRole.HR_MANAGER]: {
    'approve-requests': 'approve-requests-company',
    'admin-reports': 'admin-reports-company',
  },
};

// Helper function to check if user has permission (including higher level permissions)
function hasPermission(userPermissions: PermissionType[], requiredPermission: PermissionType): boolean {
  if (userPermissions.includes(requiredPermission)) return true;
  
  // Check for higher level permissions (đồng bộ với roles.ts)
  const permissionHierarchy: Record<string, string[]> = {
    [Permission.REQUESTS_APPROVE_DEPARTMENT]: [Permission.REQUESTS_APPROVE_ALL],
    [Permission.ATTENDANCE_VIEW_DEPARTMENT]: [Permission.ATTENDANCE_VIEW_ALL],
    [Permission.ATTENDANCE_VIEW_OWN]: [Permission.ATTENDANCE_VIEW_DEPARTMENT, Permission.ATTENDANCE_VIEW_ALL],
    [Permission.ANALYTICS_VIEW_DEPARTMENT]: [Permission.ANALYTICS_VIEW_ALL],
    [Permission.REQUESTS_VIEW_OWN]: [Permission.REQUESTS_APPROVE_DEPARTMENT, Permission.REQUESTS_APPROVE_ALL],
    [Permission.USERS_VIEW_DEPARTMENT]: [Permission.USERS_VIEW],
    [Permission.USERS_UPDATE_DEPARTMENT]: [Permission.USERS_UPDATE],
    [Permission.SCHEDULE_VIEW_DEPARTMENT]: [Permission.SCHEDULE_MANAGE_DEPARTMENT],
    [Permission.PERFORMANCE_VIEW_DEPARTMENT]: [Permission.PERFORMANCE_MANAGE_DEPARTMENT],
  };
  
  const higherPermissions = permissionHierarchy[requiredPermission] || [];
  return higherPermissions.some(perm => userPermissions.includes(perm as PermissionType));
}

export function getMenuByPermissions(
  userRole: UserRoleType,
  basePath: string,
  overridePermissions?: PermissionType[]
): MenuItem[] {
  const userPermissions = overridePermissions ?? ROLE_PERMISSIONS[userRole] ?? [];

  return MENU_ITEMS
    .filter(item => {
      if (item.excludeRoles?.includes(userRole)) return false;
      if (item.minimumRole && !hasMinimumLevel(userRole, item.minimumRole)) return false;
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
  basePath: string,
  overridePermissions?: PermissionType[]
): MenuItem[] {
  const menu = getMenuByPermissions(userRole, basePath, overridePermissions);
  
  // Move "Trang chủ" (home) from employee section to admin section for admin roles
  const adminRoles: UserRoleType[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER];
  const isAdminRole = adminRoles.includes(userRole);
  
  const mapped = menu.map(item => {
    const labelKey = MENU_LABEL_KEY_BY_ROLE[userRole]?.[item.id] ?? item.id;
    const menuItem = {
      ...item,
      label: t(`menu:${labelKey}`) || item.label,
    };

    if (item.id === 'home' && isAdminRole) {
      menuItem.section = 'admin';
    }

    return menuItem;
  });

  return sortMenuForRole(mapped, userRole);
}

