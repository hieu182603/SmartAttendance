import { Router } from "express";
import { UserController } from "./user.controller.js";
import { UpgradeController } from "./upgrade.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import upload from "../../utils/upload.js";

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.put("/me", UserController.updateCurrentUser);
userRouter.get("/me", UserController.getCurrentUser);
userRouter.post("/change-password", UserController.changePassword);
userRouter.post("/me/avatar", upload.single("avatar"), UserController.uploadAvatar);

userRouter.post(
    "/",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]), // HR_MANAGER có quyền tạo nhân viên
    UserController.createUserByAdmin
);

userRouter.get(
    "/",
    requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
    UserController.getAllUsers
);

// Route /managers phải đặt TRƯỚC route /:id để tránh conflict
userRouter.get(
    "/managers",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.MANAGER]),
    UserController.getManagers
);

// Route /my-team cho Manager lấy danh sách nhân viên trong team
userRouter.get(
    "/my-team",
    requireRole([ROLES.MANAGER, ROLES.SUPERVISOR]),
    UserController.getMyTeamMembers
);

// Route /my-department cho Supervisor lấy danh sách nhân viên trong department
userRouter.get(
    "/my-department",
    requireRole([ROLES.SUPERVISOR]),
    UserController.getMyDepartmentMembers
);

// Upgrade routes - PHẢI đặt TRƯỚC route /:id để tránh conflict
userRouter.post("/upgrade-trial", UpgradeController.upgradeTrialUser);
userRouter.get("/upgrade-options", UpgradeController.getUpgradeOptions);
userRouter.get("/upgrade-eligibility", UpgradeController.checkUpgradeEligibility);

// Admin trial stats - PHẢI đặt TRƯỚC route /:id để tránh conflict
userRouter.get(
    "/admin/trial-stats",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    UpgradeController.getTrialStats
);

// Route /:id phải đặt SAU các route cụ thể để tránh match nhầm
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


