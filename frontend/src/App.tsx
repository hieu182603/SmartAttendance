import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import NotFoundPage from "@/components/NotFoundPage";
import { UserRole } from "@/utils/roles";

// Public Pages - Lazy Load
const LandingPage = lazy(() => import("@/components/LandingPage"));
const Login = lazy(() => import("@/components/auth/Login"));
const Register = lazy(() => import("@/components/auth/Register"));
const VerifyOtp = lazy(() => import("@/components/auth/VerifyOtp"));
const ForgotPassword = lazy(() => import("@/components/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/components/auth/ResetPassword"));

// Dashboard Pages - Lazy Load
const HomePageWrapper = lazy(() => import("@/components/dashboard/HomePageWrapper"));
const ScanPage = lazy(() => import("@/components/dashboard/pages/ScanPage"));
const SchedulePage = lazy(() => import("@/components/dashboard/pages/SchedulePage"));
const RequestsPage = lazy(() => import("@/components/dashboard/pages/RequestsPage"));
const HistoryPage = lazy(() => import("@/components/dashboard/pages/HistoryPage"));
const LeaveBalancePage = lazy(() => import("@/components/dashboard/pages/LeaveBalancePage"));
const NotificationsPage = lazy(() => import("@/components/dashboard/pages/NotificationsPage"));
const CameraCheckinPage = lazy(() => import("@/components/dashboard/pages/CameraCheckinPage"));
const ProfilePage = lazy(() => import("@/components/dashboard/pages/ProfilePage"));
const CompanyCalendarPage = lazy(() => import("@/components/dashboard/pages/CompanyCalendarPage"));
const ApproveRequestsPage = lazy(() => import("@/components/dashboard/pages/ApproveRequestsPage"));
const AttendanceAnalyticsPage = lazy(() => import("@/components/dashboard/pages/AttendanceAnalyticsPage"));
const EmployeeManagementPage = lazy(() => import("@/components/dashboard/pages/EmployeeManagementPage"));
const PayrollReportsPage = lazy(() => import("@/components/dashboard/pages/PayrollReportsPage"));
const AuditLogsPage = lazy(() => import("@/components/dashboard/pages/AuditLogsPage"));
const DepartmentAttendancePage = lazy(() => import("@/components/dashboard/pages/DepartmentAttendancePage"));
const PayrollPage = lazy(() => import("@/components/dashboard/pages/PayrollPage"));
const PerformanceReviewPage = lazy(() => import("@/components/dashboard/pages/PerformanceReviewPage"));
const AdminAttendancePage = lazy(() => import("@/components/dashboard/pages/AdminAttendancePage"));

// Named Exports - Lazy Load with proper handling
const BranchesPage = lazy(() =>
  import("@/components/dashboard/pages/BranchesPage").then((module) => ({
    default: module.BranchesPage,
  }))
);
const DepartmentsPage = lazy(() =>
  import("@/components/dashboard/pages/DepartmentsPage").then((module) => ({
    default: module.DepartmentsPage,
  }))
);
const ShiftsPage = lazy(() =>
  import("@/components/dashboard/pages/ShiftsPage").then((module) => ({
    default: module.ShiftsPage,
  }))
);


// Loading component sử dụng Loader2 từ lucide-react
const PageLoading = () => {
  const { t } = useTranslation(['common']);
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
        <p className="text-[var(--text-sub)] text-sm font-medium">{t('common:messages.loading')}</p>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<PageLoading />}>
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
                <Route path="performance-review" element={<PerformanceReviewPage />} />
                <Route path="shifts" element={<ShiftsPage />} />
                <Route path="admin-attendance" element={<AdminAttendancePage />} />
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
                <Route path="admin-attendance" element={<AdminAttendancePage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
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
      </Suspense>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}

