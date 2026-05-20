import { AuthService } from "./auth.service.js";
import {
    registerSchema,
    loginSchema,
    verifyOTPSchema,
    resendOTPSchema,
    forgotPasswordSchema,
    verifyResetOTPSchema,
    resetPasswordSchema,
    refreshBodySchema,
} from "@smartattendance/shared";
import { logActivity } from "../../utils/logger.util.js";
import { isRedisEnabled } from "../../config/redis.js";
import { getClientIpAddress } from "../../utils/client-ip.util.js";

const REFRESH_COOKIE = "sa_refresh";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
};

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
        let parsedData = null;
        try {
            // Validate request body
            const parse = registerSchema.safeParse(req.body);
            if (!parse.success) {
                const errors = parse.error.flatten();
                // Tạo message từ field errors
                const fieldErrors = errors.fieldErrors || {};
                let errorMessage = "Dữ liệu không hợp lệ";

                if (fieldErrors.companyName) {
                    errorMessage = fieldErrors.companyName[0] || "Tên công ty không hợp lệ";
                } else if (fieldErrors.email) {
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

            parsedData = parse.data;

            // Register user
            const result = await AuthService.register(parsedData);

            // Log successful registration
            await logActivity(req, {
                action: "register",
                entityType: "auth",
                entityId: result.user?.id || null,
                details: {
                    description: `Đăng ký tài khoản mới: ${result.user?.email || parsedData.email}`,
                    userEmail: result.user?.email,
                    userName: result.user?.name,
                },
                status: "success",
            });

            // Set userId trong req để logActivity có thể sử dụng
            if (result.user?.id) {
                req.user = { userId: result.user.id };
            }

            return res.status(201).json(result);
        } catch (error) {
            // Log failed registration
            await logActivity(req, {
                action: "register",
                entityType: "auth",
                details: {
                    description: `Đăng ký thất bại: ${parsedData?.email || req.body?.email || "Unknown email"}`,
                    reason: error.message,
                },
                status: "failed",
                errorMessage: error.message,
            });

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
        let parsedData = null;
        try {
            // Validate request body
            const parse = loginSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            parsedData = parse.data;

            // Login user
            const result = await AuthService.login(parsedData, {
                ipAddress: getClientIpAddress(req),
                userAgent: req.headers["user-agent"],
            });

            // Log successful login
            await logActivity(req, {
                action: "login",
                entityType: "auth",
                entityId: result.user?.id || null,
                details: {
                    description: `Đăng nhập thành công: ${result.user?.email || parsedData.email}`,
                    userEmail: result.user?.email,
                    userName: result.user?.name,
                },
                status: "success",
            });

            // Set userId trong req để logActivity có thể sử dụng
            req.user = { userId: result.user?.id };

            // Defense-in-depth: set refreshToken as httpOnly cookie for web clients
            // AND return in body for mobile clients (RN has no native cookie jar).
            res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
            return res.status(200).json(result);
        } catch (error) {
            // Log failed login attempt
            await logActivity(req, {
                action: "login",
                entityType: "auth",
                details: {
                    description: `Đăng nhập thất bại: ${parsedData?.email || req.body?.email || "Unknown email"}`,
                    reason: error.message,
                },
                status: "failed",
                errorMessage: error.message,
            });

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
            const result = await AuthService.verifyOTP(parse.data.email, parse.data.otp, {
                ipAddress: getClientIpAddress(req),
                userAgent: req.headers["user-agent"],
            });

            if (result.refreshToken) {
                res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
            }
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
            if (error.message === "OTP not found. Please request a new one.") {
                return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
            }
            if (error.message === "OTP expired. Please request a new OTP.") {
                return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
            }
            if (error.message === "Invalid OTP") {
                return res.status(400).json({ message: "Invalid OTP" });
            }
            if (error.message === "Too many failed attempts. Please request a new OTP.") {
                return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
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
            if (error.message === "Too many failed attempts. Please request a new OTP.") {
                return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
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
    static async refresh(req, res) {
        try {
            // Prefer httpOnly cookie; fall back to body for old clients during migration
            const tokenFromCookie = req.cookies?.[REFRESH_COOKIE];
            const parse = refreshBodySchema.safeParse(req.body);
            const tokenFromBody = parse.success ? parse.data.refreshToken : undefined;
            const refreshToken = tokenFromCookie || tokenFromBody;

            if (!refreshToken) {
                return res.status(401).json({ message: "No refresh token provided" });
            }

            const result = await AuthService.refreshToken(refreshToken);

            // Rotate: set new refresh token as httpOnly cookie AND return in body (mobile-friendly)
            res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
            return res.status(200).json(result);
        } catch (error) {
            // Clear stale cookie on invalid/revoked token
            res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTIONS.path });
            return res.status(401).json({ message: error.message });
        }
    }

    static async logout(req, res) {
        try {
            await AuthService.logout(req.user.userId);
            res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTIONS.path });
            return res.status(200).json({ message: "Logged out successfully" });
        } catch (error) {
            console.error("Logout error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async getAdminSessions(req, res) {
        try {
            if (!isRedisEnabled()) {
                return res.status(200).json({
                    sessions: [],
                    sessionsUnavailableReason: "REDIS_DISABLED",
                    message:
                        "Theo dõi phiên đăng nhập cần Redis (REDIS_URL hoặc REDIS_HOST). Bật Redis để ghi nhận và xem phiên.",
                });
            }
            const sessions = await AuthService.getActiveSessions();
            return res.status(200).json({ sessions });
        } catch (error) {
            console.error("getAdminSessions error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async forceLogoutUser(req, res) {
        try {
            const { userId } = req.params;
            if (userId === req.user.userId.toString()) {
                return res.status(400).json({ message: "Không thể tự force logout chính mình" });
            }
            const result = await AuthService.forceLogout(userId);
            return res.status(200).json({ message: `Đã đăng xuất ${result.userName || userId}`, ...result });
        } catch (error) {
            console.error("forceLogoutUser error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async resetPassword(req, res) {
        try {
            const parse = resetPasswordSchema.safeParse(req.body);
            if (!parse.success) {
                return res.status(400).json({
                    message: "Invalid data",
                    errors: parse.error.flatten()
                });
            }

            const result = await AuthService.resetPassword(parse.data.email, parse.data.password, parse.data.resetToken);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message === "User not found") {
                return res.status(404).json({ message: "User not found" });
            }
            if (error.message === "Invalid or expired reset token. Please verify OTP again.") {
                return res.status(400).json({ message: "Invalid or expired reset token. Please verify OTP again." });
            }
            console.error("Reset password error:", error);
            return res.status(500).json({
                message: error.message || "Internal server error"
            });
        }
    }
}

