import { Router } from "express";
import { BranchController } from "./branch.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

export const branchRouter = Router();

// Tất cả routes đều cần authentication
branchRouter.use(authMiddleware);

// GET /api/branches/list - Lấy danh sách đơn giản (không cần role cao)
branchRouter.get("/list", BranchController.getBranchesList);

// Các routes còn lại cần ADMIN hoặc SUPER_ADMIN
branchRouter.use(requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]));

branchRouter.get("/", BranchController.getAllBranches);
branchRouter.get("/stats", BranchController.getStats);
branchRouter.get("/:id", BranchController.getBranchById);
branchRouter.post("/", BranchController.createBranch);
branchRouter.put("/:id", BranchController.updateBranch);
branchRouter.delete("/:id", BranchController.deleteBranch);

