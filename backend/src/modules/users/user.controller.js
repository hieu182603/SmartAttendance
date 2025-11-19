import { UserService } from "./user.service.js";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthday: z.string().optional(),
  avatarUrl: z.string().url("URL không hợp lệ").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mật khẩu hiện tại không được để trống"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
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
      console.error("Get all users error:", error);
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
      console.error("Get user by ID error:", error);
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
      const updatedUser = await UserService.updateUserByAdmin(id, req.body);
      return res.status(200).json({
        message: "Cập nhật thông tin user thành công",
        user: updatedUser,
      });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }
      if (error.message === "Không có dữ liệu để cập nhật") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Update user by admin error:", error);
      return res.status(500).json({
        message: error.message || "Lỗi server. Vui lòng thử lại sau.",
      });
    }
  }
}

