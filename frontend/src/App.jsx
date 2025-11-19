import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import DashboardOverview from "./components/dashboard/Overview";
import ScanPage from "./components/dashboard/pages/ScanPage";
import SchedulePage from "./components/dashboard/pages/SchedulePage";
import RequestsPage from "./components/dashboard/pages/RequestsPage";
import HistoryPage from "./components/dashboard/pages/HistoryPage";
import LeaveBalancePage from "./components/dashboard/pages/LeaveBalancePage";
import NotificationsPage from "./components/dashboard/pages/NotificationsPage";
import CameraCheckinPage from "./components/dashboard/pages/CameraCheckinPage";
import ProfilePage from "./components/dashboard/pages/ProfilePage";

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

        <Route element={<ProtectedRoute />}>
          <Route path="/employee" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="leave-balance" element={<LeaveBalancePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="camera-checkin" element={<CameraCheckinPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}
