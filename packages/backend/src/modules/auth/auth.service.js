import crypto from "crypto";
import { UserModel } from "../users/user.model.js";
import { OtpModel } from "../otp/otp.model.js";
import { generateTokenFromUser, verifyRefreshToken, generateAccessToken, generateRefreshToken } from "../../utils/jwt.util.js";
import { generateOTP, generateOTPExpiry } from "../../utils/otp.util.js";
import { sendOTPEmail, sendResetPasswordEmail } from "../../utils/email.util.js";
import { redisSet, redisDel, redisGet, redisSAdd, redisSRem, redisSMembers, isRedisEnabled } from "../../config/redis.js";

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const refreshKey = (userId) => `refresh:${userId}`;
const sessionMetaKey = (userId) => `session_meta:${userId}`;
const ACTIVE_SESSIONS_SET = "active_sessions";

export class AuthService {
    /**
     * Ghi nhận phiên đăng nhập (Redis): metadata + tập active_sessions.
     * Phiên đăng nhập / admin sessions API phụ thuộc Redis — không gọi được nếu Redis tắt.
     */
    static async registerActiveSession(user, meta = {}) {
        const userId = user._id.toString();
        await redisSet(
            sessionMetaKey(userId),
            {
                userId,
                userName: user.name,
                userEmail: user.email,
                userRole: user.role,
                ipAddress: meta.ipAddress || null,
                userAgent: meta.userAgent || null,
                loginAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
            },
            REFRESH_TTL
        );
        await redisSAdd(ACTIVE_SESSIONS_SET, userId);
    }

    // Đăng ký tài khoản mới
    static async register(userData) {
        const { email, password, name } = userData;

        // Normalize email (lowercase, trim)
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedName = name.trim();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            throw new Error("Email không hợp lệ");
        }

        // Validate name length
        if (normalizedName.length < 5) {
            throw new Error("Họ và tên phải có ít nhất 5 ký tự");
        }

        // Check if email already exists
        const existed = await UserModel.findOne({ email: normalizedEmail });
        if (existed) {
            throw new Error("Email already registered");
        }

        // Tạo tài khoản mới với role TRIAL (7 ngày dùng thử)
        let user;
        try {
            const trialExpiresAt = new Date();
            trialExpiresAt.setDate(trialExpiresAt.getDate() + 7); // 7 ngày từ bây giờ

            user = await UserModel.create({
                email: normalizedEmail,
                password,
                name: normalizedName,
                role: "TRIAL", // Đăng ký mặc định là TRIAL
                isTrial: true,
                trialExpiresAt: trialExpiresAt,
                isVerified: false,
            });
        } catch (error) {
            // Handle duplicate email race condition
            if (error.code === 11000 || error.message.includes("duplicate")) {
                throw new Error("Email already registered");
            }
            throw error;
        }

        // Tạo OTP mới
        try {
            const otpCode = generateOTP();
            const otpExpires = generateOTPExpiry();

            await OtpModel.create({
                userId: user._id,
                email: normalizedEmail,
                code: otpCode,
                purpose: "verify_email",
                expiresAt: otpExpires,
            });

            // Gửi email OTP (không throw error nếu fail - OTP đã được tạo)
            const emailResult = await sendOTPEmail(normalizedEmail, otpCode, normalizedName);
            if (!emailResult.success) {
                console.warn("⚠️  Email không gửi được, nhưng OTP đã được tạo. User có thể xem OTP trong console hoặc request resend.");
            }
        } catch (error) {
            // Nếu tạo OTP thất bại, xóa user đã tạo để tránh orphan data
            try {
                await UserModel.findByIdAndDelete(user._id);
            } catch (deleteError) {
                console.error("Failed to cleanup user after OTP creation failure:", deleteError);
            }
            console.error("Failed to create OTP:", error);
            throw new Error("Không thể tạo mã OTP. Vui lòng thử lại.");
        }

        return {
            message:
                "Đăng ký thành công. Vui lòng kiểm tra email để xác thực OTP.",
            userId: user._id,
            email: user.email,
        };
    }

    // Xác thực OTP
    static async verifyOTP(email, otp, meta = {}) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) throw new Error("User not found");
        if (user.isVerified) throw new Error("Email already verified");

        // Chỉ lấy OTP dùng cho verify_email để tránh dùng nhầm OTP của flow khác.
        const otpRecord = await OtpModel.findOne({
            email: normalizedEmail,
            purpose: "verify_email",
        }).sort({ createdAt: -1 });
        if (!otpRecord) throw new Error("OTP not found. Please request a new one.");

        if (new Date() > otpRecord.expiresAt) {
            throw new Error("OTP expired. Please request a new OTP.");
        }

        // Kiểm tra số lần thử OTP
        if (otpRecord.attempts >= 5) {
            await OtpModel.deleteMany({ email: normalizedEmail, purpose: "verify_email" });
            throw new Error("Too many failed attempts. Please request a new OTP.");
        }

        // So sánh OTP bằng constant-time comparison để tránh timing attack
        const otpBuffer = Buffer.from(otpRecord.code);
        const inputBuffer = Buffer.from(otp.trim());
        if (otpBuffer.length !== inputBuffer.length || !crypto.timingSafeEqual(otpBuffer, inputBuffer)) {
            // Tăng số lần thử sai
            otpRecord.attempts = (otpRecord.attempts || 0) + 1;
            await otpRecord.save();
            throw new Error("Invalid OTP");
        }

        // Cập nhật user và xóa OTP
        user.isVerified = true;
        await user.save();

        await OtpModel.deleteMany({ email: normalizedEmail, purpose: "verify_email" }); // xóa OTP verify cũ

        const { accessToken, refreshToken } = generateTokenFromUser(user);
        await redisSet(refreshKey(user._id), refreshToken, REFRESH_TTL);
        await AuthService.registerActiveSession(user, meta);
        return {
            message: "Email verified successfully",
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isVerified: user.isVerified,
            },
        };
    }

    // Gửi lại OTP
    static async resendOTP(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) throw new Error("User not found");
        if (user.isVerified) throw new Error("Email already verified");

        const otpCode = generateOTP();
        const otpExpires = generateOTPExpiry();

        // Xóa các OTP verify_email cũ trước khi tạo mới
        await OtpModel.deleteMany({ email: normalizedEmail, purpose: "verify_email" });

        await OtpModel.create({
            userId: user._id,
            email: normalizedEmail,
            code: otpCode,
            purpose: "verify_email",
            expiresAt: otpExpires,
        });

        // Gửi email OTP (không throw error nếu fail - OTP đã được tạo)
        const emailResult = await sendOTPEmail(normalizedEmail, otpCode, user.name);
        if (!emailResult.success) {
            console.warn("⚠️  Email không gửi được, nhưng OTP đã được tạo. User có thể xem OTP trong console.");
            // Không throw error - OTP đã được tạo thành công
        }

        return { message: "New OTP sent successfully. Please check your email." };
    }

    // Đăng nhập
    static async login(credentials, meta = {}) {
        const { email, password } = credentials;
        const normalizedEmail = email.toLowerCase().trim();
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) throw new Error("Invalid credentials");
        if (!user.isVerified) throw new Error("Email not verified. Please verify your email first.");
        if (user.isActive === false) {
            throw new Error("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.");
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) throw new Error("Invalid credentials");

        const { accessToken, refreshToken } = generateTokenFromUser(user);
        await redisSet(refreshKey(user._id), refreshToken, REFRESH_TTL);
        await AuthService.registerActiveSession(user, meta);

        return {
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    // Lấy user hiện tại
    static async getCurrentUser(userId) {
        const user = await UserModel.findById(userId)
            .select("-password -otp -otpExpires")
            .populate("department", "name code")
            .populate("branch", "name address");
        if (!user) throw new Error("User not found");
        return user;
    }

    // Quên mật khẩu - Gửi OTP để reset password
    static async forgotPassword(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) {

            return {
                success: true,
                message: "If the email exists, an OTP has been sent to your email."
            };
        }

        if (!user.isVerified) {
            throw new Error("Email not verified. Please verify your email first.");
        }

        const otpCode = generateOTP();
        const otpExpires = generateOTPExpiry();

        // Xóa các OTP quên mật khẩu trước đó để tránh spam
        await OtpModel.deleteMany({
            email: normalizedEmail,
            purpose: "forgot_password",
        });

        await OtpModel.create({
            userId: user._id,
            email: normalizedEmail,
            code: otpCode,
            purpose: "forgot_password",
            expiresAt: otpExpires,
            verified: false,
        });

        // Gửi email OTP reset password
        const emailResult = await sendResetPasswordEmail(normalizedEmail, otpCode, user.name);
        if (!emailResult.success) {
            console.warn("⚠️  Email không gửi được, nhưng OTP đã được tạo. User có thể xem OTP trong console.");
        }

        return {
            success: true,
            message: "If the email exists, an OTP has been sent to your email."
        };
    }

    // Xác thực OTP để reset password
    static async verifyResetOtp(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) throw new Error("User not found");

        // Lấy OTP reset password
        const otpRecord = await OtpModel.findOne({
            email: normalizedEmail,
            purpose: "forgot_password"
        }).sort({ createdAt: -1 });

        if (!otpRecord) throw new Error("OTP not found. Please request a new one.");

        if (new Date() > otpRecord.expiresAt) {
            await OtpModel.deleteMany({ email: normalizedEmail, purpose: "forgot_password" });
            throw new Error("OTP expired. Please request a new OTP.");
        }

        // Kiểm tra số lần thử OTP
        if (otpRecord.attempts >= 5) {
            await OtpModel.deleteMany({ email: normalizedEmail, purpose: "forgot_password" });
            throw new Error("Too many failed attempts. Please request a new OTP.");
        }

        // So sánh OTP bằng constant-time comparison để tránh timing attack
        const otpBuffer = Buffer.from(otpRecord.code);
        const inputBuffer = Buffer.from(otp.trim());
        if (otpBuffer.length !== inputBuffer.length || !crypto.timingSafeEqual(otpBuffer, inputBuffer)) {
            // Tăng số lần thử sai
            otpRecord.attempts = (otpRecord.attempts || 0) + 1;
            await otpRecord.save();
            throw new Error("Invalid OTP");
        }

        // Xóa OTP record sau khi xác thực thành công
        await OtpModel.deleteMany({ email: normalizedEmail, purpose: "forgot_password" });

        // Tạo reset token ngắn hạn (5 phút) lưu trên Redis, ràng buộc với email
        const resetToken = crypto.randomBytes(32).toString("hex");
        await redisSet(`reset_token:${normalizedEmail}`, resetToken, 300);

        return {
            success: true,
            message: "OTP verified successfully. You can now reset your password.",
            resetToken,
        };
    }

    // Cấp access token mới từ refresh token
    static async refreshToken(token) {
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch {
            throw new Error("Invalid or expired refresh token");
        }

        // When Redis is enabled, enforce token binding (rotation + revocation).
        // Without Redis the check is skipped — JWT signature is the only guard.
        if (isRedisEnabled()) {
            const stored = await redisGet(refreshKey(decoded.userId));
            if (!stored || stored !== token) {
                throw new Error("Refresh token revoked");
            }
        }

        const user = await UserModel.findById(decoded.userId).select("_id email role department isActive isTrial trialExpiresAt").lean();
        if (!user || user.isActive === false) {
            throw new Error("User not found or inactive");
        }

        const newAccess = generateAccessToken({
            userId: user._id,
            email: user.email,
            role: user.role || "EMPLOYEE",
            department_id: user.department,
        });
        const newRefresh = generateRefreshToken({ userId: user._id });
        await redisSet(refreshKey(user._id), newRefresh, REFRESH_TTL);

        const sid = user._id.toString();
        const existingMeta = await redisGet(sessionMetaKey(sid));
        if (existingMeta) {
            existingMeta.lastActiveAt = new Date().toISOString();
            await redisSet(sessionMetaKey(sid), existingMeta, REFRESH_TTL);
            await redisSAdd(ACTIVE_SESSIONS_SET, sid);
        }

        return { token: newAccess, refreshToken: newRefresh };
    }

    // Thu hồi refresh token (logout)
    static async logout(userId) {
        const id = userId.toString();
        await redisDel(refreshKey(id), sessionMetaKey(id));
        await redisSRem(ACTIVE_SESSIONS_SET, id);
    }

    // Lấy tất cả sessions đang active (admin only)
    static async getActiveSessions() {
        const userIds = await redisSMembers(ACTIVE_SESSIONS_SET);
        if (!userIds || userIds.length === 0) return [];

        const sessions = await Promise.all(
            userIds.map(async (uid) => {
                const meta = await redisGet(sessionMetaKey(uid));
                if (!meta) {
                    // Session expired but set not cleaned — remove stale entry
                    await redisSRem(ACTIVE_SESSIONS_SET, uid);
                    return null;
                }
                return meta;
            })
        );

        return sessions.filter(Boolean).sort((a, b) =>
            new Date(b.loginAt) - new Date(a.loginAt)
        );
    }

    // Force logout một user cụ thể (admin only)
    static async forceLogout(userId) {
        const id = userId.toString();
        const meta = await redisGet(sessionMetaKey(id));
        await redisDel(refreshKey(id), sessionMetaKey(id));
        await redisSRem(ACTIVE_SESSIONS_SET, id);
        return { userId: id, userName: meta?.userName || null };
    }

    // Đặt lại mật khẩu mới
    static async resetPassword(email, newPassword, resetToken) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) throw new Error("User not found");

        // Xác thực reset token từ Redis (được cấp sau khi verify OTP)
        const storedToken = await redisGet(`reset_token:${normalizedEmail}`);
        if (!storedToken || storedToken !== resetToken) {
            throw new Error("Invalid or expired reset token. Please verify OTP again.");
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        await user.save();

        // Xóa reset token khỏi Redis sau khi dùng (single-use)
        await redisDel(`reset_token:${normalizedEmail}`);

        return {
            success: true,
            message: "Password reset successfully. You can now login with your new password."
        };
    }
}
