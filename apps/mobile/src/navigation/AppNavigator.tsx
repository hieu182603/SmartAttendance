import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserRole } from '../types';
import { CustomBottomTabBar } from '../components/navigation/BottomNav';
import { CustomDrawerContent } from '../components/navigation/Sidebar';
import { ManagerBottomTabBar } from '../components/navigation/ManagerBottomNav';
import { AdminBottomTabBar } from '../components/navigation/AdminBottomNav';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';

// Shared Screens
import SplashScreen from '../screens/shared/SplashScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NotificationDetailScreen from '../screens/shared/NotificationDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Employee Screens
import DashboardScreen from '../screens/employee/DashboardScreen';
import ScheduleScreen from '../screens/employee/ScheduleScreen';
import AttendanceHistoryScreen from '../screens/employee/AttendanceHistoryScreen';
import AttendanceScreen from '../screens/employee/AttendanceScreen';
import FaceRegistrationScreen from '../screens/employee/FaceRegistrationScreen';
import RequestsScreen from '../screens/employee/RequestsScreen';
import RequestDetailScreen from '../screens/employee/RequestDetailScreen';
import AttendanceDetailScreen from '../screens/employee/AttendanceDetailScreen';
import LeaveBalanceScreen from '../screens/employee/LeaveBalanceScreen';

// Manager Screens
import ManagerDashboardScreen from '../screens/manager/ManagerDashboardScreen';
import ManagerTeamScreen from '../screens/manager/ManagerTeamScreen';
import TeamReportsScreen from '../screens/manager/TeamReportsScreen';
import ManagerApprovalsScreen from '../screens/manager/ManagerApprovalsScreen';
import ManagerScheduleScreen from '../screens/manager/ManagerScheduleScreen';
import ApprovalDetailScreen from '../screens/manager/ApprovalDetailScreen';
import PerformanceReviewScreen from '../screens/manager/PerformanceReviewScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminAuditScreen from '../screens/admin/AdminAuditScreen';
import AdminDepartmentsScreen from '../screens/admin/AdminDepartmentsScreen';
import AdminPositionsScreen from '../screens/admin/AdminPositionsScreen';
import EmployeeDetailScreen from '../screens/admin/EmployeeDetailScreen';
import EmployeeProfileViewScreen from '../screens/admin/EmployeeProfileViewScreen';
import PayrollSummaryScreen from '../screens/admin/PayrollSummaryScreen';
import PayslipScreen from '../screens/admin/PayslipScreen';
import ApproveAllScreen from '../screens/admin/ApproveAllScreen';

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  VerifyOtp: { email: string };
  ResetPassword: { email: string };
  EmployeeTabs: undefined;
  ManagerTabs: undefined;
  AdminTabs: undefined;
  AttendanceHistory: undefined;
  AttendanceDetail: { recordId: string };
  Attendance: { mode: 'check-in' | 'check-out'; reason?: string } | undefined;
  RequestDetail: { requestId: string };
  NotificationDetail: { notificationId: string };
  LeaveBalance: undefined;
  FaceRegistration: undefined;
  AdminDepartments: undefined;
  AdminPositions: undefined;
  Notifications: undefined;
  ApprovalDetail: { requestId: string };
  PerformanceReview: undefined;
  EmployeeDetail: { userId: string };
  EmployeeProfileView: undefined;
  PayrollSummary: undefined;
  Payslip: { payrollId?: string } | undefined;
  ApproveAll: undefined;
};

export type EmployeeTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Requests: { openCreateModal?: boolean } | undefined;
  Leaves: { openCreateModal?: boolean } | undefined;
  Profile: undefined;
  Attendance: { mode: 'check-in' | 'check-out'; reason?: string } | undefined;
  AttendanceHistory: undefined;
  ChangePassword: undefined;
  Settings: undefined;
};
export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminReports: undefined;
  AdminSettings: undefined;
  AdminAudit: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Settings: undefined;
};
export type ManagerTabParamList = {
  ManagerDashboard: undefined;
  ManagerTeam: undefined;
  ManagerApprovals: undefined;
  ManagerSchedule: undefined;
  TeamReports: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<EmployeeTabParamList>();
const ManagerTab = createBottomTabNavigator<ManagerTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const Drawer = createDrawerNavigator();

interface AppNavigatorProps {
  userRole?: UserRole;
  isLoading?: boolean;
}

// Employee Bottom Tab Navigator
function EmployeeTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: 'none', // Hide default tab bar, we'll use custom one
        },
      }}
      tabBar={(props) => <CustomBottomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Leaves" component={RequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

// Manager Tab Navigator
function ManagerTabNavigator() {
  return (
    <ManagerTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: 'none', // Hide default tab bar, we'll use custom one
        },
      }}
      tabBar={(props) => <ManagerBottomTabBar {...props} />}
    >
      <ManagerTab.Screen name="ManagerDashboard" component={ManagerDashboardScreen} />
      <ManagerTab.Screen name="ManagerTeam" component={ManagerTeamScreen} />
      <ManagerTab.Screen name="ManagerApprovals" component={ManagerApprovalsScreen} options={{ tabBarButton: () => null }} />
      <ManagerTab.Screen name="ManagerSchedule" component={ManagerScheduleScreen} />
      <ManagerTab.Screen name="TeamReports" component={TeamReportsScreen} options={{ tabBarButton: () => null }} />
      <ManagerTab.Screen name="Profile" component={ProfileScreen} />
      <ManagerTab.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ tabBarButton: () => null }} />
      <ManagerTab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
    </ManagerTab.Navigator>
  );
}

// Admin Tab Navigator
function AdminTabNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: 'none', // Hide default tab bar, we'll use custom one
        },
      }}
      tabBar={(props) => <AdminBottomTabBar {...props} />}
    >
      <AdminTab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <AdminTab.Screen name="AdminUsers" component={AdminUsersScreen} />
      <AdminTab.Screen name="AdminReports" component={AdminReportsScreen} />
      <AdminTab.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <AdminTab.Screen name="AdminAudit" component={AdminAuditScreen} options={{ tabBarButton: () => null }} />
      <AdminTab.Screen name="Profile" component={ProfileScreen} />
      <AdminTab.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ tabBarButton: () => null }} />
      <AdminTab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
    </AdminTab.Navigator>
  );
}

export default function AppNavigator({ userRole, isLoading }: AppNavigatorProps) {
  const navigationRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!isLoading && userRole && navigationRef.current) {
      const routeName =
        userRole === UserRole.Employee ? 'EmployeeTabs' :
          userRole === UserRole.Manager ? 'ManagerTabs' :
            userRole === UserRole.Admin ? 'AdminTabs' :
              userRole === UserRole.SuperAdmin ? 'AdminTabs' :
                userRole === UserRole.HRManager ? 'AdminTabs' :
                  userRole === UserRole.Trial ? 'EmployeeTabs' :
                      'Login';

      navigationRef.current.reset({
        index: 0,
        routes: [{ name: routeName }],
      });
    } else if (!isLoading && !userRole && navigationRef.current) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [userRole, isLoading]);

  const getInitialRoute = () => {
    if (isLoading) return 'Splash';
    if (!userRole) return 'Login';

    switch (userRole) {
      case UserRole.Employee:
      case UserRole.Trial:
        return 'EmployeeTabs';
      case UserRole.Manager:
        return 'ManagerTabs';
      case UserRole.Admin:
      case UserRole.SuperAdmin:
      case UserRole.HRManager:
        return 'AdminTabs';
      default:
        return 'Login';
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="EmployeeTabs" component={EmployeeTabNavigator} />
        <Stack.Screen name="ManagerTabs" component={ManagerTabNavigator} />
        <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
        <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
        <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
        <Stack.Screen name="LeaveBalance" component={LeaveBalanceScreen} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
        <Stack.Screen name="FaceRegistration" component={FaceRegistrationScreen} />
        <Stack.Screen name="AdminDepartments" component={AdminDepartmentsScreen} />
        <Stack.Screen name="AdminPositions" component={AdminPositionsScreen} />
        <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} />
        <Stack.Screen name="PerformanceReview" component={PerformanceReviewScreen} />
        <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
        <Stack.Screen name="EmployeeProfileView" component={EmployeeProfileViewScreen} />
        <Stack.Screen name="PayrollSummary" component={PayrollSummaryScreen} />
        <Stack.Screen name="Payslip" component={PayslipScreen} />
        <Stack.Screen name="ApproveAll" component={ApproveAllScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
