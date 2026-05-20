import { Router } from "express";
import * as ScheduleController from "./schedule.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireMinimumRole, ROLES } from "../../middleware/role.middleware.js";

export const scheduleRouter = Router();

scheduleRouter.use(authMiddleware);

// GET /my must be declared before /:id to avoid routing conflict
scheduleRouter.get("/my", requireMinimumRole(ROLES.EMPLOYEE), ScheduleController.getMySchedule);

// Manager+ can list and generate
scheduleRouter.get("/", requireMinimumRole(ROLES.MANAGER), ScheduleController.getSchedules);
scheduleRouter.post("/generate", requireMinimumRole(ROLES.MANAGER), ScheduleController.generateSchedule);
scheduleRouter.post("/generate/batch", requireMinimumRole(ROLES.ADMIN), ScheduleController.batchGenerateSchedule);
scheduleRouter.get("/:id", requireMinimumRole(ROLES.MANAGER), ScheduleController.getScheduleById);

// Admin+ can modify
scheduleRouter.put("/:id", requireMinimumRole(ROLES.ADMIN), ScheduleController.updateSchedule);
scheduleRouter.delete("/:id", requireMinimumRole(ROLES.ADMIN), ScheduleController.deleteSchedule);
