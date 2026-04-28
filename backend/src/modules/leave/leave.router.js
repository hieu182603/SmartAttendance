import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import * as LeaveController from "./leave.controller.js";
import {
  listLeaveTypes,
  getLeaveType,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from "./leave-type.controller.js";

export const leaveRouter = Router();

// Tất cả routes đều cần authentication
leaveRouter.use(authMiddleware);

// GET /api/leave/balance - Lấy số ngày phép
leaveRouter.get("/balance", LeaveController.getBalance);

// GET /api/leave/history - Lấy lịch sử nghỉ phép
leaveRouter.get("/history", LeaveController.getHistory);

// ============================================================================
// Leave Types CRUD (HR/Admin) — đặt /types trước /:id để khỏi nuốt route
// ============================================================================

// Mọi user đã đăng nhập đều có thể xem danh sách loại phép (để chọn khi tạo request)
leaveRouter.get("/types", listLeaveTypes);

leaveRouter.post(
  "/types",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  createLeaveType
);

leaveRouter.get(
  "/types/:id",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  getLeaveType
);

leaveRouter.put(
  "/types/:id",
  requireRole([ROLES.HR_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  updateLeaveType
);

leaveRouter.delete(
  "/types/:id",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  deleteLeaveType
);

