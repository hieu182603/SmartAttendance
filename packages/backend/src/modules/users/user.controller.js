import { UserService } from "./user.service.js";
import { UserModel } from "./user.model.js";
import { TenantAccessError, resolveTenantCompanyId, canAccessUserTenant } from "../../utils/tenantCompany.util.js";

function tenantRequester(req) {
  return {
    role: req.user?.role,
    companyId: req.user?.companyId ?? null,
    userId: req.user?.userId,
  };
}
import {
  updateUserSchema,
  changePasswordSchema,
  updateUserByAdminSchema,
  createUserByAdminSchema,
  rolePermissionPayloadSchema,
} from "@smartattendance/shared";
import { logActivity } from "../../utils/logger.util.js";
import * as XLSX from "xlsx";

export class UserController {
  static async getRolePermissions(req, res) {
    try {
      const rolePerms = await UserService.getRolePermissions();
      return res.status(200).json({ rolePerms });
    } catch (error) {
      console.error("[UserController] Get role permissions error:", error);
      return res.status(500).json({
        message: error.message || "Không thể tải cấu hình quyền",
      });
    }
  }

  static async updateRolePermissions(req, res) {
    try {
      const parse = rolePermissionPayloadSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: parse.error.flatten(),
        });
      }

      const rolePerms = await UserService.updateRolePermissions(
        parse.data.rolePerms,
        req.user?.userId
      );

      await logActivity(req, {
        action: "update_role_permissions",
        entityType: "system_config",
        details: {
          description: "Đã cập nhật cấu hình role permissions",
          updatedRoles: Object.keys(parse.data.rolePerms),
        },
        status: "success",
      });

      return res.status(200).json({
        message: "Đã cập nhật quyền backend thành công",
        rolePerms,
      });
    } catch (error) {
      await logActivity(req, {
        action: "update_role_permissions",
        entityType: "system_config",
        details: {
          description: "Cập nhật role permissions thất bại",
          error: error.message,
        },
        status: "failed",
        errorMessage: error.message,
      });

      console.error("[UserController] Update role permissions error:", error);
      return res.status(500).json({
        message: error.message || "Không thể cập nhật cấu hình quyền",
      });
    }
  }

  /**
   * @swagger
   * /api/users/me:
   *   put:
   *     summary: Cập nhật thông tin user hiện tại
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               phone:
   *                 type: string
   *               address:
   *                 type: string
   *               birthday:
   *                 type: string
   *               avatarUrl:
   *                 type: string
   *               bankAccount:
   *                 type: string
   *               bankName:
   *                 type: string
   *     responses:
   *       200:
   *         description: Cập nhật thành công
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       401:
   *         description: Không có quyền truy cập
   *       404:
   *         description: Không tìm thấy user
   */
  static async updateCurrentUser(req, res) {
    try {
      const userId = req.user.userId;

      // Validate request body
      const parse = updateUserSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: errors,
        });
      }

      const updatedUser = await UserService.updateUser(userId, parse.data);

      return res.status(200).json({
        message: "Cập nhật thông tin thành công",
        user: updatedUser,
      });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      if (error.message === "Không có dữ liệu để cập nhật") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Update user error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/users/me:
   *   get:
   *     summary: Lấy thông tin user hiện tại
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Thông tin user
   *       404:
   *         description: Không tìm thấy user
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      const user = await UserService.getUserById(userId);

      return res.status(200).json(user);
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      console.error("Get user error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/users/change-password:
   *   post:
   *     summary: Đổi mật khẩu user hiện tại
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [currentPassword, newPassword]
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *     responses:
   *       200:
   *         description: Đổi mật khẩu thành công
   *       400:
   *         description: Dữ liệu không hợp lệ hoặc mật khẩu hiện tại không đúng
   *       401:
   *         description: Không có quyền truy cập
   *       404:
   *         description: Không tìm thấy user
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.userId;

      // Validate request body
      const parse = changePasswordSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: errors,
        });
      }

      const result = await UserService.changePassword(
        userId,
        parse.data.currentPassword,
        parse.data.newPassword
      );

      return res.status(200).json(result);
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      if (error.message === "Mật khẩu hiện tại không đúng") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Change password error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Lấy danh sách tất cả users (chỉ dành cho ADMIN, HR_MANAGER)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Số trang
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Số lượng items mỗi trang
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Tìm kiếm theo tên hoặc email
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *         description: Lọc theo role
   *       - in: query
   *         name: department
   *         schema:
   *           type: string
   *         description: Lọc theo phòng ban
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Lọc theo trạng thái active
   *     responses:
   *       200:
   *         description: Danh sách users
   *       403:
   *         description: Không có quyền truy cập
   */
  static async getAllUsers(req, res) {
    try {
      // SUPER_ADMIN có thể lọc theo công ty cụ thể qua ?companyId=
      const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
      const companyId = isSuperAdmin
        ? (req.query.companyId || null)
        : req.user.companyId;
      const result = await UserService.getAllUsers(req.query, companyId);
      return res.status(200).json(result);
    } catch (error) {
      console.error("[UserController] Get all users error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Lấy thông tin user theo ID (chỉ dành cho ADMIN, HR_MANAGER)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: Thông tin user
   *       403:
   *         description: Không có quyền truy cập
   *       404:
   *         description: Không tìm thấy user
   */
  static async getUserByIdForAdmin(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserByIdForAdmin(id, tenantRequester(req));
      return res.status(200).json(user);
    } catch (error) {
      if (error instanceof TenantAccessError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      console.error("[UserController] Get user by ID error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     summary: Cập nhật thông tin user (chỉ dành cho ADMIN, SUPER_ADMIN)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *               role:
   *                 type: string
   *               department:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Cập nhật thành công
   *       403:
   *         description: Không có quyền truy cập
   *       404:
   *         description: Không tìm thấy user
   */
  static async updateUserByAdmin(req, res) {
    try {
      const { id } = req.params;
      const currentUserRole = req.user?.role;
      const parse = updateUserByAdminSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0] || "Dữ liệu không hợp lệ";
        return res.status(400).json({
          message: firstError,
          errors: errors,
        });
      }

      // Lấy thông tin user hiện tại để kiểm tra role
      let userRole = currentUserRole;
      if (!userRole) {
        const currentUser = await UserService.getUserById(req.user.userId);
        userRole = currentUser.role;
      }

      // HR_MANAGER không được phép thay đổi role
      if (userRole === "HR_MANAGER" && parse.data.role !== undefined) {
        return res.status(403).json({
          message: "HR Manager không có quyền thay đổi vai trò của nhân viên. Chỉ Admin và Super Admin mới có quyền này.",
        });
      }

      const updatedUser = await UserService.updateUserByAdmin(
        id,
        parse.data,
        userRole,
        tenantRequester(req)
      );

      // Log successful action
      await logActivity(req, {
        action: "update_user",
        entityType: "user",
        entityId: id,
        details: {
          description: `Đã cập nhật thông tin user: ${updatedUser.name}`,
          changes: Object.keys(parse.data),
          targetUserId: id,
          updatedFields: parse.data,
        },
        status: "success",
      });

      return res.status(200).json({
        message: "Cập nhật thông tin user thành công",
        user: updatedUser,
      });
    } catch (error) {
      // Log failed action
      await logActivity(req, {
        action: "update_user",
        entityType: "user",
        entityId: req.params.id,
        details: {
          description: "Cập nhật user thất bại",
          error: error.message,
        },
        status: "failed",
        errorMessage: error.message,
      });

      if (error instanceof TenantAccessError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      if (
        error.message === "Không có dữ liệu để cập nhật" ||
        error.message.includes("không có quyền phân quyền") ||
        error.message.includes("không hợp lệ") ||
        error.message.includes("phải có") ||
        error.message.includes("không được để trống")
      ) {
        return res.status(400).json({ message: error.message });
      }
      console.error("[UserController] Update user by admin error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * PATCH /api/users/:id/deactivate — vô hiệu hoá tài khoản nhân viên
   */
  static async deactivateUser(req, res) {
    try {
      const { id } = req.params;
      if (id === req.user?.userId) {
        return res.status(400).json({ message: "Không thể tự vô hiệu hoá tài khoản của chính mình" });
      }
      const userRole = req.user?.role;
      const updated = await UserService.updateUserByAdmin(
        id,
        { isActive: false },
        userRole,
        tenantRequester(req)
      );

      await logActivity(req, {
        action: "deactivate_user",
        entityType: "user",
        entityId: id,
        details: { description: `Vô hiệu hoá user: ${updated.name}`, targetUserId: id },
        status: "success",
      });

      return res.status(200).json({ message: "Đã vô hiệu hoá user", user: updated });
    } catch (error) {
      if (error instanceof TenantAccessError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      console.error("[UserController] Deactivate user error:", error);
      return res.status(500).json({ message: error.message || "Lỗi server" });
    }
  }

  /**
   * PATCH /api/users/:id/activate — kích hoạt lại tài khoản
   */
  static async activateUser(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const updated = await UserService.updateUserByAdmin(
        id,
        { isActive: true },
        userRole,
        tenantRequester(req)
      );

      await logActivity(req, {
        action: "activate_user",
        entityType: "user",
        entityId: id,
        details: { description: `Kích hoạt lại user: ${updated.name}`, targetUserId: id },
        status: "success",
      });

      return res.status(200).json({ message: "Đã kích hoạt lại user", user: updated });
    } catch (error) {
      if (error instanceof TenantAccessError) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      console.error("[UserController] Activate user error:", error);
      return res.status(500).json({ message: error.message || "Lỗi server" });
    }
  }

  /**
   * PATCH /api/users/:id/remote-status — bật/tắt chế độ chấm công remote (Admin/HR)
   */
  static async setRemoteStatus(req, res) {
    try {
      const { id } = req.params;
      const { isRemote } = req.body || {};

      if (typeof isRemote !== "boolean") {
        return res.status(400).json({ message: "isRemote phải là true hoặc false" });
      }

      // Kiểm tra tenant scope (HR_MANAGER chỉ thao tác trong công ty của mình)
      const requester = tenantRequester(req);
      const target = await UserModel.findById(id).select("companyId").lean();
      if (!target) {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      if (requester.role !== "SUPER_ADMIN" && !canAccessUserTenant(requester, target)) {
        return res.status(403).json({ message: "Không có quyền thao tác với nhân viên này" });
      }

      const updated = await UserService.setRemoteStatus(id, isRemote, req.user?.userId || null);

      await logActivity(req, {
        action: "set_remote_status",
        entityType: "user",
        entityId: id,
        details: {
          description: `${isRemote ? "Bật" : "Tắt"} chế độ remote cho user: ${updated.name}`,
          targetUserId: id,
          isRemote,
        },
        status: "success",
      });

      return res.status(200).json({
        message: isRemote
          ? "Đã bật chế độ chấm công remote cho nhân viên"
          : "Đã tắt chế độ chấm công remote cho nhân viên",
        user: updated,
      });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      console.error("[UserController] setRemoteStatus error:", error);
      return res.status(500).json({ message: error.message || "Lỗi server. Vui lòng thử lại sau." });
    }
  }

  /**
   * @swagger
   * /api/users/me/avatar:
   *   post:
   *     summary: Upload avatar cho user hiện tại
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [avatar]
   *             properties:
   *               avatar:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Upload avatar thành công
   *       400:
   *         description: Không có file hoặc file không hợp lệ
   *       401:
   *         description: Không có quyền truy cập
   *       404:
   *         description: Không tìm thấy user
   */
  static async uploadAvatar(req, res) {
    try {
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({
          message: "Vui lòng chọn file ảnh để upload",
        });
      }

      // Lấy URL từ Cloudinary (được set trong custom CloudinaryStorage)
      // Thứ tự ưu tiên: location (secure_url), metadata.url, secure_url, path
      const avatarUrl =
        req.file?.location ||
        req.file?.metadata?.url ||
        req.file?.secure_url ||
        req.file?.path;

      if (!avatarUrl) {
        return res.status(500).json({ message: "Không lấy được URL ảnh sau khi upload" });
      }

      const updatedUser = await UserService.updateAvatar(userId, avatarUrl);

      return res.status(200).json({
        message: "Upload avatar thành công",
        user: updatedUser,
      });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      console.error("Upload avatar error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Tạo user mới (chỉ dành cho ADMIN, SUPER_ADMIN)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, name, role]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 6
   *               name:
   *                 type: string
   *                 minLength: 2
   *               role:
   *                 type: string
   *                 enum: [SUPER_ADMIN, ADMIN, HR_MANAGER, MANAGER, EMPLOYEE]
   *               department:
   *                 type: string
   *               branch:
   *                 type: string
   *               phone:
   *                 type: string
   *               defaultShiftId:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Tạo user thành công
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       403:
   *         description: Không có quyền truy cập
   *       409:
   *         description: Email đã tồn tại
   */
  static async createUserByAdmin(req, res) {
    try {
      // Validate request body
      const parse = createUserByAdminSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        const firstError = Object.values(errors.fieldErrors)[0]?.[0] || "Dữ liệu không hợp lệ";
        return res.status(400).json({
          message: firstError,
          errors: errors,
        });
      }

      // Get current user role for permission check
      const currentUser = await UserService.getUserById(req.user.userId);
      const currentUserRole = currentUser.role;

      // Only privileged roles can create users (must match requireRole on the route)
      if (!["SUPER_ADMIN", "ADMIN", "HR_MANAGER"].includes(currentUserRole)) {
        return res.status(403).json({
          message: "Chỉ SUPER_ADMIN, ADMIN và HR_MANAGER mới có quyền tạo tài khoản",
        });
      }

      const companyId = req.user.companyId;
      const newUser = await UserService.createUserByAdmin(parse.data, currentUserRole, companyId);

      // Log successful action
      await logActivity(req, {
        action: "create_user",
        entityType: "user",
        entityId: newUser._id.toString(),
        details: {
          description: `Đã tạo tài khoản mới: ${newUser.email}`,
          newUserEmail: newUser.email,
          newUserName: newUser.name,
          newUserRole: newUser.role,
        },
        status: "success",
      });

      return res.status(201).json({
        message: "Tạo tài khoản thành công",
        user: {
          _id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          department: newUser.department,
          branch: newUser.branch,
          phone: newUser.phone,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      // Log failed action
      await logActivity(req, {
        action: "create_user",
        entityType: "user",
        details: {
          description: "Tạo tài khoản thất bại",
          error: error.message,
          requestData: req.body,
        },
        status: "failed",
        errorMessage: error.message,
      });

      if (error.message.includes("không hợp lệ") || error.message.includes("phải có") || error.message.includes("không được để trống")) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "Email đã được đăng ký") {
        return res.status(409).json({ message: error.message });
      }
      if (error.message.includes("không có quyền") || error.message.includes("không tồn tại")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("[UserController] Create user by admin error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * GET /api/users/managers
   * Lấy danh sách managers (cho dropdown)
   */
  static async getManagers(req, res) {
    try {
      const { branchId } = req.query;
      const companyId = resolveTenantCompanyId(req);

      // Query để lấy managers
      const query = {
        role: { $in: ["ADMIN", "HR_MANAGER", "MANAGER", "SUPER_ADMIN"] },
        isActive: true,
      };

      if (companyId) query.companyId = companyId;

      if (branchId && branchId !== "all") {
        query.branch = branchId;
      }

      // Lấy tất cả managers (không pagination)
      const users = await UserModel.find(query)
        .select("name email role branch")
        .populate("branch", "name")
        .limit(1000);

      const managersList = users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branch?._id?.toString() || user.branch?.toString() || null,
        branchName: user.branch?.name || null,
      }));

      res.json({ managers: managersList });
    } catch (error) {
      console.error("[UserController] getManagers error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  /**
   * GET /api/users/my-team
   * Lấy danh sách nhân viên trong phòng ban của Manager
   */
  static async getMyTeamMembers(req, res) {
    try {
      const managerId = req.user.userId;

      // Lấy thông tin manager để biết department
      const manager = await UserModel.findById(managerId).select("department");

      if (!manager || !manager.department) {
        return res.json({ users: [] });
      }

      // Lấy tất cả nhân viên trong cùng phòng ban (trừ chính manager)
      const teamMembers = await UserModel.find({
        department: manager.department,
        _id: { $ne: managerId },
        isActive: true,
      })
        .select("_id name email position role department branch")
        .populate("department", "name")
        .populate("branch", "name")
        .sort({ name: 1 });

      const users = teamMembers.map((user) => ({
        _id: user._id.toString(),
        fullName: user.name,
        name: user.name,
        email: user.email,
        position: user.position || user.role || "Nhân viên",
        role: user.role,
        department: user.department?.name || null,
        branch: user.branch?.name || null,
      }));

      res.json({ users });
    } catch (error) {
      console.error("[UserController] getMyTeamMembers error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }

  // POST /api/users/bulk-import
  static async bulkImport(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng upload file CSV hoặc Excel" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows || rows.length === 0) {
        return res.status(400).json({ message: "File không có dữ liệu" });
      }
      if (rows.length > 500) {
        return res.status(400).json({ message: "Tối đa 500 nhân viên mỗi lần import" });
      }

      const adminRole = req.user.role;
      const companyId = req.user.companyId;
      const results = await UserService.bulkImportUsers(rows, adminRole, companyId);

      await logActivity(req, {
        action: "bulk_import_users",
        entityType: "user",
        details: {
          description: `Import ${results.created.length} nhân viên thành công, ${results.failed.length} thất bại`,
          created: results.created.length,
          failed: results.failed.length,
        },
        status: results.failed.length === 0 ? "success" : "warning",
      });

      return res.status(200).json({
        message: `Import hoàn tất: ${results.created.length} thành công, ${results.failed.length} thất bại`,
        created: results.created,
        failed: results.failed,
      });
    } catch (error) {
      console.error("bulkImport error:", error);
      return res.status(500).json({ message: error.message || "Lỗi server khi import" });
    }
  }

  // GET /api/users/import-template
  static getImportTemplate(req, res) {
    const headers = [["name", "email", "password", "role", "department", "branch", "position", "phone", "taxId"]];
    const example = [["Nguyễn Văn A", "nva@company.com", "password123", "EMPLOYEE", "Phòng Kỹ thuật", "Hà Nội", "Developer", "0912345678", ""]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhanVien");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="import-template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buf);
  }
}

