import jwt from "jsonwebtoken";

/**
 * Middleware xác thực JWT token
 * Thêm thông tin user vào req.user nếu token hợp lệ
 */
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Không có token xác thực" });
        }

        const token = authHeader.split(" ")[1];
        const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token đã hết hạn" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Token không hợp lệ" });
        }
        return res.status(401).json({ message: "Xác thực thất bại" });
    }
};