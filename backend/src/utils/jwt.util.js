import jwt from "jsonwebtoken";

const getJWTSecret = () => {
    return process.env.JWT_SECRET || "dev_secret";
};

const getJWTExpiresIn = () => {
    return process.env.JWT_EXPIRES_IN || "7d";
};

/**
 * Generate JWT token
 * @param {Object} payload - Payload object {userId, email}
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
    const JWT_SECRET = getJWTSecret();
    const JWT_EXPIRES_IN = getJWTExpiresIn();

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate JWT token from user object
 * @param {Object} user - User object with _id and email
 * @returns {string} JWT token
 */
export const generateTokenFromUser = (user) => {
    return generateToken({
        userId: user._id,
        email: user.email
    });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token invalid or expired
 */
export const verifyToken = (token) => {
    const JWT_SECRET = getJWTSecret();
    return jwt.verify(token, JWT_SECRET);
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header (format: "Bearer {token}")
 * @returns {string|null} Token string or null if invalid
 */
export const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.split(" ")[1];
};
