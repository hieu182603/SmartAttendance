import { extractTokenFromHeader, verifyToken } from "../utils/jwt.util.js";
import { UserModel } from "../modules/users/user.model.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            return res.status(401).json({ message: "No authentication token" });
        }

        const decoded = verifyToken(token);

        // Kiểm tra xem user có còn active không
        if (decoded.userId) {
            const user = await UserModel.findById(decoded.userId)
                .select("isActive isTrial trialExpiresAt role department branch")
                .populate('department', '_id')
                .populate('branch', '_id')
                .lean();
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }
            if (user.isActive === false) {
                return res.status(403).json({
                    message: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên."
                });
            }

            // Kiểm tra trial expiration cho trial users
            if (user.isTrial && user.trialExpiresAt) {
                const now = new Date();
                if (now > user.trialExpiresAt) {
                    return res.status(403).json({
                        message: "Giai đoạn dùng thử 7 ngày đã kết thúc. Vui lòng nâng cấp tài khoản để tiếp tục sử dụng.",
                        trialExpired: true,
                        upgradeRequired: true
                    });
                }
            }

            // Attach full user context to avoid additional queries in chatbot
            decoded.userContext = {
                role: user.role,
                department: user.department?._id,
                branch: user.branch?._id,
                userId: user._id
            };
        }

        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }
        return res.status(401).json({ message: "Authentication failed" });
    }
};