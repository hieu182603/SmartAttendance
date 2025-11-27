import express from "express";
import { LogController } from "./log.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";

const logRouter = express.Router();

// Tất cả routes đều yêu cầu authentication
logRouter.use(authMiddleware);

// Tất cả routes đều yêu cầu SUPER_ADMIN hoặc ADMIN
logRouter.get(
  "/",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  (req, res) => LogController.getAllLogs(req, res)
);

logRouter.get(
  "/stats",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  (req, res) => LogController.getLogStats(req, res)
);

// Route /:id phải đặt SAU các routes cụ thể như /stats để tránh conflict
logRouter.get(
  "/:id",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  (req, res) => LogController.getLogById(req, res)
);

export { logRouter };

