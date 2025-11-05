import { UserModel } from "../users/user.model.js";
import { generateTokenFromUser } from "../../utils/jwt.util.js";
import { generateOTP, generateOTPExpiry } from "../../utils/otp.util.js";
import { sendOTPEmail } from "../../utils/email.util.js";


export class AuthService {
    /**
     * Đăng ký người dùng mới
     * @param {Object} userData 
     * @returns {Promise<Object>} 
     * @throws {Error} 
     */
    static async register(userData) {
        const { email, password, name } = userData;

        const existed = await UserModel.findOne({ email });
        if (existed) {
            throw new Error("Email already registered");
        }

        // Tạo OTP và thời gian hết hạn
        const otp = generateOTP();
        const otpExpires = generateOTPExpiry();

        // Tạo user mới (password sẽ tự động hash trong pre-save hook)
        const user = await UserModel.create({
            email,
            password,
            name,
            otp,
            otpExpires,
            isVerified: false
        });

        // Gửi OTP qua email
        try {
            await sendOTPEmail(email, otp, name);
        } catch (error) {
            // Nếu gửi email thất bại, vẫn tạo user nhưng log lỗi
            console.error("Failed to send OTP email:", error);
            // Có thể throw error hoặc chỉ log, tùy vào yêu cầu
        }

        return {
            message: "Registration successful. Please check your email for OTP verification.",
            userId: user._id,
            email: user.email
        };
    }

    /**
     * Đăng nhập người dùng
     * @param {Object} credentials - Thông tin đăng nhập {email, password}
     * @returns {Promise<Object>} User object và JWT token
     * @throws {Error} Nếu thông tin đăng nhập không hợp lệ hoặc chưa verify
     */
    static async login(credentials) {
        const { email, password } = credentials;

        // Tìm user theo email
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error("Invalid credentials");
        }

        // Kiểm tra email đã được verify chưa
        if (!user.isVerified) {
            throw new Error("Email not verified. Please verify your email first.");
        }

        // Xác thực password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error("Invalid credentials");
        }

        // Tạo JWT token
        const token = generateTokenFromUser(user);

        return {
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        };
    }

    /**
     * Xác thực OTP và verify email
     * @param {string} email - Email của user
     * @param {string} otp - OTP code
     * @returns {Promise<Object>} User object và JWT token
     * @throws {Error} Nếu OTP không hợp lệ hoặc đã hết hạn
     */
    static async verifyOTP(email, otp) {
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error("User not found");
        }

        // Kiểm tra user đã verify chưa
        if (user.isVerified) {
            throw new Error("Email already verified");
        }

        // Kiểm tra OTP có tồn tại không
        if (!user.otp || !user.otpExpires) {
            throw new Error("OTP not found. Please request a new OTP.");
        }

        // Kiểm tra OTP có hết hạn không
        if (new Date() > user.otpExpires) {
            throw new Error("OTP expired. Please request a new OTP.");
        }

        // So sánh OTP
        if (user.otp !== otp.trim()) {
            throw new Error("Invalid OTP");
        }

        // Cập nhật user: verify email và xóa OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Tạo JWT token
        const token = generateTokenFromUser(user);

        return {
            message: "Email verified successfully",
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isVerified: user.isVerified
            }
        };
    }

    /**
     * Gửi lại OTP
     * @param {string} email - Email của user
     * @returns {Promise<Object>} Thông báo thành công
     * @throws {Error} Nếu user không tồn tại hoặc đã verify
     */
    static async resendOTP(email) {
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error("User not found");
        }

        // Kiểm tra user đã verify chưa
        if (user.isVerified) {
            throw new Error("Email already verified");
        }

        // Tạo OTP mới
        const otp = generateOTP();
        const otpExpires = generateOTPExpiry();

        // Cập nhật OTP mới
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Gửi OTP qua email
        try {
            await sendOTPEmail(email, otp, user.name);
        } catch (error) {
            console.error("Failed to send OTP email:", error);
            throw new Error("Failed to send OTP email");
        }

        return {
            message: "OTP sent successfully. Please check your email."
        };
    }

    /**
     * Lấy thông tin người dùng hiện tại
     * @param {string} userId - ID của user
     * @returns {Promise<Object>} User object (không có password)
     * @throws {Error} Nếu user không tồn tại
     */
    static async getCurrentUser(userId) {
        const user = await UserModel.findById(userId).select("-password");
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
}

