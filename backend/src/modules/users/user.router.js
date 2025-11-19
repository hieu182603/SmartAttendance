import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

export const userRouter = Router();

// Tất cả routes đều cần authentication
userRouter.use(authMiddleware);

// Cập nhật thông tin user hiện tại
userRouter.put("/me", UserController.updateCurrentUser);

// Lấy thông tin user hiện tại
userRouter.get("/me", UserController.getCurrentUser);

// Đổi mật khẩu
userRouter.post("/change-password", UserController.changePassword);

