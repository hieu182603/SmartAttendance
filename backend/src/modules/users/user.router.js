import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.put("/me", UserController.updateCurrentUser);
userRouter.get("/me", UserController.getCurrentUser);
userRouter.post("/change-password", UserController.changePassword);

userRouter.get(
    "/",
    requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
    UserController.getAllUsers
);

userRouter.get(
    "/:id",
    requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
    UserController.getUserByIdForAdmin
);

userRouter.put(
    "/:id",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    UserController.updateUserByAdmin
);

