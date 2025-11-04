import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

/**
 * Router cho các endpoint liên quan đến Authentication
 */
export const authRouter = Router();

// Đăng ký người dùng mới
authRouter.post("/register", AuthController.register);

// Đăng nhập
authRouter.post("/login", AuthController.login);

// Lấy thông tin người dùng hiện tại (yêu cầu authentication)
authRouter.get("/me", authMiddleware, AuthController.getCurrentUser);
