import jwt from "jsonwebtoken";

const getJWTSecret = () => {
    return process.env.JWT_SECRET || "dev_secret";
};

const getJWTExpiresIn = () => {
    return process.env.JWT_EXPIRES_IN || "7d";
};

export const generateToken = (payload) => {
    const JWT_SECRET = getJWTSecret();
    const JWT_EXPIRES_IN = getJWTExpiresIn();

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateTokenFromUser = (user) => {
    return generateToken({
        userId: user._id,
        email: user.email,
        role: user.role || 'EMPLOYEE'
    });
};

export const verifyToken = (token) => {
    const JWT_SECRET = getJWTSecret();
    return jwt.verify(token, JWT_SECRET);
};

export const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.split(" ")[1];
};
