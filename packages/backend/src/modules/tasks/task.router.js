import { Router } from "express";
import * as TaskController from "./task.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireMinimumRole, ROLES } from "../../middleware/role.middleware.js";

export const taskRouter = Router();

taskRouter.use(authMiddleware);

// Employee routes
taskRouter.get("/my-tasks", requireMinimumRole(ROLES.EMPLOYEE), TaskController.getMyTasks);
taskRouter.patch("/:taskId/start", requireMinimumRole(ROLES.EMPLOYEE), TaskController.startTask);
taskRouter.patch("/:taskId/submit", requireMinimumRole(ROLES.EMPLOYEE), TaskController.submitTask);

// Manager+ routes
taskRouter.post("/", requireMinimumRole(ROLES.MANAGER), TaskController.createTask);
taskRouter.get("/department", requireMinimumRole(ROLES.MANAGER), TaskController.getDepartmentTasks);
taskRouter.patch("/:taskId/review", requireMinimumRole(ROLES.MANAGER), TaskController.reviewTask);
taskRouter.put("/:taskId", requireMinimumRole(ROLES.MANAGER), TaskController.updateTask);
taskRouter.delete("/:taskId", requireMinimumRole(ROLES.MANAGER), TaskController.deleteTask);

// Shared route (assignee, assigner, or same-company manager) — keep after specific paths
taskRouter.get("/:taskId", requireMinimumRole(ROLES.EMPLOYEE), TaskController.getTaskById);
