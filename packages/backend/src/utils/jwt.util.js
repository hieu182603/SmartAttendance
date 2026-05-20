import jwt from "jsonwebtoken";

const getJWTSecret = () => {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    return process.env.JWT_SECRET;
};
const getRefreshSecret = () => {
    if (!process.env.REFRESH_TOKEN_SECRET) throw new Error("REFRESH_TOKEN_SECRET is not configured");
    return process.env.REFRESH_TOKEN_SECRET;
};

export const generateAccessToken = (payload) => {
    return jwt.sign(payload, getJWTSecret(), { expiresIn: "15m" });
};

export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, getRefreshSecret(), { expiresIn: "7d" });
};

// Kept for backward-compat with existing callers (OTP flow, etc.)
export const generateToken = (payload) => {
    return jwt.sign(payload, getJWTSecret(), {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    });
};

export const generateTokenFromUser = (user) => {
    const payload = {
        userId: user._id,
        email: user.email,
        role: user.role || "EMPLOYEE",
        department_id: user.department,
        companyId: user.companyId ?? null,
    };
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken({ userId: user._id }),
    };
};

export const verifyToken = (token) => {
    return jwt.verify(token, getJWTSecret());
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, getRefreshSecret());
};

export const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.split(" ")[1];
};
