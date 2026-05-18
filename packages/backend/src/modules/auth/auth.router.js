import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  loginRateLimiter,
  otpRateLimiter,
  trialRegisterRateLimiter,
  refreshRateLimiter,
} from "../../middleware/security.middleware.js";


export const authRouter = Router();

// Đăng ký người dùng mới
authRouter.post("/register", trialRegisterRateLimiter, AuthController.register);

// Xác thực OTP
authRouter.post("/verify-otp", otpRateLimiter, AuthController.verifyOTP);

// Gửi lại OTP
authRouter.post("/resend-otp", otpRateLimiter, AuthController.resendOTP);

// Đăng nhập
authRouter.post("/login", loginRateLimiter, AuthController.login);

// Quên mật khẩu
authRouter.post("/forgot-password", otpRateLimiter, AuthController.forgotPassword);

// Xác thực OTP để reset password
authRouter.post("/verify-reset-otp", otpRateLimiter, AuthController.verifyResetOtp);

// Đặt lại mật khẩu mới
authRouter.post("/reset-password", otpRateLimiter, AuthController.resetPassword);


// Lấy thông tin người dùng hiện tại (yêu cầu authentication)
authRouter.get("/me", authMiddleware, AuthController.getCurrentUser);

// Đổi access token mới từ refresh token
authRouter.post("/refresh", refreshRateLimiter, AuthController.refresh);

// Đăng xuất (thu hồi refresh token)
authRouter.post("/logout", authMiddleware, AuthController.logout);

// Admin: xem tất cả sessions đang online
authRouter.get(
  "/admin/sessions",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  (req, res) => AuthController.getAdminSessions(req, res)
);

// Admin: force logout một user
authRouter.delete(
  "/admin/sessions/:userId",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  (req, res) => AuthController.forceLogoutUser(req, res)
);
