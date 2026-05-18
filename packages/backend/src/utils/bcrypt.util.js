import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 10;

/**
 * Generate salt for bcrypt
 * @param {number} rounds - Salt rounds (default 10)
 * @returns {Promise<string>} Salt string
 */
export const generateSalt = async (rounds = DEFAULT_SALT_ROUNDS) => {
    return bcrypt.genSalt(rounds);
};

/**
 * Hash password
 * @param {string} password - Plain password
 * @param {string|number} salt - Salt or rounds
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password, salt = DEFAULT_SALT_ROUNDS) => {
    if (typeof salt === "number") {
        const generatedSalt = await generateSalt(salt);
        return bcrypt.hash(password, generatedSalt);
    }

    return bcrypt.hash(password, salt);
};

/**
 * Compare plain password with hashed password
 * @param {string} candidatePassword - Plain password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if match
 */
export const comparePassword = async (candidatePassword, hashedPassword) => {
    return bcrypt.compare(candidatePassword, hashedPassword);
};
