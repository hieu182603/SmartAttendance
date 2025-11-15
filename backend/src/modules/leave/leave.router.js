import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import * as LeaveController from "./leave.controller.js";

export const leaveRouter = Router();

// Tất cả routes đều cần authentication
leaveRouter.use(authMiddleware);

// GET /api/leave/balance - Lấy số ngày phép
leaveRouter.get("/balance", LeaveController.getBalance);

// GET /api/leave/history - Lấy lịch sử nghỉ phép
leaveRouter.get("/history", LeaveController.getHistory);

