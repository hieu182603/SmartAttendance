import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { ROLES } from "../../config/roles.config.js";
import { CompanyController } from "./company.controller.js";

export const companyRouter = Router();

companyRouter.use(authMiddleware, requireRole([ROLES.SUPER_ADMIN]));

companyRouter.get("/", CompanyController.list);
companyRouter.get("/:id", CompanyController.get);
companyRouter.patch("/:id", CompanyController.update);
companyRouter.delete("/:id", CompanyController.remove);
