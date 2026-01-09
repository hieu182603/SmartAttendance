import { Router } from "express";
import { DepartmentController } from "./department.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

export const departmentRouter = Router();

// Tất cả routes đều cần authentication
departmentRouter.use(authMiddleware);

// Các routes cần ADMIN hoặc SUPER_ADMIN
departmentRouter.use(requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]));

departmentRouter.get("/", DepartmentController.getAllDepartments);
departmentRouter.get("/stats", DepartmentController.getStats);
departmentRouter.get("/list", DepartmentController.getDepartmentsList);
departmentRouter.get("/:id", DepartmentController.getDepartmentById);
departmentRouter.get("/:id/employees", DepartmentController.getDepartmentEmployees);
departmentRouter.post("/", DepartmentController.createDepartment);
departmentRouter.post("/:id/transfer", DepartmentController.transferEmployees);
departmentRouter.post("/:id/transfer-selected", DepartmentController.transferSelectedEmployees);
departmentRouter.post("/:id/merge", DepartmentController.mergeDepartments);
departmentRouter.post("/:id/reactivate", DepartmentController.reactivateDepartment);
departmentRouter.put("/:id", DepartmentController.updateDepartment);
departmentRouter.delete("/:id", DepartmentController.deleteDepartment);

