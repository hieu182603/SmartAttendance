import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";


export const authRouter = Router();

// Đăng ký người dùng mới
authRouter.post("/register", AuthController.register);

// Xác thực OTP
authRouter.post("/verify-otp", AuthController.verifyOTP);

// Gửi lại OTP
authRouter.post("/resend-otp", AuthController.resendOTP);

// Đăng nhập
authRouter.post("/login", AuthController.login);

// Quên mật khẩu
authRouter.post("/forgot-password", AuthController.forgotPassword);

// Xác thực OTP để reset password
authRouter.post("/verify-reset-otp", AuthController.verifyResetOtp);

// Đặt lại mật khẩu mới
authRouter.post("/reset-password", AuthController.resetPassword);

// Lấy thông tin người dùng hiện tại (yêu cầu authentication)
authRouter.get("/me", authMiddleware, AuthController.getCurrentUser);
