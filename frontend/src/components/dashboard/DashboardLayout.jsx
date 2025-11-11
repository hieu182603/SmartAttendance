import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  QrCode,
  History,
  FileText,
  Clock,
  Calendar,
  CalendarDays,
  User,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../ThemeProvider";
import { Button } from "../ui/button";

const employeeMenu = [
  { id: "home", label: "Trang chủ", icon: Home, path: "/employee" },
  { id: "scan", label: "Quét QR", icon: QrCode, path: "/employee/scan" },
  { id: "history", label: "Lịch sử", icon: History, path: "/employee/history" },
  {
    id: "requests",
    label: "Yêu cầu",
    icon: FileText,
    path: "/employee/requests",
  },
  {
    id: "leave-balance",
    label: "Số ngày phép",
    icon: CalendarDays,
    path: "/employee/leave-balance",
  },
  {
    id: "schedule",
    label: "Lịch làm việc",
    icon: Clock,
    path: "/employee/schedule",
  },
  { id: "profile", label: "Hồ sơ", icon: User, path: "/employee/profile" },
];

const NotificationBell = ({ onClick }) => (
  <button
    onClick={onClick}
    className="relative text-[var(--text-main)] hover:bg-[var(--surface)] p-2 rounded-lg transition"
  >
    <Bell className="h-5 w-5" />
    <span className="absolute top-1 right-1 h-2 w-2 bg-[var(--error)] rounded-full"></span>
  </button>
);

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();

  const getCurrentPage = () => {
    const path = location.pathname.replace("/employee", "").replace(/^\//, "");
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
              <p className="text-xs text-[var(--text-sub)]">Nhân viên</p>
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

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 
            bg-[var(--surface)] border-r border-[var(--border)]
            transform transition-transform duration-200 ease-in-out
            ${
              isSidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }
          `}
        >
          <nav className="p-4 space-y-1 overflow-y-auto">
            {/* Employee Section */}
            <div className="mb-4">
              <div className="px-3 mb-2 text-xs text-[var(--text-sub)] uppercase tracking-wider">
                Cá nhân
              </div>
              {employeeMenu.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentPage === item.id ||
                  (item.id === "home" && location.pathname === "/employee");
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.id === "home"}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                      transition-all duration-200
                      ${
                        isActive
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
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
