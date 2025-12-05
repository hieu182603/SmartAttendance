import { UserService } from "./user.service.js";
import { UserModel } from "./user.model.js";
import { z } from "zod";
import { logActivity } from "../../utils/logger.util.js";

const updateUserSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthday: z.string().optional(),
  avatar: z.string().url("URL không hợp lệ").optional(),
  avatarUrl: z.string().url("URL không hợp lệ").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mật khẩu hiện tại không được để trống"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
});

const updateUserByAdminSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
  email: z.string().email("Email không hợp lệ").optional(),
  phone: z
    .union([
      z.string().regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
      z.literal(""),
    ])
    .optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"]).optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  defaultShiftId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  avatar: z
    .union([
      z.string().url("URL không hợp lệ"),
      z.literal(""),
    ])
    .optional(),
  avatarUrl: z
    .union([
      z.string().url("URL không hợp lệ"),
      z.literal(""),
    ])
    .optional(),
});

export class UserController {
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
      const result = await UserService.getAllUsers(req.query);
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
      const user = await UserService.getUserByIdForAdmin(id);
      return res.status(200).json(user);
    } catch (error) {
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
        userRole
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
   * GET /api/users/managers
   * Lấy danh sách managers (cho dropdown)
   */
  static async getManagers(req, res) {
    try {
      const { branchId } = req.query;

      // Query để lấy managers
      const query = {
        role: { $in: ["ADMIN", "HR_MANAGER", "MANAGER", "SUPER_ADMIN"] },
        isActive: true,
      };

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
}

