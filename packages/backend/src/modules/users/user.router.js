import { Router } from "express";
import { UserController } from "./user.controller.js";
import { UpgradeController } from "./upgrade.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permission.middleware.js";
import { PERMISSIONS } from "../../config/permissions.config.js";
import upload from "../../utils/upload.js";
import multer from "multer";

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xls|xlsx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file CSV hoặc Excel (.csv, .xls, .xlsx)"));
    }
  },
});

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.put("/me", UserController.updateCurrentUser);
userRouter.get("/me", UserController.getCurrentUser);
userRouter.post("/change-password", UserController.changePassword);
userRouter.post("/me/avatar", upload.single("avatar"), UserController.uploadAvatar);
userRouter.get(
  "/role-permissions",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.USERS_MANAGE_ROLE),
  UserController.getRolePermissions
);
userRouter.put(
  "/role-permissions",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  requirePermission(PERMISSIONS.USERS_MANAGE_ROLE),
  UserController.updateRolePermissions
);

userRouter.post(
    "/",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]), // HR_MANAGER có quyền tạo nhân viên
    requirePermission(PERMISSIONS.USERS_CREATE),
    UserController.createUserByAdmin
);

userRouter.get(
    "/",
    requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
    requireAnyPermission([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_VIEW_DEPARTMENT]),
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
    requireRole([ROLES.MANAGER]),
    UserController.getMyTeamMembers
);

// Bulk import nhân viên — PHẢI đặt TRƯỚC route /:id
userRouter.post(
  "/bulk-import",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
  requirePermission(PERMISSIONS.USERS_CREATE),
  csvUpload.single("file"),
  UserController.bulkImport
);
userRouter.get(
  "/import-template",
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
  requireAnyPermission([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE]),
  UserController.getImportTemplate
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
    requireAnyPermission([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_VIEW_DEPARTMENT]),
    UserController.getUserByIdForAdmin
);

userRouter.put(
    "/:id",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    requireAnyPermission([PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_UPDATE_DEPARTMENT]),
    UserController.updateUserByAdmin
);

userRouter.patch(
    "/:id/deactivate",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    UserController.deactivateUser
);

userRouter.patch(
    "/:id/activate",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    UserController.activateUser
);

userRouter.patch(
    "/:id/remote-status",
    requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]),
    requireAnyPermission([PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_UPDATE_DEPARTMENT]),
    UserController.setRemoteStatus
);


