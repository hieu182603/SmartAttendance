import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/ThemeProvider";
import LandingPage from "./components/LandingPage";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import VerifyOtp from "./components/auth/VerifyOtp";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import HomePageWrapper from "./components/dashboard/HomePageWrapper";
import ScanPage from "./components/dashboard/pages/ScanPage";
import SchedulePage from "./components/dashboard/pages/SchedulePage";
import RequestsPage from "./components/dashboard/pages/RequestsPage";
import HistoryPage from "./components/dashboard/pages/HistoryPage";
import LeaveBalancePage from "./components/dashboard/pages/LeaveBalancePage";
import NotificationsPage from "./components/dashboard/pages/NotificationsPage";
import CameraCheckinPage from "./components/dashboard/pages/CameraCheckinPage";
import ProfilePage from "./components/dashboard/pages/ProfilePage";
import NotFoundPage from "./components/NotFoundPage";

import CompanyCalendarPage from "./components/dashboard/pages/CompanyCalendarPage";
import ApproveRequestsPage from "./components/dashboard/pages/ApproveRequestsPage";
import AttendanceAnalyticsPage from "./components/dashboard/pages/AttendanceAnalyticsPage";
import EmployeeManagementPage from "./components/dashboard/pages/EmployeeManagementPage";
import PayrollReportsPage from "./components/dashboard/pages/PayrollReportsPage";
import AuditLogsPage from "./components/dashboard/pages/AuditLogsPage";
import SystemSettingsPage from "./components/dashboard/pages/SystemSettingsPage";
import { BranchesPage } from "./components/dashboard/pages/BranchesPage";
import { DepartmentsPage } from "./components/dashboard/pages/DepartmentsPage";
import DepartmentAttendancePage from "./components/dashboard/pages/DepartmentAttendancePage";
import { ShiftsPage } from "./components/dashboard/pages/ShiftsPage";
import PayrollPage from "./components/dashboard/pages/PayrollPage";
import PerformanceReviewPage from "./components/dashboard/pages/PerformanceReviewPage";
import AdminAttendancePage from "./components/dashboard/pages/AdminAttendancePage";
import { Navigate } from "react-router-dom";
import { UserRole } from "./utils/roles";


export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes - All authenticated users */}
        <Route element={<ProtectedRoute />}>
          {/* Employee Routes - All authenticated users */}
          <Route path="/employee" element={<DashboardLayout />}>
            <Route index element={<HomePageWrapper />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="leave-balance" element={<LeaveBalancePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="camera-checkin" element={<CameraCheckinPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="company-calendar" element={<CompanyCalendarPage />} />
            {/* Catch-all: redirect invalid employee routes to 404 */}
            <Route path="*" element={<Navigate to="/not-found" replace />} />
          </Route>

          {/* Manager Routes - MANAGER and above */}
          <Route element={<ProtectedRoute minimumRole={UserRole.MANAGER} />}>
            <Route path="/manager" element={<DashboardLayout />}>
              <Route index element={<HomePageWrapper />} />
              <Route path="scan" element={<ScanPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="leave-balance" element={<LeaveBalancePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="camera-checkin" element={<CameraCheckinPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="company-calendar" element={<CompanyCalendarPage />} />
              {/* Manager specific routes */}
              <Route path="approve-requests" element={<ApproveRequestsPage />} />
              <Route path="attendance-analytics" element={<AttendanceAnalyticsPage />} />
              <Route path="department-attendance" element={<DepartmentAttendancePage />} />
              <Route path="shifts" element={<ShiftsPage />} />
              {/* Catch-all: redirect invalid manager routes to 404 */}
              <Route path="*" element={<Navigate to="/not-found" replace />} />
            </Route>
          </Route>

          {/* HR Routes - HR_MANAGER and above */}
          <Route element={<ProtectedRoute minimumRole={UserRole.HR_MANAGER} />}>
            <Route path="/hr" element={<DashboardLayout />}>
              <Route index element={<HomePageWrapper />} />
              <Route path="scan" element={<ScanPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="leave-balance" element={<LeaveBalancePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="camera-checkin" element={<CameraCheckinPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="company-calendar" element={<CompanyCalendarPage />} />
              {/* HR specific routes */}
              <Route path="employee-management" element={<EmployeeManagementPage />} />

              <Route path="payroll-reports" element={<PayrollReportsPage />} />
              <Route path="approve-requests" element={<ApproveRequestsPage />} />
              <Route path="attendance-analytics" element={<AttendanceAnalyticsPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="performance-review" element={<PerformanceReviewPage />} />
              <Route path="admin-attendance" element={<AdminAttendancePage />} />
              {/* Catch-all: redirect invalid HR routes to 404 */}
              <Route path="*" element={<Navigate to="/not-found" replace />} />
            </Route>
          </Route>

          {/* Admin Routes - ADMIN and SUPER_ADMIN */}
          <Route element={<ProtectedRoute minimumRole={UserRole.ADMIN} />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<HomePageWrapper />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="company-calendar" element={<CompanyCalendarPage />} />
              {/* Admin specific routes */}
              <Route path="employee-management" element={<EmployeeManagementPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="approve-requests" element={<ApproveRequestsPage />} />
              <Route path="attendance-analytics" element={<AttendanceAnalyticsPage />} />
              <Route path="payroll-reports" element={<PayrollReportsPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="system-settings" element={<SystemSettingsPage />} />
              {/* Catch-all: redirect invalid admin routes to 404 */}
              <Route path="*" element={<Navigate to="/not-found" replace />} />
            </Route>
          </Route>
        </Route>

        {/* Public 404 route */}
        <Route path="/not-found" element={<NotFoundPage />} />
        {/* Final catch-all for any other invalid routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}

