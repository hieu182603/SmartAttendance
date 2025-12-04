import React, { useState, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  UserRole,
  type UserRoleType,
  canAccessAdminPanel,
  getRoleName,
  getRoleColor,
  getRoleBasePath,
} from "@/utils/roles";
import { getMenuByPermissionsWithTranslations, type MenuItem } from "@/utils/menuItems";


interface NotificationBellProps {
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const { unreadCount } = useNotifications();

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
  const { t } = useTranslation(['menu', 'common']);
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();

  const userRole: UserRoleType = (user?.role as UserRoleType) || UserRole.EMPLOYEE;
  
  // Memoize values that don't change on navigation
  const basePath = useMemo(() => getRoleBasePath(userRole), [userRole]);
  const tMenu = useTranslation("menu").t;
  const menu = useMemo(
    () => getMenuByPermissionsWithTranslations(tMenu, userRole, basePath),
    [tMenu, userRole, basePath]
  );
  const roleInfo = useMemo(() => getRoleColor(userRole), [userRole]);
  const roleName = useMemo(() => getRoleName(userRole), [userRole]);

  const filteredMenu = useMemo(() => {
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      const adminItems = menu.filter(item => item.section === 'admin' || item.section === 'system');
      const employeeItems = menu.filter(item => 
        item.section === 'employee' && (item.id === 'company-calendar' || item.id === 'profile')
      );
      return [...adminItems, ...employeeItems];
    }
    if (userRole === UserRole.HR_MANAGER || userRole === UserRole.MANAGER) {
      return menu;
    }
    return menu.filter(item => item.section === 'employee');
  }, [menu, userRole]);

  const currentPage = useMemo(() => {
    const path = location.pathname.replace(basePath, "").replace(/^\//, "");
    if (!path || path === "") return "home";
    return path;
  }, [location.pathname, basePath]);

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
            {/* Language Switcher */}
            <LanguageSwitcher />
            
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
                {user?.email || t('common:dashboard.user')}
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
              <span className="hidden md:inline">{t('common:dashboard.logout')}</span>
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
                admin: filteredMenu.filter(item => item.section === 'admin'),
                employee: filteredMenu.filter(item => item.section === 'employee'),
                system: filteredMenu.filter(item => item.section === 'system'),
              };

              return (
                <>
                  {/* Admin Section */}
                  {sections.admin.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                        {t('common:dashboard.sections.admin')}
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
                          {t('common:dashboard.sections.employee')}
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
                        {t('common:dashboard.sections.system')}
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




