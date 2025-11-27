import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import upload from "../../utils/upload.js";

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.put("/me", UserController.updateCurrentUser);
userRouter.get("/me", UserController.getCurrentUser);
userRouter.post("/change-password", UserController.changePassword);
userRouter.post("/me/avatar", upload.single("avatar"), UserController.uploadAvatar);

userRouter.get(
    "/",
    requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
    UserController.getAllUsers
);

// Route /managers phải đặt TRƯỚC route /:id để tránh conflict
userRouter.get(
    "/managers",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    UserController.getManagers
);

// Route /my-team cho Manager lấy danh sách nhân viên trong team
userRouter.get(
    "/my-team",
    requireRole([ROLES.MANAGER]),
    UserController.getMyTeamMembers
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

