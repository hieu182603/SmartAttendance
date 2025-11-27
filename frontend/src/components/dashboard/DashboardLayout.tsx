import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Camera,
  History,
  FileText,
  Clock,
  CalendarDays,
  Calendar,
  User,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Bell,
  BarChart3,
  CheckCircle2,
  Users,
  Shield,
  Settings,
  Briefcase,
  Building2,
  DollarSign,
  TrendingUp,
  Award,

} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../ThemeProvider";
import { Button } from "../ui/button";
import NotificationCenter from "./NotificationCenter";
import {
  UserRole,
  type UserRoleType,
  canAccessAdminPanel,
  getRoleName,
  getRoleColor,
  getRoleBasePath,
} from "../../utils/roles";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  section: "admin" | "employee" | "system";
}

// Helper function to generate menu based on role
function getMenuByRole(role: UserRoleType): MenuItem[] {
  const basePath = getRoleBasePath(role);

  // Base employee menu (all roles have access, excluding home for admin roles)
  const baseMenu: MenuItem[] = [
    { id: "scan", label: "Quét QR", icon: Camera, path: `${basePath}/scan`, section: "employee" },
    { id: "history", label: "Lịch sử", icon: History, path: `${basePath}/history`, section: "employee" },
    { id: "requests", label: "Yêu cầu", icon: FileText, path: `${basePath}/requests`, section: "employee" },
    { id: "leave-balance", label: "Số ngày phép", icon: CalendarDays, path: `${basePath}/leave-balance`, section: "employee" },
    { id: "schedule", label: "Lịch làm việc", icon: Clock, path: `${basePath}/schedule`, section: "employee" },
    { id: "company-calendar", label: "Lịch công ty", icon: Calendar, path: `${basePath}/company-calendar`, section: "employee" },
    { id: "profile", label: "Hồ sơ", icon: User, path: `${basePath}/profile`, section: "employee" },
  ];

  // Simplified menu for admin roles (only company calendar and profile)
  const adminEmployeeMenu: MenuItem[] = [
    { id: "company-calendar", label: "Lịch công ty", icon: Calendar, path: `${basePath}/company-calendar`, section: "employee" },
    { id: "profile", label: "Hồ sơ", icon: User, path: `${basePath}/profile`, section: "employee" },
  ];

  // Home menu item
  const homeMenu: MenuItem = { id: "home", label: "Trang chủ", icon: Home, path: basePath, section: "admin" };

  // Admin menus for different roles (home is first in admin section)
  const adminMenus: Partial<Record<UserRoleType, MenuItem[]>> = {
    [UserRole.MANAGER]: [
      homeMenu,
      { id: "approve-requests", label: "Phê duyệt yêu cầu", icon: CheckCircle2, path: `${basePath}/approve-requests`, section: "admin" },
      { id: "department-attendance", label: "Chấm công (Phòng)", icon: CheckCircle2, path: `${basePath}/department-attendance`, section: "admin" },
      { id: "attendance-analytics", label: "Phân tích chấm công", icon: BarChart3, path: `${basePath}/attendance-analytics`, section: "admin" },
      { id: "admin-attendance", label: "Quản lý chấm công", icon: Clock, path: `${basePath}/admin-attendance`, section: "admin" },
      { id: "performance-review", label: "Đánh giá hiệu suất", icon: Award, path: `${basePath}/performance-review`, section: "admin" },
      { id: "shifts", label: "Quản lý ca làm việc", icon: Clock, path: `${basePath}/shifts`, section: "admin" },
    ],
    [UserRole.HR_MANAGER]: [
      homeMenu,
      { id: "employee-management", label: "Quản lý nhân viên", icon: Users, path: `${basePath}/employee-management`, section: "admin" },
      { id: "approve-requests", label: "Phê duyệt yêu cầu", icon: CheckCircle2, path: `${basePath}/approve-requests`, section: "admin" },
      { id: "attendance-analytics", label: "Phân tích chấm công", icon: BarChart3, path: `${basePath}/attendance-analytics`, section: "admin" },
      { id: "admin-attendance", label: "Quản lý chấm công", icon: Clock, path: `${basePath}/admin-attendance`, section: "admin" },
      { id: "payroll-reports", label: "Báo cáo lương", icon: TrendingUp, path: `${basePath}/payroll-reports`, section: "admin" },
      { id: "payroll", label: "Bảng lương", icon: DollarSign, path: `${basePath}/payroll`, section: "admin" },
      { id: "performance-review", label: "Đánh giá hiệu suất", icon: Award, path: `${basePath}/performance-review`, section: "admin" },
    ],
    [UserRole.ADMIN]: [
      homeMenu,
      { id: "employee-management", label: "Quản lý nhân viên", icon: Users, path: `${basePath}/employee-management`, section: "admin" },
      { id: "departments", label: "Quản lý phòng ban", icon: Briefcase, path: `${basePath}/departments`, section: "admin" },
      { id: "branches", label: "Quản lý chi nhánh", icon: Building2, path: `${basePath}/branches`, section: "admin" },
      { id: "approve-requests", label: "Phê duyệt yêu cầu", icon: CheckCircle2, path: `${basePath}/approve-requests`, section: "admin" },
      { id: "attendance-analytics", label: "Phân tích chấm công", icon: BarChart3, path: `${basePath}/attendance-analytics`, section: "admin" },
      { id: "admin-attendance", label: "Quản lý chấm công", icon: Clock, path: `${basePath}/admin-attendance`, section: "admin" },
      { id: "payroll-reports", label: "Báo cáo lương", icon: DollarSign, path: `${basePath}/payroll-reports`, section: "admin" },
      { id: "payroll", label: "Bảng lương", icon: TrendingUp, path: `${basePath}/payroll`, section: "admin" },
      { id: "performance-review", label: "Đánh giá hiệu suất", icon: Award, path: `${basePath}/performance-review`, section: "admin" },
      { id: "audit-logs", label: "Nhật ký hệ thống", icon: Shield, path: `${basePath}/audit-logs`, section: "system" },
      { id: "system-settings", label: "Cài đặt hệ thống", icon: Settings, path: `${basePath}/system-settings`, section: "system" },
    ],
    [UserRole.SUPER_ADMIN]: [
      homeMenu,
      { id: "employee-management", label: "Quản lý nhân viên", icon: Users, path: `${basePath}/employee-management`, section: "admin" },
      { id: "departments", label: "Quản lý phòng ban", icon: Briefcase, path: `${basePath}/departments`, section: "admin" },
      { id: "branches", label: "Quản lý chi nhánh", icon: Building2, path: `${basePath}/branches`, section: "admin" },
      { id: "approve-requests", label: "Phê duyệt yêu cầu", icon: CheckCircle2, path: `${basePath}/approve-requests`, section: "admin" },
      { id: "attendance-analytics", label: "Phân tích chấm công", icon: BarChart3, path: `${basePath}/attendance-analytics`, section: "admin" },
      { id: "payroll-reports", label: "Báo cáo lương", icon: TrendingUp, path: `${basePath}/payroll-reports`, section: "admin" },
      { id: "payroll", label: "Bảng lương", icon: DollarSign, path: `${basePath}/payroll`, section: "admin" },
      { id: "performance-review", label: "Đánh giá hiệu suất", icon: Award, path: `${basePath}/performance-review`, section: "admin" },
      { id: "admin-attendance", label: "Quản lý chấm công", icon: Clock, path: `${basePath}/admin-attendance`, section: "admin" },
      { id: "audit-logs", label: "Nhật ký hệ thống", icon: Shield, path: `${basePath}/audit-logs`, section: "system" },
      { id: "system-settings", label: "Cài đặt hệ thống", icon: Settings, path: `${basePath}/system-settings`, section: "system" },
    ],
  };

  // Get additional menus for the role
  const additionalMenus = adminMenus[role] || [];

  // For ADMIN and SUPER_ADMIN roles, use simplified employee menu
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
    return [...additionalMenus, ...adminEmployeeMenu];
  }

  // For other roles with admin access (MANAGER, HR_MANAGER), show full employee menu
  if (canAccessAdminPanel(role)) {
    return [...additionalMenus, ...baseMenu];
  }

  // For EMPLOYEE, add home to employee section
  return [{ id: "home", label: "Trang chủ", icon: Home, path: basePath, section: "employee" }, ...baseMenu];
}

interface NotificationBellProps {
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const unreadCount = 3; // TODO: Get from state/context/API

  return (
    <motion.button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Bell className="h-5 w-5 text-[var(--text-main)]" />
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-r from-[var(--error)] to-[var(--warning)] rounded-full text-xs text-white px-1"
        >
          {unreadCount}
        </motion.div>
      )}
    </motion.button>
  );
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();

  // Get user role and menu items
  const userRole: UserRoleType = (user?.role as UserRoleType) || UserRole.EMPLOYEE;
  const menu = getMenuByRole(userRole);
  const roleInfo = getRoleColor(userRole);
  const roleName = getRoleName(userRole);

  const getCurrentPage = (): string => {
    const basePath = getRoleBasePath(userRole);
    const path = location.pathname.replace(basePath, "").replace(/^\//, "");
    if (!path || path === "") return "home";
    return path;
  };
  const currentPage = getCurrentPage();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--shell)] border-b border-[var(--border)] backdrop-blur-md">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-[var(--text-main)] hover:bg-[var(--surface)] p-2 rounded-lg"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                <h1 className="text-xl">SmartAttendance</h1>
              </div>
              {canAccessAdminPanel(userRole) && (
                <span className={`px-2 py-1 text-xs rounded-md ${roleInfo.bg} ${roleInfo.text}`}>
                  {userRole === UserRole.SUPER_ADMIN ? 'SU' :
                    userRole === UserRole.ADMIN ? 'AD' :
                      userRole === UserRole.HR_MANAGER ? 'HR' :
                        userRole === UserRole.MANAGER ? 'MG' : 'EMP'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="text-[var(--text-main)] hover:bg-[var(--surface)]"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[var(--warning)]" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[var(--accent-cyan)]" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Notification Bell */}
            <NotificationBell onClick={() => setIsNotificationOpen(true)} />

            <div className="hidden md:block text-right">
              <p className="text-sm text-[var(--text-main)]">
                {user?.email || "Người dùng"}
              </p>
              <p className="text-xs text-[var(--text-sub)]">{roleName}</p>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface)]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 w-64 h-[calc(100vh-4rem)]
              bg-[var(--surface)] border-r border-[var(--border)]
              overflow-y-auto z-40
              transform transition-transform duration-200 ease-in-out
              ${isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
            }`}
        >
          <nav className="p-4 space-y-1 overflow-y-auto">
            {/* Group menu items by section */}
            {(() => {
              const sections: { admin: MenuItem[]; employee: MenuItem[]; system: MenuItem[] } = {
                admin: menu.filter(item => item.section === 'admin'),
                employee: menu.filter(item => item.section === 'employee'),
                system: menu.filter(item => item.section === 'system'),
              };

              return (
                <>
                  {/* Admin Section */}
                  {sections.admin.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                        Quản trị
                      </div>
                      {sections.admin.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`
                              w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                              transition-all duration-200
                              ${isActive
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-sm">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}

                  {/* Employee Section */}
                  {sections.employee.length > 0 && (
                    <div className="mb-4">
                      {sections.admin.length > 0 && (
                        <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                          Cá nhân
                        </div>
                      )}
                      {sections.employee.map((item) => {
                        const Icon = item.icon;
                        const basePath = getRoleBasePath(userRole);
                        const isActive =
                          currentPage === item.id ||
                          (item.id === "home" && location.pathname === basePath);
                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            end={item.id === "home"}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`
                              w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                              transition-all duration-200
                              ${isActive
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-sm">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}

                  {/* System Section */}
                  {sections.system.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                        Hệ thống
                      </div>
                      {sections.system.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`
                              w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                              transition-all duration-200
                              ${isActive
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-sm">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Đóng menu"
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                setIsSidebarOpen(false);
              }
            }}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 ml-0 lg:ml-64 h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;




