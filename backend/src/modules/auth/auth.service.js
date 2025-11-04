import { UserModel } from "./user.model.js";
import jwt from "jsonwebtoken";

/**
 * Service xử lý logic nghiệp vụ cho Authentication
 */
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

        // Tạo user mới (password sẽ tự động hash trong pre-save hook)
        const user = await UserModel.create({ email, password, name });

        // Tạo JWT token
        const token = this.generateToken(user);

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
     * Đăng nhập người dùng
     * @param {Object} credentials - Thông tin đăng nhập {email, password}
     * @returns {Promise<Object>} User object và JWT token
     * @throws {Error} Nếu thông tin đăng nhập không hợp lệ
     */
    static async login(credentials) {
        const { email, password } = credentials;

        // Tìm user theo email
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error("Invalid credentials");
        }

        // Xác thực password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error("Invalid credentials");
        }

        // Tạo JWT token
        const token = this.generateToken(user);

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

    /**
     * Tạo JWT token
     * @param {Object} user - User object
     * @returns {string} JWT token
     */
    static generateToken(user) {
        const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

        return jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }
}

