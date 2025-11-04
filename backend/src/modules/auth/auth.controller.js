import { AuthService } from "./auth.service.js";
import { z } from "zod";

// Validation schemas
export const registerSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    name: z.string().min(1, "Tên không được để trống")
});

export const loginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự")
});

/**
 * Controller xử lý các request liên quan đến Authentication
 */
export class AuthController {
    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Đăng ký người dùng mới
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterRequest'
     *     responses:
     *       201:
     *         description: Đăng ký thành công
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Dữ liệu không hợp lệ
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       409:
     *         description: Email đã tồn tại
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    static async register(req, res) {
        try {
            // Validate request body
            const parse = registerSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Dữ liệu không hợp lệ",
                    errors: parse.error.flatten()
                });
            }

            // Register user
            const result = await AuthService.register(parse.data);

            return res.status(201).json(result);
        } catch (error) {
            if (error.message === "Email already registered") {
                return res.status(409).json({ message: "Email đã được đăng ký" });
            }
            console.error("Register error:", error);
            return res.status(500).json({ message: "Lỗi server" });
        }
    }

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Đăng nhập
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Đăng nhập thành công
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Dữ liệu không hợp lệ
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         description: Thông tin đăng nhập không đúng
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    static async login(req, res) {
        try {
            // Validate request body
            const parse = loginSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Dữ liệu không hợp lệ",
                    errors: parse.error.flatten()
                });
            }

            // Login user
            const result = await AuthService.login(parse.data);

            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "Invalid credentials") {
                return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
            }
            console.error("Login error:", error);
            return res.status(500).json({ message: "Lỗi server" });
        }
    }

    /**
     * @swagger
     * /api/auth/me:
     *   get:
     *     summary: Lấy thông tin người dùng hiện tại
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Thông tin người dùng
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       401:
     *         description: Không có quyền truy cập
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       404:
     *         description: Không tìm thấy người dùng
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    static async getCurrentUser(req, res) {
        try {
            const user = await AuthService.getCurrentUser(req.user.userId);
            return res.status(200).json(user);
        } catch (error) {
            if (error.message === "User not found") {
                return res.status(404).json({ message: "Không tìm thấy người dùng" });
            }
            console.error("Get current user error:", error);
            return res.status(500).json({ message: "Lỗi server" });
        }
    }
}

