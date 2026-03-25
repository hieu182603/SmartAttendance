import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  authRateLimiter,
  otpRateLimiter,
  trialRegisterRateLimiter,
} from "../../middleware/security.middleware.js";


export const authRouter = Router();

// Đăng ký người dùng mới
authRouter.post("/register", trialRegisterRateLimiter, AuthController.register);

// Xác thực OTP
authRouter.post("/verify-otp", otpRateLimiter, AuthController.verifyOTP);

// Gửi lại OTP
authRouter.post("/resend-otp", otpRateLimiter, AuthController.resendOTP);

// Đăng nhập
authRouter.post("/login", authRateLimiter, AuthController.login);

// Quên mật khẩu
authRouter.post("/forgot-password", otpRateLimiter, AuthController.forgotPassword);

// Xác thực OTP để reset password
authRouter.post("/verify-reset-otp", otpRateLimiter, AuthController.verifyResetOtp);

// Đặt lại mật khẩu mới
authRouter.post("/reset-password", otpRateLimiter, AuthController.resetPassword);


// Lấy thông tin người dùng hiện tại (yêu cầu authentication)
authRouter.get("/me", authMiddleware, AuthController.getCurrentUser);
