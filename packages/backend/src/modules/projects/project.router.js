import { Router } from "express";
import * as ProjectController from "./project.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireMinimumRole, ROLES } from "../../middleware/role.middleware.js";

export const projectRouter = Router();

projectRouter.use(authMiddleware);

// Manager+ routes
projectRouter.get("/", requireMinimumRole(ROLES.MANAGER), ProjectController.getProjects);
projectRouter.post("/", requireMinimumRole(ROLES.MANAGER), ProjectController.createProject);
projectRouter.put("/:projectId", requireMinimumRole(ROLES.MANAGER), ProjectController.updateProject);
projectRouter.delete("/:projectId", requireMinimumRole(ROLES.MANAGER), ProjectController.deleteProject);
