import React, { Suspense, useState, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Bell,
  Wallet,
  ChevronDown,
  Building2,
  Briefcase,
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
import {
  getMenuByPermissionsWithTranslations,
  PAYROLL_MENU_IDS,
  PLATFORM_MENU_IDS,
  HR_OPERATIONS_MENU_IDS,
  ORG_MENU_IDS,
  DEPT_MANAGER_MENU_IDS,
  HR_PERSONAL_MENU_IDS,
  ADMIN_PERSONAL_MENU_IDS,
  type MenuItem,
} from "@/utils/menuItems";
import { usePermissionsOverride } from "@/context/PermissionsContext";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";



interface NotificationBellProps {
  onClick: () => void;
}

/** Chỉ chiếm vùng main — lazy route con bắt Suspense này thay vì Suspense bọc cả Routes ở App (tránh full màn hình). */
function OutletFallback() {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--text-sub)]">
      <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" aria-hidden />
      <span className="text-sm">{t("messages.loading")}</span>
    </div>
  );
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [openMenuGroups, setOpenMenuGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const userRole: UserRoleType = (user?.role as UserRoleType) || UserRole.EMPLOYEE;
  
  const basePath = useMemo(() => getRoleBasePath(userRole), [userRole]);
  const { getEffectivePermissions } = usePermissionsOverride();
  const effectivePerms = useMemo(() => getEffectivePermissions(userRole), [getEffectivePermissions, userRole]);
  const { isEnabled: isFeatureEnabled } = useFeatureToggles();
  const tMenu = useTranslation("menu").t;
  const menu = useMemo(
    () => getMenuByPermissionsWithTranslations(tMenu, userRole, basePath, effectivePerms),
    [tMenu, userRole, basePath, effectivePerms]
  );
  const roleInfo = useMemo(() => getRoleColor(userRole), [userRole]);
  const roleName = useMemo(() => getRoleName(userRole), [userRole]);

  const filteredMenu = useMemo(() => {
    // Lọc theo feature toggles trước
    const featureFiltered = menu.filter(
      item => !item.featureKey || isFeatureEnabled(item.featureKey)
    );

    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      const adminItems = featureFiltered.filter(item => item.section === 'admin' || item.section === 'system');
      const personalIds =
        userRole === UserRole.SUPER_ADMIN
          ? ['profile', 'chatbot']
          : [...ADMIN_PERSONAL_MENU_IDS];
      const employeeItems = featureFiltered.filter(
        item => item.section === 'employee' && personalIds.includes(item.id),
      );
      return [...adminItems, ...employeeItems];
    }
    if (userRole === UserRole.HR_MANAGER) {
      const adminItems = featureFiltered.filter(item => item.section === 'admin');
      const employeeItems = featureFiltered.filter(
        item => item.section === 'employee' && HR_PERSONAL_MENU_IDS.has(item.id),
      );
      return [...adminItems, ...employeeItems];
    }
    if (userRole === UserRole.MANAGER) {
      const deptAdminItems = featureFiltered.filter(
        item => item.section === 'admin' && DEPT_MANAGER_MENU_IDS.has(item.id),
      );
      const employeeItems = featureFiltered.filter(item => item.section === 'employee');
      return [...deptAdminItems, ...employeeItems];
    }
    return featureFiltered.filter(item => item.section === 'employee');
  }, [menu, userRole, isFeatureEnabled]);

  const currentPage = useMemo(() => {
    const path = location.pathname.replace(basePath, "").replace(/^\//, "");
    if (!path || path === "") return "home";
    return path;
  }, [location.pathname, basePath]);
  const isScanPage = location.pathname.endsWith("/scan");
  const isChatbotPage = location.pathname.endsWith("/chatbot");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--shell)] border-b border-[var(--border)] backdrop-blur-md">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-[var(--text-main)] hover:bg-[var(--surface)] p-2 rounded-lg -ml-1"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex text-[var(--text-main)] hover:bg-[var(--surface)] p-2 rounded-lg transition-all duration-200"
              title={isSidebarCollapsed ? t('common:dashboard.expand_sidebar') : t('common:dashboard.collapse_sidebar')}
            >
              <motion.div
                animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="h-5 w-5" />
              </motion.div>
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

          <div className="flex items-center gap-4 md:gap-6 shrink-0 ml-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="text-[var(--text-main)] hover:bg-[var(--surface)] shrink-0"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[var(--warning)]" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[var(--accent-cyan)]" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Notification Bell */}
            <div className="shrink-0">
              <NotificationBell onClick={() => setIsNotificationOpen(true)} />
            </div>

            <div className="hidden md:block text-right shrink-0">
              <p className="text-sm text-[var(--text-main)] truncate max-w-[120px] lg:max-w-[200px]" title={user?.name || user?.email || t('common:dashboard.user')}>
                {user?.name || user?.email || t('common:dashboard.user')}
              </p>
              <p className="text-xs text-[var(--text-sub)]">{t(`common:roles.${userRole}`)}</p>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface)] shrink-0 min-w-[100px]"
            >
              <LogOut className="h-4 w-4 mr-2 shrink-0" />
              <span className="hidden md:inline">{t('common:dashboard.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)]
              bg-[var(--surface)] border-r border-[var(--border)]
              overflow-y-auto z-40
              transform transition-all duration-200 ease-in-out
              ${isSidebarCollapsed ? "w-16" : "w-64"}
              ${isSidebarOpen
              ? "translate-x-0"
              : isSidebarCollapsed
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
        >
          <nav className={`space-y-1 overflow-y-auto ${isSidebarCollapsed ? "p-2" : "p-4"}`}>
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
                      {!isSidebarCollapsed && (
                        <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                          {t('common:dashboard.sections.admin')}
                        </div>
                      )}
                      {(() => {
                        const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;
                        const isHrManager = userRole === UserRole.HR_MANAGER;
                        const isAdmin = userRole === UserRole.ADMIN;
                        const isDeptManager = userRole === UserRole.MANAGER;

                        const payrollItems = sections.admin.filter((item) =>
                          PAYROLL_MENU_IDS.has(item.id),
                        );
                        const platformItems = isSuperAdmin
                          ? sections.admin.filter((item) => PLATFORM_MENU_IDS.has(item.id))
                          : [];
                        // ADMIN = company admin → has same HR ops view as HR_MANAGER
                        const hrOpsItems = (isHrManager || isAdmin)
                          ? sections.admin.filter((item) => HR_OPERATIONS_MENU_IDS.has(item.id))
                          : [];
                        const orgItems = isAdmin
                            ? sections.admin.filter((item) => ORG_MENU_IDS.has(item.id))
                            : [];
                        const deptMgrItems = isDeptManager
                          ? sections.admin.filter((item) => DEPT_MANAGER_MENU_IDS.has(item.id))
                          : [];

                        const groupedIds = new Set([
                          ...payrollItems.map((i) => i.id),
                          ...platformItems.map((i) => i.id),
                          ...hrOpsItems.map((i) => i.id),
                          ...orgItems.map((i) => i.id),
                          ...deptMgrItems.map((i) => i.id),
                        ]);

                        const otherAdminItems = sections.admin.filter(
                          (item) => !groupedIds.has(item.id),
                        );
                        const homeItem = otherAdminItems.find((item) => item.id === "home");
                        const mainAdminItems = otherAdminItems.filter((item) => item.id !== "home");
                        const isPayrollGroupActive = payrollItems.some(
                          (item) => currentPage === item.id,
                        );
                        const isPayrollGroupOpen = isPayrollGroupActive || openMenuGroups.payroll;
                        const isHrOpsGroupActive = hrOpsItems.some(
                          (item) => currentPage === item.id,
                        );
                        const isHrOpsGroupOpen = isHrOpsGroupActive || openMenuGroups.hrOps;
                        const isOrgGroupActive = orgItems.some((item) => currentPage === item.id);
                        const isOrgGroupOpen = isOrgGroupActive || openMenuGroups.org;

                        const renderNavItem = (item: MenuItem) => {
                          const Icon = item.icon;
                          const isActive = currentPage === item.id;
                          return (
                            <NavLink
                              key={item.id}
                              to={item.path}
                              onClick={() => setIsSidebarOpen(false)}
                              title={isSidebarCollapsed ? item.label : undefined}
                              className={`
                              w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-3 rounded-xl
                              transition-all duration-200
                              ${isActive
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                              }
                            `}
                            >
                              <Icon className="h-5 w-5" />
                              {!isSidebarCollapsed && <span className="text-sm">{item.label}</span>}
                            </NavLink>
                          );
                        };

                        const renderSubNavItem = (item: MenuItem) => {
                          const isActive = currentPage === item.id;
                          return (
                            <NavLink
                              key={item.id}
                              to={item.path}
                              onClick={() => setIsSidebarOpen(false)}
                              className={`
                                        w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200
                                        ${isActive
                                          ? "bg-[var(--primary)]/15 text-[var(--accent-cyan)]"
                                          : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                                        }
                                      `}
                            >
                              {item.label}
                            </NavLink>
                          );
                        };

                        return (
                          <>
                            {homeItem && renderNavItem(homeItem)}

                            {platformItems.map(renderNavItem)}

                            {orgItems.length > 0 && (
                              <div className={`${isSidebarCollapsed ? "mt-1" : "mt-2"}`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuGroups((prev) => ({ ...prev, org: !isOrgGroupOpen }))
                                  }
                                  title={isSidebarCollapsed ? tMenu("org-group") : undefined}
                                  className={`
                                w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-3 rounded-xl
                                transition-all duration-200
                                ${isOrgGroupActive
                                  ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                  : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                                }
                              `}
                                >
                                  <Building2 className="h-5 w-5" />
                                  {!isSidebarCollapsed && (
                                    <>
                                      <span className="text-sm flex-1 text-left">{tMenu("org-group")}</span>
                                      <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${isOrgGroupOpen ? "rotate-180" : ""}`}
                                      />
                                    </>
                                  )}
                                </button>
                                {!isSidebarCollapsed && isOrgGroupOpen && (
                                  <div className="mt-1 ml-4 space-y-1 border-l border-[var(--border)] pl-3">
                                    {orgItems.map(renderSubNavItem)}
                                  </div>
                                )}
                              </div>
                            )}

                            {hrOpsItems.length > 0 && (
                              <div className={`${isSidebarCollapsed ? "mt-1" : "mt-2"}`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuGroups((prev) => ({ ...prev, hrOps: !isHrOpsGroupOpen }))
                                  }
                                  title={isSidebarCollapsed ? tMenu("hr-operations-group") : undefined}
                                  className={`
                                w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-3 rounded-xl
                                transition-all duration-200
                                ${isHrOpsGroupActive
                                  ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                  : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                                }
                              `}
                                >
                                  <Briefcase className="h-5 w-5" />
                                  {!isSidebarCollapsed && (
                                    <>
                                      <span className="text-sm flex-1 text-left">{tMenu("hr-operations-group")}</span>
                                      <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${isHrOpsGroupOpen ? "rotate-180" : ""}`}
                                      />
                                    </>
                                  )}
                                </button>
                                {!isSidebarCollapsed && isHrOpsGroupOpen && (
                                  <div className="mt-1 ml-4 space-y-1 border-l border-[var(--border)] pl-3">
                                    {hrOpsItems.map(renderSubNavItem)}
                                  </div>
                                )}
                              </div>
                            )}

                            {deptMgrItems.map(renderNavItem)}

                            {mainAdminItems.map(renderNavItem)}

                            {payrollItems.length > 0 && (
                              <div className={`${isSidebarCollapsed ? "mt-1" : "mt-2"}`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuGroups((prev) => ({ ...prev, payroll: !isPayrollGroupOpen }))
                                  }
                                  title={isSidebarCollapsed ? tMenu("payroll-group") : undefined}
                                  className={`
                                w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-3 rounded-xl
                                transition-all duration-200
                                ${isPayrollGroupActive
                                      ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                      : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                                    }
                              `}
                                >
                                  <Wallet className="h-5 w-5" />
                                  {!isSidebarCollapsed && (
                                    <>
                                      <span className="text-sm flex-1 text-left">{tMenu("payroll-group")}</span>
                                      <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${isPayrollGroupOpen ? "rotate-180" : ""}`}
                                      />
                                    </>
                                  )}
                                </button>

                                {!isSidebarCollapsed && isPayrollGroupOpen && (
                                  <div className="mt-1 ml-4 space-y-1 border-l border-[var(--border)] pl-3">
                                    {payrollItems.map(renderSubNavItem)}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Employee Section */}
                  {sections.employee.length > 0 && (
                    <div className="mb-4">
                      {sections.admin.length > 0 && !isSidebarCollapsed && (
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
                            onClick={() => {
                              setIsSidebarOpen(false);
                            }}
                            title={isSidebarCollapsed ? item.label : undefined}
                            className={`
                              w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-3 rounded-xl
                              transition-all duration-200
                              ${isActive
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            {!isSidebarCollapsed && (
                              <span className="text-sm">{item.label}</span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}

                  {/* System Section */}
                  {sections.system.length > 0 && (
                    <div className="mb-4">
                      {!isSidebarCollapsed && (
                        <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                          {t('common:dashboard.sections.system')}
                        </div>
                      )}
                      {sections.system.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            onClick={() => {
                              setIsSidebarOpen(false);
                            }}
                            title={isSidebarCollapsed ? item.label : undefined}
                            className={`
                              w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "space-x-3 px-4"} py-3 rounded-xl
                              transition-all duration-200
                              ${isActive
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white shadow-lg"
                                : "text-[var(--text-main)] hover:bg-[var(--shell)]"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            {!isSidebarCollapsed && (
                              <span className="text-sm">{item.label}</span>
                            )}
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
        <main className={`flex-1 h-[calc(100vh-4rem)] transition-all duration-200 ease-in-out ${
          isChatbotPage
            ? "overflow-y-auto p-0"
            : isScanPage
            ? "overflow-hidden px-4 md:px-6 lg:px-8 py-0"
            : "overflow-y-auto p-4 md:p-6 lg:p-8"
        } ${
          isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        }`}>
          <Suspense fallback={<OutletFallback />}>
            <Outlet />
          </Suspense>
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




