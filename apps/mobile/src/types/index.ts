export enum UserRole {
  Employee = 'EMPLOYEE',
  Manager = 'MANAGER',
  Admin = 'ADMIN',
  SuperAdmin = 'SUPER_ADMIN',
  HRManager = 'HR_MANAGER',
  Supervisor = 'SUPERVISOR',
  Trial = 'TRIAL'
}

export enum Screen {
  Splash = 'SPLASH',
  Login = 'LOGIN',
  // Employee Screens
  Home = 'HOME',
  Schedule = 'SCHEDULE',
  Requests = 'REQUESTS',
  Profile = 'PROFILE',
  Notifications = 'NOTIFICATIONS',
  // Manager Screens
  ManagerDashboard = 'MANAGER_DASHBOARD',
  ManagerTeam = 'MANAGER_TEAM',
  ManagerApprovals = 'MANAGER_APPROVALS',
  ManagerSchedule = 'MANAGER_SCHEDULE',
  // Admin Screens
  AdminDashboard = 'ADMIN_DASHBOARD',
  AdminUsers = 'ADMIN_USERS',
  AdminReports = 'ADMIN_REPORTS',
  AdminSettings = 'ADMIN_SETTINGS',
  AdminAudit = 'ADMIN_AUDIT',
  // Common Screens
  Settings = 'SETTINGS',
  TeamReports = 'TEAM_REPORTS',
}

export interface Shift {
  id: string;
  title: string;
  start: string; // HH:MM
  end: string; // HH:MM
  date: string;
  type: 'office' | 'remote' | 'site';
  status: 'upcoming' | 'completed' | 'active';
}

export interface Request {
  id: string;
  type: 'leave' | 'overtime' | 'remote';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  description: string;
  duration?: string;
  requester?: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: 'approved' | 'rejected' | 'reminder' | 'info' | 'warning';
  title: string;
  message: string;
  time: string;
  timestamp: number;
  icon: string;
  unread: boolean;
  actionUrl?: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  time: string;
  date: string;
  timestamp: number;
  status: 'success' | 'info' | 'warning' | 'error';
  details?: string;
}

export interface AttendanceStats {
  leavesRemaining: number;
  totalLeaves: number;
  thisMonth: number;
  totalDays: number;
  overtimeHours: number;
  lateCount: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  avatar?: string;
  status: 'online' | 'offline' | 'on-leave';
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
  attachments?: string[];
}

export interface ApprovalRequest extends LeaveRequest {
  employeeName: string;
  employeeAvatar?: string;
}

