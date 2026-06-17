import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ChatbotProvider } from "@/context/ChatbotContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UserRole, Permission } from "@/utils/roles";

// Public Pages - Lazy Load
const LandingPage = lazy(() => import("@/components/LandingPage"));
const PrivacyPolicyPage = lazy(() => import("@/components/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(
  () => import("@/components/TermsOfServicePage"),
);
const PublicPricingPage = lazy(() => import("@/components/PublicPricingPage"));
const AboutUsPage = lazy(() => import("@/components/AboutUsPage"));
const FeaturesPage = lazy(() => import("@/components/FeaturesPage"));
const CustomersPage = lazy(() => import("@/components/CustomersPage"));
const UserGuidePage = lazy(() => import("@/components/UserGuidePage"));
const FAQPage = lazy(() => import("@/components/FAQPage"));
const TechSupportPage = lazy(() => import("@/components/TechSupportPage"));
const Login = lazy(() => import("@/components/auth/Login"));
const Register = lazy(() => import("@/components/auth/Register"));
const VerifyOtp = lazy(() => import("@/components/auth/VerifyOtp"));
const ForgotPassword = lazy(() => import("@/components/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/components/auth/ResetPassword"));

// Dashboard Pages - Lazy Load
const HomePageWrapper = lazy(
  () => import("@/components/dashboard/HomePageWrapper"),
);
const ScanPage = lazy(() => import("@/components/dashboard/pages/ScanPage"));
const SchedulePage = lazy(() => import("@/components/dashboard/pages/SchedulePage"));
const RequestsPage = lazy(() => import("@/components/dashboard/pages/RequestsPage"));
const HistoryPage = lazy(() => import("@/components/dashboard/pages/HistoryPage"));
const LeaveBalancePage = lazy(() => import("@/components/dashboard/pages/LeaveBalancePage"));
const NotificationsPage = lazy(() => import("@/components/dashboard/pages/NotificationsPage"));
const CameraCheckinPage = lazy(() => import("@/components/dashboard/pages/CameraCheckinPage"));
const ProfilePage = lazy(() => import("@/components/dashboard/pages/ProfilePage"));
const FaceRegistrationPage = lazy(() => import("@/components/dashboard/pages/FaceRegistrationPage"));
const CompanyCalendarPage = lazy(() => import("@/components/dashboard/pages/CompanyCalendarPage"));
const ApproveRequestsPage = lazy(() => import("@/components/dashboard/pages/ApproveRequestsPage"));
const AttendanceAnalyticsPage = lazy(() => import("@/components/dashboard/pages/AttendanceAnalyticsPage"));
const EmployeeManagementPage = lazy(() => import("@/components/dashboard/pages/EmployeeManagementPage"));
const PayrollReportsPage = lazy(() => import("@/components/dashboard/pages/PayrollReportsPage"));
const AuditLogsPage = lazy(() => import("@/components/dashboard/pages/AuditLogsPage"));
const PayrollPage = lazy(() => import("@/components/dashboard/pages/PayrollPage"));
const PerformanceReviewPage = lazy(() => import("@/components/dashboard/pages/PerformanceReviewPage"));
const AdminAttendancePage = lazy(() => import("@/components/dashboard/pages/AdminAttendancePage"));
const AdminReportsPage = lazy(() => import("@/components/dashboard/pages/AdminReportsPage"));
const UpgradePage = lazy(() => import("@/components/dashboard/pages/UpgradePage"));
const PaymentReturnPage = lazy(() => import("@/components/PaymentReturnPage"));
const AiPaymentReturnPage = lazy(() => import("@/components/AiPaymentReturnPage"));
const AiUsageBillingPage = lazy(() => import("@/components/dashboard/pages/AiUsageBillingPage"));
const ChatbotPage = lazy(() => import("@/components/dashboard/pages/ChatbotPage"));
const MyPayslipPage = lazy(() => import("@/components/dashboard/pages/MyPayslipPage"));
// Trial analytics page removed

// Named Exports - Lazy Load with proper handling
const BranchesPage = lazy(() =>
  import("@/components/dashboard/pages/BranchesPage").then((module) => ({
    default: module.BranchesPage,
  })),
);
const DepartmentsPage = lazy(() =>
  import("@/components/dashboard/pages/DepartmentsPage").then((module) => ({
    default: module.DepartmentsPage,
  })),
);
const ShiftsPage = lazy(() =>
  import("@/components/dashboard/pages/ShiftsPage").then((module) => ({
    default: module.ShiftsPage,
  })),
);
const SalaryMatrixManagementPage = lazy(
  () => import("@/components/dashboard/pages/SalaryMatrixManagementPage"),
);
const SystemConfigPage = lazy(
  () => import("@/components/dashboard/pages/SystemConfigPage"),
);
const RoleManagementPage = lazy(
  () => import("@/components/dashboard/pages/RoleManagementPage"),
);
const FaceRecognitionLogPage = lazy(
  () => import("@/components/dashboard/pages/FaceRecognitionLogPage"),
);
const ActiveSessionsPage = lazy(
  () => import("@/components/dashboard/pages/ActiveSessionsPage"),
);
const SystemHealthPage = lazy(
  () => import("@/components/dashboard/pages/SystemHealthPage"),
);
const LeaveTypeManagementPage = lazy(
  () => import("@/components/dashboard/pages/LeaveTypeManagementPage"),
);
const LeaveApprovalPage = lazy(
  () => import("@/components/dashboard/pages/LeaveApprovalPage"),
);
const FeatureTogglePage = lazy(() =>
  import("@/components/dashboard/pages/FeatureTogglePage")
);
const TicketManagementPage = lazy(() =>
  import("@/components/dashboard/pages/TicketManagementPage")
);
const CompanyManagementPage = lazy(() =>
  import("@/components/dashboard/pages/CompanyManagementPage")
);
const GoogleAnalyticsPage = lazy(() =>
  import("@/components/dashboard/pages/GoogleAnalyticsPage")
);
const RegulationsPage = lazy(() =>
  import("@/components/dashboard/pages/RegulationsPage")
);

// Layout & Common Components - Lazy Load
const DashboardLayout = lazy(
  () => import("@/components/dashboard/DashboardLayout"),
);
const NotFoundPage = lazy(() => import("@/components/NotFoundPage"));

// Loading component sử dụng Loader2 từ lucide-react
const PageLoading = () => {
  const { t } = useTranslation(["common"]);
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
        <p className="text-[var(--text-sub)] text-sm font-medium">
          {t("common:messages.loading")}
        </p>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ChatbotProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PublicPricingPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-reset-otp" element={<VerifyOtp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/payment/return" element={<PaymentReturnPage />} />
            <Route path="/payment/ai-return" element={<AiPaymentReturnPage />} />

            {/* Protected Routes - All authenticated users */}
            <Route element={<ProtectedRoute />}>
              {/* Employee Routes - All authenticated users */}
              <Route path="/employee" element={<DashboardLayout />}>
                <Route index element={<HomePageWrapper />} />
                <Route path="scan" element={
                    <ProtectedRoute featureKey="attendance" />
                  }>
                  <Route index element={<ScanPage />} />
                </Route>
                <Route path="schedule" element={<SchedulePage />} />
                <Route element={
                    <ProtectedRoute featureKey="leave_management" />
                  }>
                  <Route path="requests" element={<RequestsPage />} />
                  <Route path="leave-balance" element={<LeaveBalancePage />} />
                </Route>
                <Route path="history" element={
                    <ProtectedRoute featureKey="attendance" />}>
                  <Route index element={<HistoryPage />} />
                </Route>
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="camera-checkin" element={
                    <ProtectedRoute featureKey="attendance" />}>
                  <Route index element={<CameraCheckinPage />} />
                </Route>
                <Route
                  path="face-registration"
                  element={<FaceRegistrationPage />}
                />
                <Route path="profile" element={<ProfilePage />} />
                <Route
                  path="company-calendar"
                  element={<ProtectedRoute featureKey="company_calendar" />}
                >
                  <Route index element={<CompanyCalendarPage />} />
                </Route>
                <Route
                  path="upgrade"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        UserRole.TRIAL, UserRole.EMPLOYEE,
                        UserRole.MANAGER, UserRole.HR_MANAGER, UserRole.ADMIN,
                      ]}
                    />
                  }
                >
                  <Route index element={<UpgradePage />} />
                </Route>
                <Route element={<ProtectedRoute minimumRole={UserRole.EMPLOYEE} featureKey="chatbot" />}>
                  <Route path="chatbot" element={<ChatbotPage />} />
                </Route>
                <Route path="my-payslip" element={
                    <ProtectedRoute featureKey="payroll" />}>
                  <Route index element={<MyPayslipPage />} />
                </Route>
                {/* Catch-all: redirect invalid employee routes to 404 */}
                <Route
                  path="*"
                  element={<Navigate to="/not-found" replace />}
                />
              </Route>

              {/* Manager Routes */}
              <Route
                element={<ProtectedRoute minimumRole={UserRole.MANAGER} />}
              >
                <Route path="/manager" element={<DashboardLayout />}>
                  {/* Common employee routes */}
                  <Route path="scan" element={
                      <ProtectedRoute featureKey="attendance" />}>
                    <Route index element={<ScanPage />} />
                  </Route>
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route element={
                      <ProtectedRoute featureKey="leave_management" />}>
                    <Route path="requests" element={<RequestsPage />} />
                    <Route path="leave-balance" element={<LeaveBalancePage />} />
                  </Route>
                  <Route path="history" element={
                      <ProtectedRoute featureKey="attendance" />}>
                    <Route index element={<HistoryPage />} />
                  </Route>
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route
                    path="camera-checkin"
                    element={<ProtectedRoute featureKey="attendance" />}
                  >
                    <Route index element={<CameraCheckinPage />} />
                  </Route>
                  <Route
                    path="face-registration"
                    element={<FaceRegistrationPage />}
                  />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route
                    path="company-calendar"
                    element={<ProtectedRoute featureKey="company_calendar" />}
                  >
                    <Route index element={<CompanyCalendarPage />} />
                  </Route>
                  <Route element={<ProtectedRoute minimumRole={UserRole.EMPLOYEE} featureKey="chatbot" />}>
                  <Route path="chatbot" element={<ChatbotPage />} />
                </Route>
                  <Route path="my-payslip" element={
                      <ProtectedRoute featureKey="payroll" />}>
                    <Route index element={<MyPayslipPage />} />
                  </Route>
                  {/* Manager specific routes with permission checks */}
                  <Route index element={<HomePageWrapper />} />
                  <Route
                    path="approve-requests"
                    element={
                      <ProtectedRoute
                        permission={Permission.REQUESTS_APPROVE_DEPARTMENT}
                        featureKey="leave_management"
                      />
                    }
                  >
                    <Route index element={<ApproveRequestsPage />} />
                  </Route>
                  <Route
                    path="attendance-analytics"
                    element={
                      <ProtectedRoute
                        permission={Permission.ANALYTICS_VIEW_DEPARTMENT}
                        featureKey="attendance_analytics"
                      />
                    }
                  >
                    <Route index element={<AttendanceAnalyticsPage />} />
                  </Route>
                  <Route
                    path="performance-review"
                    element={
                      <ProtectedRoute permission={Permission.USERS_VIEW} featureKey="performance_review" />
                    }
                  >
                    <Route index element={<PerformanceReviewPage />} />
                  </Route>
                  <Route
                    path="shifts"
                    element={
                      <ProtectedRoute
                        permission={Permission.ATTENDANCE_VIEW_DEPARTMENT}
                      />
                    }
                  >
                    <Route index element={<ShiftsPage />} />
                  </Route>
                  <Route
                    path="admin-reports"
                    element={
                      <ProtectedRoute permission={Permission.VIEW_REPORTS} />
                    }
                  >
                    <Route index element={<AdminReportsPage />} />
                  </Route>
                  <Route
                    path="leave-approval"
                    element={
                      <ProtectedRoute
                        permission={Permission.REQUESTS_APPROVE_DEPARTMENT}
                      />
                    }
                  >
                    <Route index element={<LeaveApprovalPage />} />
                  </Route>
                  <Route path="leave-types">
                    <Route index element={<LeaveTypeManagementPage />} />
                  </Route>
                  {/* REMOVED: admin-attendance - Manager không có quyền truy cập */}
                  {/* Catch-all: redirect invalid manager routes to 404 */}
                  <Route
                    path="*"
                    element={<Navigate to="/not-found" replace />}
                  />
                </Route>
              </Route>

              {/* HR Routes - HR_MANAGER and above */}
              <Route
                element={<ProtectedRoute minimumRole={UserRole.HR_MANAGER} />}
              >
                <Route path="/hr" element={<DashboardLayout />}>
                  {/* Common employee routes */}
                  <Route path="scan" element={
                      <ProtectedRoute featureKey="attendance" />}>
                    <Route index element={<ScanPage />} />
                  </Route>
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route element={
                      <ProtectedRoute featureKey="leave_management" />}>
                    <Route path="requests" element={<RequestsPage />} />
                    <Route path="leave-balance" element={<LeaveBalancePage />} />
                  </Route>
                  <Route path="history" element={
                      <ProtectedRoute featureKey="attendance" />}>
                    <Route index element={<HistoryPage />} />
                  </Route>
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route
                    path="camera-checkin"
                    element={<ProtectedRoute featureKey="attendance" />}
                  >
                    <Route index element={<CameraCheckinPage />} />
                  </Route>
                  <Route
                    path="face-registration"
                    element={<FaceRegistrationPage />}
                  />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route
                    path="company-calendar"
                    element={<ProtectedRoute featureKey="company_calendar" />}
                  >
                    <Route index element={<CompanyCalendarPage />} />
                  </Route>
                  <Route element={<ProtectedRoute minimumRole={UserRole.EMPLOYEE} featureKey="chatbot" />}>
                  <Route path="chatbot" element={<ChatbotPage />} />
                </Route>
                  <Route path="my-payslip" element={
                      <ProtectedRoute featureKey="payroll" />}>
                    <Route index element={<MyPayslipPage />} />
                  </Route>
                  {/* HR specific routes with permission checks */}
                  <Route index element={<HomePageWrapper />} />
                  <Route
                    path="employee-management"
                    element={
                      <ProtectedRoute permission={Permission.USERS_VIEW} featureKey="employee_management" />
                    }
                  >
                    <Route index element={<EmployeeManagementPage />} />
                  </Route>
                  <Route
                    path="payroll-reports"
                    element={
                      <ProtectedRoute permission={Permission.PAYROLL_VIEW} featureKey="payroll" />
                    }
                  >
                    <Route index element={<PayrollReportsPage />} />
                  </Route>
                  <Route
                    path="approve-requests"
                    element={
                      <ProtectedRoute
                        permission={Permission.REQUESTS_APPROVE_ALL}
                        featureKey="leave_management"
                      />
                    }
                  >
                    <Route index element={<ApproveRequestsPage />} />
                  </Route>
                  <Route
                    path="attendance-analytics"
                    element={
                      <ProtectedRoute
                        permission={Permission.ANALYTICS_VIEW_ALL}
                        featureKey="attendance_analytics"
                      />
                    }
                  >
                    <Route index element={<AttendanceAnalyticsPage />} />
                  </Route>
                  <Route
                    path="payroll"
                    element={
                      <ProtectedRoute permission={Permission.PAYROLL_VIEW} featureKey="payroll" />
                    }
                  >
                    <Route index element={<PayrollPage />} />
                  </Route>
                  <Route
                    path="salary-matrix"
                    element={
                      <ProtectedRoute permission={Permission.PAYROLL_MANAGE} featureKey="payroll" />
                    }
                  >
                    <Route index element={<SalaryMatrixManagementPage />} />
                  </Route>
                  <Route
                    path="performance-review"
                    element={
                      <ProtectedRoute permission={Permission.USERS_VIEW} featureKey="performance_review" />
                    }
                  >
                    <Route index element={<PerformanceReviewPage />} />
                  </Route>
                  <Route
                    path="admin-attendance"
                    element={
                      <ProtectedRoute
                        permission={Permission.ATTENDANCE_VIEW_ALL}
                        featureKey="attendance"
                      />
                    }
                  >
                    <Route index element={<AdminAttendancePage />} />
                  </Route>
                  <Route
                    path="admin-reports"
                    element={
                      <ProtectedRoute permission={Permission.VIEW_REPORTS} />
                    }
                  >
                    <Route index element={<AdminReportsPage />} />
                  </Route>
                  <Route
                    path="shifts"
                    element={
                      <ProtectedRoute
                        permission={Permission.ATTENDANCE_VIEW_DEPARTMENT}
                      />
                    }
                  >
                    <Route index element={<ShiftsPage />} />
                  </Route>
                  <Route path="leave-types">
                    <Route index element={<LeaveTypeManagementPage />} />
                  </Route>
                  {/* Catch-all: redirect invalid HR routes to 404 */}
                  <Route
                    path="*"
                    element={<Navigate to="/not-found" replace />}
                  />
                  <Route
                    path="regulations"
                    element={<ProtectedRoute featureKey="chatbot" />}
                  >
                    <Route index element={<RegulationsPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Admin Routes - ADMIN and SUPER_ADMIN */}
              <Route element={<ProtectedRoute minimumRole={UserRole.ADMIN} />}>
                <Route path="/admin" element={<DashboardLayout />}>
                  {/* Common employee routes */}
                  <Route path="profile" element={<ProfilePage />} />
                  <Route
                    path="company-calendar"
                    element={<ProtectedRoute featureKey="company_calendar" />}
                  >
                    <Route index element={<CompanyCalendarPage />} />
                  </Route>
                  <Route element={<ProtectedRoute minimumRole={UserRole.EMPLOYEE} featureKey="chatbot" />}>
                  <Route path="chatbot" element={<ChatbotPage />} />
                </Route>
                  <Route path="my-payslip" element={
                      <ProtectedRoute featureKey="payroll" />}>
                    <Route index element={<MyPayslipPage />} />
                  </Route>
                  <Route path="scan" element={
                      <ProtectedRoute featureKey="attendance" />}>
                    <Route index element={<ScanPage />} />
                  </Route>
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route element={
                      <ProtectedRoute featureKey="leave_management" />}>
                    <Route path="requests" element={<RequestsPage />} />
                    <Route path="leave-balance" element={<LeaveBalancePage />} />
                  </Route>
                  <Route path="history" element={
                      <ProtectedRoute featureKey="attendance" />}>
                    <Route index element={<HistoryPage />} />
                  </Route>
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route
                    path="face-registration"
                    element={<FaceRegistrationPage />}
                  />
                  <Route
                    path="camera-checkin"
                    element={<ProtectedRoute featureKey="attendance" />}
                  >
                    <Route index element={<CameraCheckinPage />} />
                  </Route>
                  {/* Admin specific routes with permission checks */}
                  <Route index element={<HomePageWrapper />} />
                  <Route
                    path="employee-management"
                    element={
                      <ProtectedRoute permission={Permission.USERS_VIEW} featureKey="employee_management" />
                    }
                  >
                    <Route index element={<EmployeeManagementPage />} />
                  </Route>
                  <Route
                    path="departments"
                    element={
                      <ProtectedRoute
                        permission={Permission.DEPARTMENTS_VIEW}
                      />
                    }
                  >
                    <Route index element={<DepartmentsPage />} />
                  </Route>
                  <Route
                    path="branches"
                    element={
                      <ProtectedRoute permission={Permission.BRANCHES_VIEW} />
                    }
                  >
                    <Route index element={<BranchesPage />} />
                  </Route>
                  <Route
                    path="approve-requests"
                    element={
                      <ProtectedRoute
                        permission={Permission.REQUESTS_APPROVE_ALL}
                        featureKey="leave_management"
                      />
                    }
                  >
                    <Route index element={<ApproveRequestsPage />} />
                  </Route>
                  <Route
                    path="attendance-analytics"
                    element={
                      <ProtectedRoute
                        permission={Permission.ANALYTICS_VIEW_ALL}
                        featureKey="attendance_analytics"
                      />
                    }
                  >
                    <Route index element={<AttendanceAnalyticsPage />} />
                  </Route>
                  <Route
                    path="payroll-reports"
                    element={
                      <ProtectedRoute permission={Permission.PAYROLL_VIEW} featureKey="payroll" />
                    }
                  >
                    <Route index element={<PayrollReportsPage />} />
                  </Route>
                  <Route
                    path="payroll"
                    element={
                      <ProtectedRoute permission={Permission.PAYROLL_MANAGE} featureKey="payroll" />
                    }
                  >
                    <Route index element={<PayrollPage />} />
                  </Route>
                  <Route
                    path="salary-matrix"
                    element={
                      <ProtectedRoute permission={Permission.PAYROLL_MANAGE} featureKey="payroll" />
                    }
                  >
                    <Route index element={<SalaryMatrixManagementPage />} />
                  </Route>
                  <Route
                    path="performance-review"
                    element={
                      <ProtectedRoute permission={Permission.USERS_VIEW} featureKey="performance_review" />
                    }
                  >
                    <Route index element={<PerformanceReviewPage />} />
                  </Route>
                  <Route
                    path="shifts"
                    element={
                      <ProtectedRoute
                        permission={Permission.ATTENDANCE_VIEW_DEPARTMENT}
                      />
                    }
                  >
                    <Route index element={<ShiftsPage />} />
                  </Route>
                  <Route
                    path="admin-attendance"
                    element={
                      <ProtectedRoute
                        permission={Permission.ATTENDANCE_VIEW_ALL}
                        featureKey="attendance"
                      />
                    }
                  >
                    <Route index element={<AdminAttendancePage />} />
                  </Route>
                  <Route
                    path="admin-reports"
                    element={
                      <ProtectedRoute permission={Permission.VIEW_REPORTS} />
                    }
                  >
                    <Route index element={<AdminReportsPage />} />
                  </Route>
                  <Route
                    path="audit-logs"
                    element={
                      <ProtectedRoute permission={Permission.AUDIT_LOGS_VIEW} />
                    }
                  >
                    <Route index element={<AuditLogsPage />} />
                  </Route>
                  <Route
                    path="system-config"
                    element={
                      <ProtectedRoute
                        permission={Permission.SYSTEM_SETTINGS_VIEW}
                      />
                    }
                  >
                    <Route index element={<SystemConfigPage />} />
                  </Route>
                  <Route path="leave-types">
                    <Route index element={<LeaveTypeManagementPage />} />
                  </Route>
                  <Route
                    path="role-management"
                    element={
                      <ProtectedRoute
                        permission={Permission.USERS_MANAGE_ROLE}
                      />
                    }
                  >
                    <Route index element={<RoleManagementPage />} />
                  </Route>
                  <Route
                    path="face-recognition-logs"
                    element={<ProtectedRoute minimumRole={UserRole.ADMIN} />}
                  >
                    <Route index element={<FaceRecognitionLogPage />} />
                  </Route>
                  <Route
                    path="active-sessions"
                    element={<ProtectedRoute minimumRole={UserRole.ADMIN} />}
                  >
                    <Route index element={<ActiveSessionsPage />} />
                  </Route>
                  <Route
                    path="system-health"
                    element={<ProtectedRoute minimumRole={UserRole.ADMIN} />}
                  >
                    <Route index element={<SystemHealthPage />} />
                  </Route>
                  <Route
                    path="feature-toggles"
                    element={<ProtectedRoute minimumRole={UserRole.SUPER_ADMIN} />}
                  >
                    <Route index element={<FeatureTogglePage />} />
                  </Route>
                  <Route
                    path="ticket-management"
                    element={<ProtectedRoute minimumRole={UserRole.SUPER_ADMIN} />}
                  >
                    <Route index element={<TicketManagementPage />} />
                  </Route>
                  <Route
                    path="company-management"
                    element={<ProtectedRoute minimumRole={UserRole.SUPER_ADMIN} />}
                  >
                    <Route index element={<CompanyManagementPage />} />
                  </Route>
                  <Route
                    path="google-analytics"
                    element={<ProtectedRoute minimumRole={UserRole.SUPER_ADMIN} />}
                  >
                    <Route index element={<GoogleAnalyticsPage />} />
                  </Route>
                  <Route
                    path="ai-billing"
                    element={<ProtectedRoute minimumRole={UserRole.ADMIN} featureKey="chatbot" />}
                  >
                    <Route index element={<AiUsageBillingPage />} />
                  </Route>
                  <Route
                    path="ai-billing/manage"
                    element={<Navigate to="/admin/ai-billing" replace />}
                  />
                  {/* Catch-all: redirect invalid admin routes to 404 */}
                  <Route
                    path="*"
                    element={<Navigate to="/not-found" replace />}
                  />
                  <Route
                    path="regulations"
                    element={<ProtectedRoute featureKey="chatbot" />}
                  >
                    <Route index element={<RegulationsPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            {/* Redirect /upgrade to employee upgrade page */}
            <Route
              path="/upgrade"
              element={<Navigate to="/employee/upgrade" replace />}
            />

            {/* Public legal pages — no auth required */}
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/user-guide" element={<UserGuidePage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/tech-support" element={<TechSupportPage />} />

            {/* Public 404 route */}
            <Route path="/not-found" element={<NotFoundPage />} />
            {/* Final catch-all for any other invalid routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors />
      </ChatbotProvider>
    </ThemeProvider>
  );
}
