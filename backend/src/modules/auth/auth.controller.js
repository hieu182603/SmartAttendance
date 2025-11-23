import { AuthService } from "./auth.service.js";
import { z } from "zod";

// Validation schemas
export const registerSchema = z.object({
    email: z.string().email("Email không hợp lệ").min(1, "Email không được để trống"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").max(100, "Mật khẩu không được vượt quá 100 ký tự"),
    name: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự").max(100, "Họ và tên không được vượt quá 100 ký tự")
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters")
});

export const verifyOTPSchema = z.object({
    email: z.string().email("Invalid email"),
    otp: z.string().length(6, "OTP must be 6 digits")
});

export const resendOTPSchema = z.object({
    email: z.string().email("Invalid email")
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email")
});

export const verifyResetOTPSchema = z.object({
    email: z.string().email("Invalid email"),
    otp: z.string().length(6, "OTP must be 6 digits")
});

export const resetPasswordSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters")
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
                const errors = parse.error.flatten();
                // Tạo message từ field errors
                const fieldErrors = errors.fieldErrors || {};
                let errorMessage = "Dữ liệu không hợp lệ";

                if (fieldErrors.email) {
                    errorMessage = fieldErrors.email[0] || "Email không hợp lệ";
                } else if (fieldErrors.password) {
                    errorMessage = fieldErrors.password[0] || "Mật khẩu phải có ít nhất 6 ký tự";
                } else if (fieldErrors.name) {
                    errorMessage = fieldErrors.name[0] || "Họ và tên không được để trống";
                }

                return res.status(400).json({
                    message: errorMessage,
                    errors: errors
                });
            }

            // Register user
            const result = await AuthService.register(parse.data);

            return res.status(201).json(result);
        } catch (error) {
            if (error.message === "Email already registered") {
                return res.status(409).json({ message: "Email đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập." });
            }
            if (error.message === "Không thể tạo mã OTP. Vui lòng thử lại.") {
                return res.status(500).json({ message: error.message });
            }
            console.error("Register error:", error);
            return res.status(500).json({
                message: error.message || "Lỗi server. Vui lòng thử lại sau."
            });
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
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            // Login user
            const result = await AuthService.login(parse.data);

            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "Invalid credentials") {
                return res.status(401).json({ message: "Invalid email or password" });
            }
            if (error.message === "Email not verified. Please verify your email first.") {
                return res.status(403).json({ message: "Email not verified. Please verify your email first." });
            }
            console.error("Login error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * @swagger
     * /api/auth/verify-otp:
     *   post:
     *     summary: Verify OTP and activate account
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, otp]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               otp:
     *                 type: string
     *                 minLength: 6
     *                 maxLength: 6
     *     responses:
     *       200:
     *         description: Email verified successfully
     *       400:
     *         description: Invalid data, invalid OTP, expired OTP, or email already verified
     *       404:
     *         description: User not found
     */
    static async verifyOTP(req, res) {
        try {
            // Validate request body
            const parse = verifyOTPSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            // Verify OTP
            const result = await AuthService.verifyOTP(parse.data.email, parse.data.otp);

            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "User not found") {
                return res.status(404).json({ message: "User not found" });
            }
            if (error.message === "Email already verified") {
                return res.status(400).json({ message: "Email already verified" });
            }
            if (error.message === "OTP not found. Please request a new OTP.") {
                return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
            }
            if (error.message === "OTP expired. Please request a new OTP.") {
                return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
            }
            if (error.message === "Invalid OTP") {
                return res.status(400).json({ message: "Invalid OTP" });
            }
            console.error("Verify OTP error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * @swagger
     * /api/auth/resend-otp:
     *   post:
     *     summary: Resend OTP to email
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: OTP sent successfully
     *       400:
     *         description: Invalid data or email already verified
     *       404:
     *         description: User not found
     *       500:
     *         description: Failed to send OTP email
     */
    static async resendOTP(req, res) {
        try {
            // Validate request body
            const parse = resendOTPSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            // Resend OTP
            const result = await AuthService.resendOTP(parse.data.email);

            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "User not found") {
                return res.status(404).json({ message: "User not found" });
            }
            if (error.message === "Email already verified") {
                return res.status(400).json({ message: "Email already verified" });
            }
            // Không throw error nếu email fail - OTP đã được tạo, user có thể xem trong console
            console.error("Resend OTP error:", error);
            return res.status(500).json({
                message: error.message || "Internal server error"
            });
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
                return res.status(404).json({ message: "User not found" });
            }
            console.error("Get current user error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * @swagger
     * /api/auth/forgot-password:
     *   post:
     *     summary: Gửi OTP để reset password
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: OTP sent successfully
     *       400:
     *         description: Invalid data or email not verified
     */
    static async forgotPassword(req, res) {
        try {
            const parse = forgotPasswordSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            const result = await AuthService.forgotPassword(parse.data.email);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "Email not verified. Please verify your email first.") {
                return res.status(400).json({ message: "Email not verified. Please verify your email first." });
            }
            console.error("Forgot password error:", error);
            return res.status(500).json({ 
                message: error.message || "Internal server error" 
            });
        }
    }

    /**
     * @swagger
     * /api/auth/verify-reset-otp:
     *   post:
     *     summary: Xác thực OTP để reset password
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, otp]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               otp:
     *                 type: string
     *                 minLength: 6
     *                 maxLength: 6
     *     responses:
     *       200:
     *         description: OTP verified successfully
     *       400:
     *         description: Invalid data, invalid OTP, or expired OTP
     *       404:
     *         description: User not found
     */
    static async verifyResetOtp(req, res) {
        try {
            const parse = verifyResetOTPSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            const result = await AuthService.verifyResetOtp(parse.data.email, parse.data.otp);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "User not found") {
                return res.status(404).json({ message: "User not found" });
            }
            if (error.message === "OTP not found. Please request a new one.") {
                return res.status(400).json({ message: "OTP not found. Please request a new one." });
            }
            if (error.message === "OTP expired. Please request a new OTP.") {
                return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
            }
            if (error.message === "Invalid OTP") {
                return res.status(400).json({ message: "Invalid OTP" });
            }
            console.error("Verify reset OTP error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * @swagger
     * /api/auth/reset-password:
     *   post:
     *     summary: Đặt lại mật khẩu mới
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, password]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *                 minLength: 6
     *     responses:
     *       200:
     *         description: Password reset successfully
     *       400:
     *         description: Invalid data or reset token expired
     *       404:
     *         description: User not found
     */
    static async resetPassword(req, res) {
        try {
            const parse = resetPasswordSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            const result = await AuthService.resetPassword(parse.data.email, parse.data.password);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "User not found") {
                return res.status(404).json({ message: "User not found" });
            }
            if (error.message === "Please verify OTP first before resetting password.") {
                return res.status(400).json({ message: "Please verify OTP first before resetting password." });
            }
            if (error.message === "Reset token expired. Please request a new OTP.") {
                return res.status(400).json({ message: "Reset token expired. Please request a new OTP." });
            }
            console.error("Reset password error:", error);
            return res.status(500).json({ 
                message: error.message || "Internal server error" 
            });
        }
    }
}

